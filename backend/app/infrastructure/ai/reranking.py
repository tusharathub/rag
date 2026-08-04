import asyncio
import logging
from typing import List, Dict
import cohere
from app.core.config import settings
from app.interfaces.ai.services import IRerankingService

logger = logging.getLogger(__name__)

class RerankingService(IRerankingService):
    """Production-grade reranking service supporting Cohere and safe fallbacks."""

    def __init__(self):
        self.api_key = getattr(settings, "COHERE_API_KEY", None)
        self.client = None
        if self.api_key and not self.api_key.startswith("your-") and "..." not in self.api_key:
            try:
                self.client = cohere.Client(api_key=self.api_key)
                logger.info("Cohere reranking client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Cohere client: {e}")

    async def rerank(
        self, 
        query: str, 
        documents: List[str], 
        top_k: int = 5
    ) -> List[Dict]:
        """Reranks the documents relative to the search query."""
        if not documents:
            return []

        # If Cohere client is active, use it for cross-encoder reranking
        if self.client:
            try:
                # Offload synchronous Cohere client.rerank call to threadpool to prevent blocking async event loop
                response = await asyncio.to_thread(
                    self.client.rerank,
                    model="rerank-english-v3.0",
                    query=query,
                    documents=documents,
                    top_n=top_k
                )
                
                results = []
                for result in response.results:
                    results.append({
                        "index": result.index,
                        "text": documents[result.index],
                        "relevance_score": float(result.relevance_score)
                    })
                return results
            except Exception as e:
                logger.warning(f"Cohere reranking failed: {e}. Falling back to default order.")

        # Fallback ranking (preserves original order, assigns pseudo-scores)
        logger.info("Using pass-through fallback ranking.")
        results = []
        for idx, doc in enumerate(documents[:top_k]):
            # Assign artificial decaying scores based on initial retrieval order
            score = 1.0 - (idx * 0.05)
            results.append({
                "index": idx,
                "text": doc,
                "relevance_score": max(0.0, score)
            })
        return results
