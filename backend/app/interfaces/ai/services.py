from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Optional
from app.domain.models.chat import MessageRole


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
