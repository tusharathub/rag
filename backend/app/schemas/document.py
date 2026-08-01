from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Dict, List, Optional
from app.domain.models.document import DocumentStatus


class DocumentResponse(BaseModel):
    id: UUID
    name: str
    storage_path: str
    file_type: str
    file_size: int
    status: DocumentStatus
    collection_id: UUID = Field(..., serialization_alias="collection_id", validation_alias="organization_id")
    file_hash: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "from_attributes": True
    }


class DocumentDetailResponse(DocumentResponse):
    metadata: Dict[str, str] = Field(default_factory=dict)


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    count: int
