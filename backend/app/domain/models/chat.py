from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessageSourceDomain(BaseModel):
    id: UUID
    chat_message_id: UUID
    document_chunk_id: UUID
    relevance_score: float
    document_name: Optional[str] = None  # Helper for context visualization


class ChatMessageDomain(BaseModel):
    id: UUID
    chat_session_id: UUID
    role: MessageRole
    content: str
    created_at: datetime
    sources: List[ChatMessageSourceDomain] = Field(default_factory=list)


class ChatSessionDomain(BaseModel):
    id: UUID
    title: str
    user_id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageDomain] = Field(default_factory=list)
