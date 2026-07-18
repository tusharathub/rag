import logging
import math
from typing import List, Tuple
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.document import DocumentChunkDomain
from app.infrastructure.db.models import Collection
from app.interfaces.ai.services import IEmbeddingService, IRerankingService, IRetrievalService
from app.interfaces.db.repositories import IDocumentRepository

logger = logging.getLogger(__name__)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Computes cosine similarity between two vector lists."""
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = math.sqrt(sum(x * x for x in v1))
    norm_v2 = math.sqrt(sum(x * x for x in v2))
    if not norm_v1 or not norm_v2:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)


class RetrievalService(IRetrievalService):
    """Production retrieval pipeline orchestrating security, search, deduplication, and ranking."""

    def __init__(
        self,
        db: AsyncSession,
        document_repository: IDocumentRepository,
        embedding_service: IEmbeddingService,
        reranking_service: IRerankingService
    ):
        self.db = db
        self.repository = document_repository
        self.embedding_service = embedding_service
        self.reranking_service = reranking_service

    async def retrieve_context(
        self, 
        query: str, 
        collection_id: UUID, 
        user_id: UUID, 
        limit: int = 5,
        use_mmr: bool = False,
        lambda_val: float = 0.5
    ) -> List[Tuple[DocumentChunkDomain, float]]:
        """Retrieves and ranks relevant chunks after validating collection access."""
        # 1. Authorize collection access (tenant isolation)
        stmt = select(Collection).where(
            and_(
                Collection.id == collection_id,
                Collection.user_id == user_id
            )
        )
        res = await self.db.execute(stmt)
        collection = res.scalars().first()
        if not collection:
            logger.warning(f"Unauthorized collection access attempt. User {user_id}, Collection {collection_id}")
            raise PermissionError("Access denied: Collection does not exist or does not belong to the user.")

        # 2. Generate search query embedding
        query_embedding = await self.embedding_service.generate_embedding(query)

        # 3. Retrieve initial candidates (retrieve limit * 3 to allow deduplication/reranking)
        retrieval_limit = limit * 3
        candidates = await self.repository.hybrid_search(
            organization_id=collection_id,
            query_embedding=query_embedding,
            query_text=query,
            limit=retrieval_limit
        )

        if not candidates:
            return []

        # 4. Remove duplicate chunks based on textual content
        seen_texts = set()
        unique_candidates: List[Tuple[DocumentChunkDomain, float]] = []
        for chunk, score in candidates:
            normalized_content = chunk.content.strip().lower()
            if normalized_content not in seen_texts:
                seen_texts.add(normalized_content)
                unique_candidates.append((chunk, score))

        # 5. Diversify or rank results
        if use_mmr:
            # Maximal Marginal Relevance (MMR)
            logger.info("Ranking using Maximal Marginal Relevance (MMR)")
            chunk_embeddings = [c[0].embedding for c in unique_candidates if c[0].embedding is not None]
            
            # Fallback if embeddings are missing
            if len(chunk_embeddings) != len(unique_candidates):
                # If embeddings are missing from domain objects, regenerate or fallback
                # For safety, let's regenerate embeddings or use fallback
                # In typical production paths, embedding is retrieved from database.
                # If database returns them, we use MMR, otherwise fallback to standard ranking
                logger.warning("Embeddings missing from retrieved chunks. Falling back to standard ranking.")
                return unique_candidates[:limit]
            
            selected_indices = self._mmr_diversified_indices(
                query_embedding=query_embedding,
                chunk_embeddings=chunk_embeddings,
                lambda_val=lambda_val,
                top_k=limit
            )
            
            final_results = [unique_candidates[idx] for idx in selected_indices]
        else:
            # Cross-Encoder Reranking
            logger.info("Ranking using Reranking Service")
            texts = [c[0].content for c in unique_candidates]
            
            reranked_items = await self.reranking_service.rerank(
                query=query,
                documents=texts,
                top_k=limit
            )
            
            # Map reranked indices back to chunk objects
            final_results = []
            for item in reranked_items:
                idx = item["index"]
                score = item["relevance_score"]
                if idx < len(unique_candidates):
                    final_results.append((unique_candidates[idx][0], score))

        return final_results

    def _mmr_diversified_indices(
        self,
        query_embedding: List[float],
        chunk_embeddings: List[List[float]],
        lambda_val: float,
        top_k: int
    ) -> List[int]:
        """Runs the MMR algorithm to diversify context candidates."""
        if not chunk_embeddings:
            return []

        selected_indices = []
        candidate_indices = list(range(len(chunk_embeddings)))
        
        # Sim to query
        query_sims = [cosine_similarity(emb, query_embedding) for emb in chunk_embeddings]
        
        # Pick the most similar element first
        first_selected = max(candidate_indices, key=lambda idx: query_sims[idx])
        selected_indices.append(first_selected)
        candidate_indices.remove(first_selected)
        
        while len(selected_indices) < top_k and candidate_indices:
            best_score = -float('inf')
            best_idx = -1
            
            for cand_idx in candidate_indices:
                sim_q = query_sims[cand_idx]
                max_sim_selected = max(
                    cosine_similarity(chunk_embeddings[cand_idx], chunk_embeddings[sel_idx])
                    for sel_idx in selected_indices
                )
                
                # MMR formula
                score = lambda_val * sim_q - (1.0 - lambda_val) * max_sim_selected
                
                if score > best_score:
                    best_score = score
                    best_idx = cand_idx
            
            if best_idx == -1:
                break
                
            selected_indices.append(best_idx)
            candidate_indices.remove(best_idx)
            
        return selected_indices
