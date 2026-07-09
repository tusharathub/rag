from fastapi import APIRouter
from app.api.v1.endpoints.document import router as document_router

api_router = APIRouter()

# Include document service endpoints
api_router.include_router(document_router, prefix="/documents", tags=["documents"])
