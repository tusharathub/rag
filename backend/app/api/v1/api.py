from fastapi import APIRouter
from app.api.v1.endpoints.document import router as document_router
from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.intelligence import router as intelligence_router
from app.api.v1.endpoints.health import router as health_router

from app.api.v1.endpoints.webhooks import router as webhooks_router

api_router = APIRouter()

# Include document service endpoints
api_router.include_router(document_router, prefix="/documents", tags=["documents"])
# Include chat service endpoints
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
# Include intelligence endpoints
api_router.include_router(intelligence_router, prefix="/intelligence", tags=["intelligence"])
# Include health endpoints
api_router.include_router(health_router, prefix="/health", tags=["health"])
# Include Clerk webhooks endpoints
api_router.include_router(webhooks_router, tags=["webhooks"])


