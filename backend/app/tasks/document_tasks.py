import asyncio
from uuid import UUID
from app.core.celery_app import celery_app
from app.core.logging import logger

@celery_app.task(name="app.tasks.document_tasks.process_document_async", bind=True, max_retries=3)
def process_document_async(self, document_id_str: str):
    """Async background worker task to parse, chunk, embed, and index uploaded documents."""
    logger.info("Starting background document processing task", document_id=document_id_str)
    try:
        # Import internally to avoid circular dependencies
        from app.infrastructure.db.session import AsyncSessionLocal
        from app.services.document import DocumentProcessingService

        async def _run():
            async with AsyncSessionLocal() as db:
                service = DocumentProcessingService(db)
                doc_id = UUID(document_id_str)
                await service.process_document(doc_id)

        asyncio.run(_run())
        logger.info("Successfully completed background document processing", document_id=document_id_str)
    except Exception as exc:
        logger.error("Background document processing failed", document_id=document_id_str, error=str(exc))
        raise self.retry(exc=exc, countdown=10)
