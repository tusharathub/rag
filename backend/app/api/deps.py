import uuid
import logging
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.security import verify_clerk_token, TokenVerificationError
from app.infrastructure.db.session import get_db
from app.infrastructure.db.models import User
from app.infrastructure.db.repositories import DocumentRepository
from app.infrastructure.storage.local import LocalFileStorageService
from app.infrastructure.storage.s3 import S3FileStorageService
from app.services.document import DocumentUploadService, DocumentProcessingService
from app.services.preprocessing.pipeline import TextPreprocessingPipeline
from app.interfaces.ai.services import IEmbeddingService
from app.infrastructure.ai.embeddings import OpenAIEmbeddingService
from app.services.chat import ChatService
from app.infrastructure.db.repositories import ChatRepository
from app.services.retrieval import RetrievalService
from app.infrastructure.ai.chat_completion import OpenAIChatCompletionService
from app.infrastructure.ai.reranking import RerankingService

reusable_oauth2 = HTTPBearer(scheme_name="ClerkToken", auto_error=True)


async def get_embedding_service() -> IEmbeddingService:
    """FastAPI dependency that constructs and returns the concrete IEmbeddingService."""
    return OpenAIEmbeddingService()


async def get_document_service(db: AsyncSession = Depends(get_db)) -> DocumentUploadService:
    """FastAPI dependency that constructs and returns the DocumentUploadService."""
    repository = DocumentRepository(db)
    storage_service = S3FileStorageService() if settings.STORAGE_TYPE == "s3" else LocalFileStorageService()
    return DocumentUploadService(repository, storage_service)


async def get_document_processing_service(db: AsyncSession = Depends(get_db)) -> DocumentProcessingService:
    """FastAPI dependency that constructs and returns the DocumentProcessingService."""
    repository = DocumentRepository(db)
    storage_service = S3FileStorageService() if settings.STORAGE_TYPE == "s3" else LocalFileStorageService()
    embedding_service = await get_embedding_service()
    preprocessor = TextPreprocessingPipeline(embedding_service=embedding_service)
    return DocumentProcessingService(
        repository=repository,
        storage_service=storage_service,
        embedding_service=embedding_service,
        preprocessor=preprocessor
    )



async def get_current_user(
    token: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency to extract and verify Clerk JWT. Auto-provisions verified users in Postgres if missing."""
    clerk_user_id = None
    email = "developer@example.com"
    first_name = "Dev"
    last_name = "User"

    if token:
        try:
            payload = verify_clerk_token(token.credentials)
            clerk_user_id = payload.get("sub")
            email = payload.get("email") or payload.get("primary_email") or f"{clerk_user_id}@clerk.user"
        except TokenVerificationError as e:
            logger.warning(f"Clerk token verification failed: {e}")
            if settings.ENVIRONMENT != "development":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=str(e),
                    headers={"WWW-Authenticate": "Bearer"},
                )

    if not clerk_user_id:
        if settings.ENVIRONMENT == "development":
            clerk_user_id = "user_dev"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please sign in.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Query the user in Postgres
    query = select(User).where(User.clerk_user_id == clerk_user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        # Auto-provision user record in Postgres upon first verified request
        user_id = uuid.UUID("00000000-0000-0000-0000-000000000000") if clerk_user_id == "user_dev" else uuid.uuid4()
        user = User(
            id=user_id,
            clerk_user_id=clerk_user_id,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        try:
            db.add(user)
            await db.commit()
            await db.refresh(user)
        except Exception as e:
            await db.rollback()
            result = await db.execute(query)
            user = result.scalars().first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Could not provision user record: {str(e)}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    return user



from app.infrastructure.ai.chat_completion import LLMProviderFactory

async def get_chat_service(db: AsyncSession = Depends(get_db)) -> ChatService:
    """FastAPI dependency that constructs and returns the ChatService."""
    chat_repository = ChatRepository(db)
    document_repository = DocumentRepository(db)
    embedding_service = await get_embedding_service()
    reranking_service = RerankingService()
    retrieval_service = RetrievalService(
        db, document_repository, embedding_service, reranking_service
    )
    llm_service = LLMProviderFactory.create_provider()
    return ChatService(
        chat_repository=chat_repository,
        retrieval_service=retrieval_service,
        llm_service=llm_service,
        model_name=settings.LLM_MODEL or "gpt-4o-mini"
    )

