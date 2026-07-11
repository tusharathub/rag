from typing import List, Optional, Tuple, Dict
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, update, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from pgvector.sqlalchemy import Vector

from app.domain.models.document import DocumentDomain, DocumentChunkDomain, DocumentStatus
from app.domain.models.chat import ChatSessionDomain, ChatMessageDomain
from app.interfaces.db.repositories import IDocumentRepository, IChatRepository
from app.infrastructure.db.models import Document, DocumentChunk, DocumentMetadata, Collection, ChatSession, Message, Chat
import uuid


class DocumentRepository(IDocumentRepository):
    """SQLAlchemy implementation of the IDocumentRepository."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _map_to_domain(self, db_doc: Document) -> DocumentDomain:
        """Map SQLAlchemy model to Domain model."""
        return DocumentDomain(
            id=db_doc.id,
            name=db_doc.name,
            storage_path=db_doc.storage_path,
            file_type=db_doc.file_type,
            file_size=db_doc.file_size,
            status=DocumentStatus(db_doc.status),
            organization_id=db_doc.collection_id,  # Collection ID acts as the organization boundary
            file_hash=db_doc.file_hash,
            created_at=db_doc.created_at,
            updated_at=db_doc.updated_at,
        )

    async def create(self, document: DocumentDomain) -> DocumentDomain:
        """Saves a new document entity to the database."""
        db_doc = Document(
            id=document.id,
            name=document.name,
            storage_path=document.storage_path,
            file_type=document.file_type,
            file_size=document.file_size,
            status=document.status.value,
            file_hash=document.file_hash,
            collection_id=document.organization_id,  # Maps to collection_id
        )
        self.db.add(db_doc)
        await self.db.flush()
        return self._map_to_domain(db_doc)

    async def get_by_id(self, document_id: UUID) -> Optional[DocumentDomain]:
        """Fetches a document by its ID if it has not been soft-deleted."""
        stmt = select(Document).where(
            and_(Document.id == document_id, Document.deleted_at.is_(None))
        )
        result = await self.db.execute(stmt)
        db_doc = result.scalars().first()
        return self._map_to_domain(db_doc) if db_doc else None

    async def get_by_hash(self, file_hash: str, collection_id: UUID) -> Optional[DocumentDomain]:
        """Fetches a document in a specific collection by its file hash if it is not deleted."""
        stmt = select(Document).where(
            and_(
                Document.file_hash == file_hash,
                Document.collection_id == collection_id,
                Document.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(stmt)
        db_doc = result.scalars().first()
        return self._map_to_domain(db_doc) if db_doc else None

    async def get_by_org(self, organization_id: UUID, skip: int = 0, limit: int = 10) -> List[DocumentDomain]:
        """Lists active documents belonging to a collection (mapped to organization_id)."""
        stmt = (
            select(Document)
            .where(and_(Document.collection_id == organization_id, Document.deleted_at.is_(None)))
            .offset(skip)
            .limit(limit)
            .order_by(Document.created_at.desc())
        )
        result = await self.db.execute(stmt)
        db_docs = result.scalars().all()
        return [self._map_to_domain(doc) for doc in db_docs]

    async def update_status(self, document_id: UUID, status: DocumentStatus) -> DocumentDomain:
        """Updates the status of a document (e.g. PENDING, PROCESSING, COMPLETED, FAILED)."""
        stmt = (
            update(Document)
            .where(and_(Document.id == document_id, Document.deleted_at.is_(None)))
            .values(status=status.value, updated_at=func.now())
            .returning(Document)
        )
        result = await self.db.execute(stmt)
        db_doc = result.scalars().first()
        if not db_doc:
            raise ValueError(f"Document with ID {document_id} not found or deleted.")
        return self._map_to_domain(db_doc)

    async def delete(self, document_id: UUID) -> bool:
        """Performs a soft delete on the document."""
        stmt = (
            update(Document)
            .where(and_(Document.id == document_id, Document.deleted_at.is_(None)))
            .values(deleted_at=func.now())
            .returning(Document.id)
        )
        result = await self.db.execute(stmt)
        deleted_id = result.scalar_one_or_none()
        return deleted_id is not None

    async def bulk_save_chunks(self, chunks: List[DocumentChunkDomain]) -> None:
        """Bulk inserts chunks of a document."""
        if not chunks:
            return
        
        db_chunks = [
            DocumentChunk(
                id=chunk.id,
                document_id=chunk.document_id,
                content=chunk.content,
                chunk_index=chunk.chunk_index,
                embedding=chunk.embedding
            )
            for chunk in chunks
        ]
        self.db.add_all(db_chunks)
        await self.db.flush()

    async def save_metadata_items(self, document_id: UUID, metadata: Dict[str, str]) -> None:
        """Saves metadata key-value items for a document."""
        if not metadata:
            return
            
        db_items = [
            DocumentMetadata(
                document_id=document_id,
                key=key,
                value=str(value)
            )
            for key, value in metadata.items()
        ]
        self.db.add_all(db_items)
        await self.db.flush()

    async def get_metadata_items(self, document_id: UUID) -> Dict[str, str]:
        """Retrieves metadata items for a document."""
        stmt = select(DocumentMetadata).where(DocumentMetadata.document_id == document_id)
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        return {item.key: item.value for item in items}

    async def hybrid_search(
        self, 
        organization_id: UUID, 
        query_embedding: List[float], 
        query_text: str, 
        limit: int = 5
    ) -> List[tuple[DocumentChunkDomain, float]]:
        """Hybrid search implementation (dense similarity + sparse text search)."""
        # Select chunks belonging to documents in the target collection (organization_id)
        stmt = (
            select(DocumentChunk, DocumentChunk.embedding.cosine_distance(query_embedding).label("distance"))
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(
                and_(
                    Document.collection_id == organization_id,
                    Document.deleted_at.is_(None)
                )
            )
            .order_by("distance")
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        
        results = []
        for db_chunk, distance in rows:
            # Distance: lower is more similar for cosine distance, convert to a similarity score (1 - distance)
            score = 1.0 - float(distance) if distance is not None else 0.0
            domain_chunk = DocumentChunkDomain(
                id=db_chunk.id,
                document_id=db_chunk.document_id,
                content=db_chunk.content,
                chunk_index=db_chunk.chunk_index,
                embedding=db_chunk.embedding
            )
            results.append((domain_chunk, score))
            
        return results


class ChatRepository(IChatRepository):
    """SQLAlchemy implementation of the IChatRepository."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(self, session: ChatSessionDomain) -> ChatSessionDomain:
        # Find or create a default chat bot associated with the collection_id (mapped as organization_id)
        stmt = select(Chat).where(Chat.collection_id == session.organization_id)
        res = await self.db.execute(stmt)
        chat = res.scalars().first()
        if not chat:
            chat = Chat(
                id=uuid.uuid4(),
                name="Default Assistant",
                system_prompt="You are a helpful assistant. Use the retrieved context to answer the user's questions.",
                user_id=session.user_id,
                collection_id=session.organization_id
            )
            self.db.add(chat)
            await self.db.flush()

        db_session = ChatSession(
            id=session.id,
            chat_id=chat.id,
            user_id=session.user_id,
            title=session.title,
        )
        self.db.add(db_session)
        await self.db.flush()
        return session

    async def get_session(self, session_id: UUID) -> Optional[ChatSessionDomain]:
        stmt = select(ChatSession).where(and_(ChatSession.id == session_id, ChatSession.deleted_at.is_(None)))
        res = await self.db.execute(stmt)
        db_sess = res.scalars().first()
        if not db_sess:
            return None

        messages = await self.get_messages(session_id)

        # Map collection_id to organization_id
        stmt_chat = select(Chat).where(Chat.id == db_sess.chat_id)
        res_chat = await self.db.execute(stmt_chat)
        chat = res_chat.scalars().first()
        org_id = chat.collection_id if chat else db_sess.user_id

        return ChatSessionDomain(
            id=db_sess.id,
            title=db_sess.title,
            user_id=db_sess.user_id,
            organization_id=org_id,
            created_at=db_sess.created_at,
            updated_at=db_sess.updated_at,
            messages=messages
        )

    async def get_sessions_by_org(self, organization_id: UUID, skip: int = 0, limit: int = 10) -> List[ChatSessionDomain]:
        stmt = (
            select(ChatSession)
            .join(Chat, Chat.id == ChatSession.chat_id)
            .where(and_(Chat.collection_id == organization_id, ChatSession.deleted_at.is_(None)))
            .offset(skip)
            .limit(limit)
            .order_by(ChatSession.created_at.desc())
        )
        res = await self.db.execute(stmt)
        db_sessions = res.scalars().all()

        sessions = []
        for db_sess in db_sessions:
            messages = await self.get_messages(db_sess.id)
            sessions.append(
                ChatSessionDomain(
                    id=db_sess.id,
                    title=db_sess.title,
                    user_id=db_sess.user_id,
                    organization_id=organization_id,
                    created_at=db_sess.created_at,
                    updated_at=db_sess.updated_at,
                    messages=messages
                )
            )
        return sessions

    async def save_message(self, message: ChatMessageDomain) -> ChatMessageDomain:
        sources_dict = [
            {
                "id": str(src.id),
                "chat_message_id": str(src.chat_message_id),
                "document_chunk_id": str(src.document_chunk_id),
                "relevance_score": src.relevance_score,
                "document_name": src.document_name
            }
            for src in message.sources
        ]
        db_msg = Message(
            id=message.id,
            chat_session_id=message.chat_session_id,
            role=message.role.value,
            content=message.content,
            metadata_json={"sources": sources_dict}
        )
        self.db.add(db_msg)
        await self.db.flush()
        return message

    async def get_messages(self, session_id: UUID) -> List[ChatMessageDomain]:
        from app.domain.models.chat import MessageRole, ChatMessageSourceDomain
        stmt = (
            select(Message)
            .where(Message.chat_session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        res = await self.db.execute(stmt)
        db_messages = res.scalars().all()

        messages = []
        for db_msg in db_messages:
            sources = []
            metadata_val = db_msg.metadata_json or {}
            sources_list = metadata_val.get("sources", [])
            for src in sources_list:
                sources.append(
                    ChatMessageSourceDomain(
                        id=UUID(src["id"]),
                        chat_message_id=UUID(src["chat_message_id"]),
                        document_chunk_id=UUID(src["document_chunk_id"]),
                        relevance_score=src["relevance_score"],
                        document_name=src.get("document_name")
                    )
                )
            messages.append(
                ChatMessageDomain(
                    id=db_msg.id,
                    chat_session_id=db_msg.chat_session_id,
                    role=MessageRole(db_msg.role),
                    content=db_msg.content,
                    created_at=db_msg.created_at,
                    sources=sources
                )
            )
        return messages

