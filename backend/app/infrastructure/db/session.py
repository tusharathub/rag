from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

# Create async engine supporting pgvector and standard postgres operations
engine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    pool_pre_ping=True,  # Automatically tests connections before using them
    echo=False,          # Set to True for debug logging of SQL queries
)

# Async session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency generator that provides a database session for request lifecycles."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
