import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from app.domain.models.document import DocumentChunkDomain
from app.services.retrieval import RetrievalService, cosine_similarity
from app.infrastructure.db.models import Collection


def test_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    # Same vector -> similarity is 1.0
    assert abs(cosine_similarity(v1, v2) - 1.0) < 1e-6

    v3 = [0.0, 1.0, 0.0]
    # Orthogonal vectors -> similarity is 0.0
    assert abs(cosine_similarity(v1, v3) - 0.0) < 1e-6


@pytest.mark.asyncio
async def test_retrieval_security_permission_error():
    # Setup mocks
    db_mock = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalars.return_value.first.return_value = None
    db_mock.execute.return_value = result_mock
    
    repo_mock = MagicMock()
    emb_mock = AsyncMock()
    rerank_mock = AsyncMock()

    service = RetrievalService(db_mock, repo_mock, emb_mock, rerank_mock)

    with pytest.raises(PermissionError):
        await service.retrieve_context(
            query="test question",
            collection_id=uuid.uuid4(),
            user_id=uuid.uuid4()
        )


@pytest.mark.asyncio
async def test_retrieval_success_with_deduplication():
    # Setup mocks
    db_mock = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalars.return_value.first.return_value = Collection(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        name="Test collection"
    )
    db_mock.execute.return_value = result_mock

    repo_mock = AsyncMock()
    emb_mock = AsyncMock()
    rerank_mock = AsyncMock()

    # Stub embedding generation
    emb_mock.generate_embedding.return_value = [0.1, 0.2]


    # Stub candidate generation with duplicate content
    col_id = uuid.uuid4()
    doc_id = uuid.uuid4()
    
    chunk_1 = DocumentChunkDomain(
        id=uuid.uuid4(),
        document_id=doc_id,
        collection_id=col_id,
        content="This is unique text.",
        chunk_index=0,
        embedding=[0.1, 0.2]
    )
    chunk_2 = DocumentChunkDomain(
        id=uuid.uuid4(),
        document_id=doc_id,
        collection_id=col_id,
        content="This is unique text.", # duplicate content
        chunk_index=1,
        embedding=[0.1, 0.2]
    )
    chunk_3 = DocumentChunkDomain(
        id=uuid.uuid4(),
        document_id=doc_id,
        collection_id=col_id,
        content="This is another text.",
        chunk_index=2,
        embedding=[0.3, 0.4]
    )

    repo_mock.hybrid_search.return_value = [
        (chunk_1, 0.9),
        (chunk_2, 0.8),
        (chunk_3, 0.7)
    ]

    # Stub reranking return structure (simply maps 1-to-1)
    rerank_mock.rerank.return_value = [
        {"index": 0, "text": "This is unique text.", "relevance_score": 0.9},
        {"index": 1, "text": "This is another text.", "relevance_score": 0.7}
    ]

    service = RetrievalService(db_mock, repo_mock, emb_mock, rerank_mock)

    results = await service.retrieve_context(
        query="test query",
        collection_id=col_id,
        user_id=uuid.uuid4(),
        limit=2,
        use_mmr=False
    )

    # Verify duplicates were removed (only 2 candidates passed to reranking)
    assert len(results) == 2
    # Ensure chunk_2 (duplicate text) was skipped
    assert results[0][0].id == chunk_1.id
    assert results[1][0].id == chunk_3.id
