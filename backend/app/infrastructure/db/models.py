import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import Column, ForeignKey, Integer, String, Text, Float, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.core.config import settings
from app.infrastructure.db.base import Base, TimeStampedModel, SoftDeleteMixin


class User(Base, TimeStampedModel, SoftDeleteMixin):
    """User entity. Clerk is the primary authentication provider.
    
    A user has many Collections, Chats, and ChatSessions.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    collections: Mapped[List["Collection"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chats: Mapped[List["Chat"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chat_sessions: Mapped[List["ChatSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Collection(Base, TimeStampedModel, SoftDeleteMixin):
    """Collection entity. Groups multiple documents together.
    
    A collection belongs to a User.
    """
    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="collections")
    documents: Mapped[List["Document"]] = relationship(back_populates="collection", cascade="all, delete-orphan")
    chats: Mapped[List["Chat"]] = relationship(back_populates="collection")


class Document(Base, TimeStampedModel, SoftDeleteMixin):
    """Document entity. Holds references to file paths and indexing states.
    
    A document belongs to a Collection.
    """
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    collection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("collections.id", ondelete="CASCADE"), index=True, nullable=False)

    # Relationships
    collection: Mapped["Collection"] = relationship(back_populates="documents")
    chunks: Mapped[List["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")
    metadata_items: Mapped[List["DocumentMetadata"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentMetadata(Base, TimeStampedModel):
    """DocumentMetadata entity. Key-value fields describing a document.
    
    Allows structured filtering of document chunks during retrieval.
    """
    __tablename__ = "document_metadata"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="metadata_items")

    # Add constraints
    __table_args__ = (
        UniqueConstraint("document_id", "key", name="uq_document_id_key"),
        Index("idx_metadata_key_value", "key", "value"),
    )


class DocumentChunk(Base, TimeStampedModel):
    """DocumentChunk entity. Represents parsed text passages and embeddings.
    
    Holds vector representation for similarity search.
    """
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)

    collection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=Tru)), ForeignKey("collections.id", ondelete="CASCADE"), index=True, nullable=False)
    
    # Vector embedding
    embedding = mapped_column(Vector(settings.EMBEDDING_DIMENSION), nullable=False)

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="chunks")


class Chat(Base, TimeStampedModel, SoftDeleteMixin):
    """Chat entity (Bot / Agent instance). 
    
    Holds custom instructions (system prompt) and links to a specific Collection.
    """
    __tablename__ = "chats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    collection_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("collections.id", ondelete="SET NULL"), index=True, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="chats")
    collection: Mapped[Optional["Collection"]] = relationship(back_populates="chats")
    chat_sessions: Mapped[List["ChatSession"]] = relationship(back_populates="chat", cascade="all, delete-orphan")


class ChatSession(Base, TimeStampedModel, SoftDeleteMixin):
    """ChatSession entity. Tracks individual conversation logs.
    
    Linked to a specific Chat bot setup.
    """
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation")

    # Relationships
    chat: Mapped["Chat"] = relationship(back_populates="chat_sessions")
    user: Mapped["User"] = relationship(back_populates="chat_sessions")
    messages: Mapped[List["Message"]] = relationship(back_populates="chat_session", cascade="all, delete-orphan")


class Message(Base, TimeStampedModel):
    """Message entity. An individual question/answer entry in a chat session.
    
    Contains the citation sources metadata in JSONB format.
    """
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    # Relationships
    chat_session: Mapped["ChatSession"] = relationship(back_populates="messages")
