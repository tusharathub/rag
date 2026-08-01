from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DocumentDomain(BaseModel):
    id: UUID
    name: str
    storage_path: str
    file_type: str
    file_size: int
    status: DocumentStatus
    organization_id: UUID
    file_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentChunkDomain(BaseModel):
    id: UUID
    document_id: UUID
    collection_id: Optional[UUID] = None
    content: str
    chunk_index: int
    page_number: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None


