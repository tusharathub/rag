import asyncio
import hashlib
import json
import logging
from typing import List, Optional
import redis.asyncio as aioredis
from openai import AsyncOpenAI, RateLimitError, APIConnectionError, APIStatusError

from app.core.config import settings
from app.interfaces.ai.services import IEmbeddingService

logger = logging.getLogger(__name__)


class OpenAIEmbeddingService(IEmbeddingService):
    """Production-grade embedding service using OpenAI API with batching, retries, rate limiting, and Redis caching."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        redis_url: Optional[str] = None,
        max_concurrent_requests: int = 5,
        cache_ttl_seconds: int = 86400 * 7,  # Default 7 days
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        
        # Concurrency/Rate Limiting
        self.semaphore = asyncio.Semaphore(max_concurrent_requests)
        
        # Redis Caching
        self.redis_url = redis_url or f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0"
        self.redis_client: Optional[aioredis.Redis] = None
        self.cache_ttl = cache_ttl_seconds
        self._redis_initialized = False

    async def _init_redis(self):
        """Lazy-initialize Redis connection to avoid blocking constructor."""
        if self._redis_initialized:
            return
        try:
            self.redis_client = aioredis.from_url(self.redis_url, decode_responses=True)
            # Test connection
            await self.redis_client.ping()
            self._redis_initialized = True
            logger.info("Successfully connected to Redis cache for embeddings.")
        except Exception as e:
            logger.warning(f"Redis cache initialization failed, running without Redis caching: {e}")
            self.redis_client = None
            self._redis_initialized = True

    def _get_cache_key(self, text: str) -> str:
        """Generate a unique cache key based on model and text content."""
        text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
        return f"embed:{self.model_name}:{text_hash}"

    async def _get_cached_embeddings(self, texts: List[str]) -> tuple[List[Optional[List[float]]], List[int]]:
        """Checks Redis for cached embeddings. Returns list of cached embeddings and indices of missing ones."""
        await self._init_redis()
        cached_results: List[Optional[List[float]]] = [None] * len(texts)
        missing_indices: List[int] = []

        if not self.redis_client:
            return cached_results, list(range(len(texts)))

        try:
            keys = [self._get_cache_key(text) for text in texts]
            # Bulk get from Redis
            cached_vals = await self.redis_client.mget(keys)
            for idx, val in enumerate(cached_vals):
                if val:
                    cached_results[idx] = json.loads(val)
                else:
                    missing_indices.append(idx)
        except Exception as e:
            logger.warning(f"Error reading from Redis cache: {e}")
            missing_indices = list(range(len(texts)))

        return cached_results, missing_indices

    async def _write_to_cache(self, texts: List[str], embeddings: List[List[float]]):
        """Write newly computed embeddings to Redis cache in bulk."""
        await self._init_redis()
        if not self.redis_client or not texts or not embeddings:
            return

        try:
            pipe = self.redis_client.pipeline()
            for text, emb in zip(texts, embeddings):
                key = self._get_cache_key(text)
                pipe.setex(key, self.cache_ttl, json.dumps(emb))
            await pipe.execute()
        except Exception as e:
            logger.warning(f"Error writing to Redis cache: {e}")

    async def _generate_embeddings_with_retry(self, texts: List[str]) -> List[List[float]]:
        """Calls OpenAI embedding endpoint with retries and concurrency limits."""
        if not self.client:
            raise ValueError("OpenAI API key not configured.")

        # Cap batch sizes to prevent payload size errors
        max_batch_size = 2048
        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), max_batch_size):
            batch = texts[i : i + max_batch_size]
            
            async with self.semaphore:
                retries = 5
                backoff = 1.0
                
                for attempt in range(retries):
                    try:
                        response = await self.client.embeddings.create(
                            input=batch,
                            model=self.model_name
                        )
                        # Sort by index to maintain ordering guarantees
                        sorted_data = sorted(response.data, key=lambda x: x.index)
                        all_embeddings.extend([item.embedding for item in sorted_data])
                        break
                    except (RateLimitError, APIConnectionError, APIStatusError) as e:
                        if attempt == retries - 1:
                            logger.error(f"Failed to generate embeddings after {retries} attempts due to: {e}")
                            raise e
                        
                        logger.warning(f"OpenAI API call encountered {e.__class__.__name__}, retrying in {backoff:.1f}s...")
                        await asyncio.sleep(backoff)
                        backoff *= 2.0  # Exponential backoff
                    except Exception as e:
                        logger.error(f"Unexpected error calling OpenAI embeddings API: {e}")
                        raise e

        return all_embeddings

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for a single text chunk with caching."""
        results = await self.generate_embeddings_batch([text])
        return results[0]

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings in bulk with Redis caching, retries, and rate limiting."""
        if not texts:
            return []

        # 1. Check Redis Cache
        cached_results, missing_indices = await self._get_cached_embeddings(texts)
        
        if not missing_indices:
            # All embeddings cached!
            return cached_results  # type: ignore

        # 2. Extract texts that need embeddings
        missing_texts = [texts[idx] for idx in missing_indices]
        
        # 3. Call API with Rate Limiting & Retry Protection
        new_embeddings = await self._generate_embeddings_with_retry(missing_texts)
        
        # 4. Save newly generated embeddings to Redis cache
        await self._write_to_cache(missing_texts, new_embeddings)
        
        # 5. Merge cached and newly retrieved embeddings
        final_embeddings: List[List[float]] = list(cached_results)  # type: ignore
        for missing_idx, emb in zip(missing_indices, new_embeddings):
            final_embeddings[missing_idx] = emb
            
        return final_embeddings
