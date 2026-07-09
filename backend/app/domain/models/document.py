from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, UUID4


class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DocumentDomain(BaseModel):
    id: UUID4
    name: str
    storage_path: str
    file_type: str
    file_size: int
    status: DocumentStatus
    organization_id: UUID4
    file_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentChunkDomain(BaseModel):
    id: UUID4
    document_id: UUID4
    content: str
    chunk_index: int
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None
