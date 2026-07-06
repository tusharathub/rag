from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, UUID4


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessageSourceDomain(BaseModel):
    id: UUID4
    chat_message_id: UUID4
    document_chunk_id: UUID4
    relevance_score: float
    document_name: Optional[str] = None  # Helper for context visualization


class ChatMessageDomain(BaseModel):
    id: UUID4
    chat_session_id: UUID4
    role: MessageRole
    content: str
    created_at: datetime
    sources: List[ChatMessageSourceDomain] = Field(default_factory=list)


class ChatSessionDomain(BaseModel):
    id: UUID4
    title: str
    user_id: UUID4
    organization_id: UUID4
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageDomain] = Field(default_factory=list)
