import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

logger = logging.getLogger(__name__)

def create_limiter() -> Limiter:
    redis_uri = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/1"
    try:
        import redis
        r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
        r.ping()
        r.close()
        logger.info("Connected to Redis for rate limiting.")
        return Limiter(
            key_func=get_remote_address,
            default_limits=["100/minute"],
            storage_uri=redis_uri,
            strategy="moving-window"
        )
    except Exception as e:
        logger.info(f"Redis unavailable for rate limiting ({e}). Using fast in-memory rate limiter.")
        return Limiter(
            key_func=get_remote_address,
            default_limits=["100/minute"],
            storage_uri="memory://",
            strategy="moving-window"
        )

limiter = create_limiter()
