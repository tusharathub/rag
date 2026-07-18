from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Optional
from uuid import UUID
from app.domain.models.chat import MessageRole
from app.domain.models.document import DocumentChunkDomain



class IEmbeddingService(ABC):
    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for a single text chunk."""
        pass

    @abstractmethod
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings in bulk for efficiency."""
        pass


class IChatCompletionService(ABC):
    @abstractmethod
    async def generate_response(
        self, 
        system_prompt: str, 
        history: List[dict], 
        user_message: str
    ) -> str:
        """Non-streaming generation."""
        pass

    @abstractmethod
    async def stream_response(
        self, 
        system_prompt: str, 
        history: List[dict], 
        user_message: str
    ) -> AsyncGenerator[str, None]:
        """Streams response tokens as they become available."""
        pass


class IRerankingService(ABC):
    @abstractmethod
    async def rerank(
        self, 
        query: str, 
        documents: List[str], 
        top_k: int = 5
    ) -> List[dict]:
        """Reranks retrieved documents matching semantic score to query."""
        pass


class IRetrievalService(ABC):
    @abstractmethod
    async def retrieve_context(
        self, 
        query: str, 
        collection_id: UUID, 
        user_id: UUID, 
        limit: int = 5,
        use_mmr: bool = False,
        lambda_val: float = 0.5
    ) -> List[tuple[DocumentChunkDomain, float]]:
        """Retrieves verified, deduplicated, and ranked context chunks for RAG."""
        pass

