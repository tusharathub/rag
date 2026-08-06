from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging
import uuid
import hmac
import hashlib

from app.infrastructure.db.session import get_db
from app.infrastructure.db.models import User
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/webhooks/clerk")
async def clerk_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook handler for Clerk user synchronization events (user.created, user.updated, user.deleted)."""
    payload = await request.json()
    event_type = payload.get("type")
    data = payload.get("data", {})

    clerk_user_id = data.get("id")
    if not clerk_user_id:
        return {"status": "ignored", "reason": "no user id in payload"}

    email_addresses = data.get("email_addresses", [])
    primary_email = ""
    if email_addresses:
        primary_email = email_addresses[0].get("email_address", "")

    first_name = data.get("first_name", "") or ""
    last_name = data.get("last_name", "") or ""

    if event_type in ("user.created", "user.updated"):
        query = select(User).where(User.clerk_user_id == clerk_user_id)
        result = await db.execute(query)
        user = result.scalars().first()

        if user:
            user.email = primary_email or user.email
            user.first_name = first_name
            user.last_name = last_name
            logger.info(f"Updated user from Clerk webhook: {clerk_user_id}")
        else:
            user = User(
                id=uuid.uuid4(),
                clerk_user_id=clerk_user_id,
                email=primary_email or f"{clerk_user_id}@clerk.user",
                first_name=first_name,
                last_name=last_name
            )
            db.add(user)
            logger.info(f"Created new user from Clerk webhook: {clerk_user_id}")

        await db.commit()
        return {"status": "success", "event": event_type, "user_id": clerk_user_id}

    elif event_type == "user.deleted":
        query = select(User).where(User.clerk_user_id == clerk_user_id)
        result = await db.execute(query)
        user = result.scalars().first()
        if user:
            from datetime import datetime
            user.deleted_at = datetime.utcnow()
            await db.commit()
            logger.info(f"Soft-deleted user from Clerk webhook: {clerk_user_id}")
        return {"status": "success", "event": event_type, "user_id": clerk_user_id}

    return {"status": "ignored", "event": event_type}
