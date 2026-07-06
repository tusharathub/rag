from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import verify_clerk_token, TokenVerificationError
from app.infrastructure.db.session import get_db
from app.infrastructure.db.models import User

reusable_oauth2 = HTTPBearer(scheme_name="ClerkToken", auto_error=True)


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(reusable_oauth2),
    db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency to extract and verify the Clerk JWT, and fetch the corresponding User."""
    try:
        payload = verify_clerk_token(token.credentials)
    except TokenVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
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
        # User exists in Clerk but hasn't synced to our DB yet
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User record is not synchronized or is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
