import uuid
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import verify_clerk_token, TokenVerificationError
from app.infrastructure.db.session import get_db
from app.infrastructure.db.models import User
from app.infrastructure.db.repositories import DocumentRepository
from app.infrastructure.storage.local import LocalFileStorageService
from app.infrastructure.storage.s3 import S3FileStorageService
from app.services.document import DocumentUploadService
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


async def get_current_user(
    token: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency to extract and verify Clerk JWT. In development, defaults to a mock user."""
    clerk_user_id = None
    email = "developer@example.com"
    first_name = "Dev"
    last_name = "User"

    if token:
        try:
            payload = verify_clerk_token(token.credentials)
            clerk_user_id = payload.get("sub")
            email = payload.get("email", email)
        except TokenVerificationError as e:
            if settings.ENVIRONMENT != "development":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=str(e),
                    headers={"WWW-Authenticate": "Bearer"},
                )
            logger.warning(f"Clerk verification failed in development: {e}. Falling back to dev user.")

    if not clerk_user_id:
        if settings.ENVIRONMENT == "development":
            clerk_user_id = "user_dev"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing identity field (sub)",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Query the user in Postgres
    query = select(User).where(User.clerk_user_id == clerk_user_id, User.deleted_at.is_(None))
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        if settings.ENVIRONMENT == "development":
            # Auto-create mock dev user in development
            user = User(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                clerk_user_id=clerk_user_id,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User record is not synchronized or is deactivated",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return user


async def get_chat_service(db: AsyncSession = Depends(get_db)) -> ChatService:
    """FastAPI dependency that constructs and returns the ChatService."""
    chat_repository = ChatRepository(db)
    document_repository = DocumentRepository(db)
    embedding_service = await get_embedding_service()
    reranking_service = RerankingService()
    retrieval_service = RetrievalService(
        db, document_repository, embedding_service, reranking_service
    )
    llm_service = OpenAIChatCompletionService()
    return ChatService(
        chat_repository=chat_repository,
        retrieval_service=retrieval_service,
        llm_service=llm_service,
        model_name=settings.LLM_MODEL or "gpt-4o-mini"
    )

