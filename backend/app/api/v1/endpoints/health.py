from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from redis.asyncio import Redis

from app.api import deps
from app.core.config import settings

router = APIRouter()

@router.get("/healthz", tags=["health"])
async def readiness_probe(db: AsyncSession = Depends(deps.get_db)):
    """Readiness probe checking database and redis connection pools."""
    db_status = "healthy"
    redis_status = "healthy"

    # 1. Check PostgreSQL DB
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # 2. Check Redis Cache (optional performance layer)
    try:
        r = Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
        await r.ping()
        await r.aclose()
    except Exception as e:
        redis_status = "disabled (in-memory mode)"

    if db_status != "healthy":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "unhealthy", "database": db_status, "redis": redis_status}
        )

    return {"status": "healthy", "database": db_status, "redis": redis_status}

@router.get("/livez", tags=["health"])
async def liveness_probe():
    """Liveness probe verifying HTTP application process status."""
    return {"status": "alive"}
