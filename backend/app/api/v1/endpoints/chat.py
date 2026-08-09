import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_chat_service
from app.infrastructure.db.models import User
from app.services.chat import ChatService
from app.api.v1.endpoints.document import verify_collection_ownership

logger = logging.getLogger(__name__)
router = APIRouter()


from typing import Optional, Union

class ChatRequest(BaseModel):
    session_id: Union[UUID, str]
    collection_id: UUID
    document_id: Optional[UUID] = None
    message: str
    limit: Optional[int] = 5
    use_mmr: Optional[bool] = False
    lambda_val: Optional[float] = 0.5



@router.post(
    "/stream",
    summary="Stream chat generation",
    description="Streams RAG-augmented generation answer tokens for a given prompt in real-time."
)
async def stream_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service)
):
    # Verify collection accessibility (returns user's authorized collection)
    collection = await verify_collection_ownership(request.collection_id, current_user.id, db)

    # Convert session_id to UUID if provided as string
    session_id = request.session_id
    if isinstance(session_id, str):
        try:
            session_id = UUID(session_id)
        except ValueError:
            session_id = UUID("00000000-0000-0000-0000-000000000001")

    async def event_generator():
        try:
            stream = chat_service.stream_chat(
                session_id=session_id,
                user_id=current_user.id,
                organization_id=collection.id,
                message_content=request.message,
                document_id=request.document_id,
                limit=request.limit,
                use_mmr=request.use_mmr,
                lambda_val=request.lambda_val
            )
            async for token in stream:
                yield token
        except Exception as e:
            logger.error(f"Error streaming chat response: {e}", exc_info=True)
            yield f"\n[Stream Error: {str(e)}]"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

