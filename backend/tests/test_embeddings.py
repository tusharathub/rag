import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from openai import RateLimitError

from app.infrastructure.ai.embeddings import OpenAIEmbeddingService


@pytest.fixture
def mock_openai_client():
    mock_client = MagicMock()
    mock_client.embeddings = MagicMock()
    mock_client.embeddings.create = AsyncMock()
    return mock_client


@pytest.fixture
def mock_redis_client():
    client = MagicMock()
    client.ping = AsyncMock()
    client.mget = AsyncMock(return_value=[None, None])
    client.pipeline = MagicMock()
    
    pipe = MagicMock()
    pipe.setex = MagicMock()
    pipe.execute = AsyncMock()
    client.pipeline.return_value = pipe
    
    return client


@pytest.mark.asyncio
async def test_generate_embedding_single(mock_openai_client):
    # Mock return value
    mock_emb = MagicMock()
    mock_emb.index = 0
    mock_emb.embedding = [0.1] * 1536
    
    mock_response = MagicMock()
    mock_response.data = [mock_emb]
    mock_openai_client.embeddings.create.return_value = mock_response

    service = OpenAIEmbeddingService(api_key="test-key")
    service.client = mock_openai_client

    # Disable Redis to simplify
    service._redis_initialized = True
    service.redis_client = None

    emb = await service.generate_embedding("Hello world")
    
    assert emb == [0.1] * 1536
    mock_openai_client.embeddings.create.assert_called_once_with(
        input=["Hello world"],
        model="text-embedding-3-small"
    )


@pytest.mark.asyncio
async def test_generate_embeddings_batch_with_caching(mock_openai_client, mock_redis_client):
    service = OpenAIEmbeddingService(api_key="test-key")
    service.client = mock_openai_client
    service._redis_initialized = True
    service.redis_client = mock_redis_client

    # First text is cached in Redis, second is not
    mock_redis_client.mget.return_value = [
        "[0.9, 0.9, 0.9]",  # cached embedding
        None                # missing
    ]

    # Mock OpenAI API return for the missing one
    mock_emb = MagicMock()
    mock_emb.index = 0
    mock_emb.embedding = [0.5, 0.5, 0.5]
    
    mock_response = MagicMock()
    mock_response.data = [mock_emb]
    mock_openai_client.embeddings.create.return_value = mock_response

    results = await service.generate_embeddings_batch(["text1", "text2"])

    assert len(results) == 2
    assert results[0] == [0.9, 0.9, 0.9]
    assert results[1] == [0.5, 0.5, 0.5]
    
    # Verify OpenAI was only called with "text2"
    mock_openai_client.embeddings.create.assert_called_once_with(
        input=["text2"],
        model="text-embedding-3-small"
    )
    # Verify new embedding was cached
    mock_redis_client.pipeline().setex.assert_called_once()


@pytest.mark.asyncio
async def test_generate_embeddings_retry_on_rate_limit(mock_openai_client):
    service = OpenAIEmbeddingService(api_key="test-key")
    service.client = mock_openai_client
    service._redis_initialized = True
    service.redis_client = None

    # Simulate 1 rate limit error, then success
    mock_response = MagicMock()
    mock_emb = MagicMock()
    mock_emb.index = 0
    mock_emb.embedding = [0.2] * 1536
    mock_response.data = [mock_emb]

    # Create dummy RateLimitError
    dummy_response = MagicMock()
    dummy_response.status_code = 429
    dummy_error = RateLimitError(message="Rate limit exceeded", response=dummy_response, body=None)

    mock_openai_client.embeddings.create.side_effect = [
        dummy_error,
        mock_response
    ]

    # Patch sleep to not block testing
    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        results = await service.generate_embeddings_batch(["rate limited text"])
        assert results[0] == [0.2] * 1536
        assert mock_openai_client.embeddings.create.call_count == 2
        mock_sleep.assert_called_once_with(1.0)
