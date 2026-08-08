import sys
from pathlib import Path

# Ensure the backend root directory is on sys.path for absolute imports on deployment platforms
backend_root = str(Path(__file__).resolve().parent.parent)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks: Initialize DB pool, warm embedding client, verify S3 connection
    yield
    # Shutdown tasks: Clean up connections and workers


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "database": "untested",  # Expanded check in repository layer
        "version": "0.1.0"
    }


# Include API V1 Router
from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)
