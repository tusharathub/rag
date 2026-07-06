from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from app.domain.models.document import DocumentDomain, DocumentChunkDomain, DocumentStatus
from app.domain.models.chat import ChatSessionDomain, ChatMessageDomain


class IDocumentRepository(ABC):
    @abstractmethod
    async def create(self, document: DocumentDomain) -> DocumentDomain:
        pass

    @abstractmethod
    async def get_by_id(self, document_id: UUID) -> Optional[DocumentDomain]:
        pass

    @abstractmethod
    async def get_by_org(self, organization_id: UUID, skip: int = 0, limit: int = 10) -> List[DocumentDomain]:
        pass

    @abstractmethod
    async def update_status(self, document_id: UUID, status: DocumentStatus) -> DocumentDomain:
        pass

    @abstractmethod
    async def delete(self, document_id: UUID) -> bool:
        pass

    @abstractmethod
    async def bulk_save_chunks(self, chunks: List[DocumentChunkDomain]) -> None:
        pass

    @abstractmethod
    async def hybrid_search(
        self, 
        organization_id: UUID, 
        query_embedding: List[float], 
        query_text: str, 
        limit: int = 5
    ) -> List[tuple[DocumentChunkDomain, float]]:
        """Performs dense similarity + sparse full-text search and returns sorted chunks with scores."""
        pass


class IChatRepository(ABC):
    @abstractmethod
    async def create_session(self, session: ChatSessionDomain) -> ChatSessionDomain:
        pass

    @abstractmethod
    async def get_session(self, session_id: UUID) -> Optional[ChatSessionDomain]:
        pass

    @abstractmethod
    async def get_sessions_by_org(self, organization_id: UUID, skip: int = 0, limit: int = 10) -> List[ChatSessionDomain]:
        pass

    @abstractmethod
    async def save_message(self, message: ChatMessageDomain) -> ChatMessageDomain:
        pass

    @abstractmethod
    async def get_messages(self, session_id: UUID) -> List[ChatMessageDomain]:
        pass
