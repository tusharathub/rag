from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.infrastructure.db.models import User, Document
from app.infrastructure.db.repositories import DocumentRepository
from app.schemas.intelligence import (
    SummaryRequest, SummaryResponse,
    FlashcardsResponse, QuizResponse,
    TakeawaysResponse, TimelineResponse,
    TableExtractionResponse, EntityExtractionResponse,
    KeywordExtractionResponse, ComparisonRequest, DocumentComparisonResponse
)
from app.services.intelligence import DocumentIntelligenceService

router = APIRouter()
intel_service = DocumentIntelligenceService()

async def _get_doc_text(db: AsyncSession, doc_id: UUID, current_user: User) -> tuple[Document, str]:
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    chunks = await repo.get_document_chunks(doc_id)
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no processed content.")
    
    full_text = "\n\n".join([c.content for c in chunks])
    return doc, full_text

# 1. Summary
@router.post("/summary/{document_id}", response_model=SummaryResponse)
async def get_document_summary(
    document_id: UUID,
    payload: SummaryRequest = SummaryRequest(),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    result = await intel_service.generate_summary(doc.filename, text, payload.summary_type)
    return SummaryResponse(document_id=str(document_id), **result)

# 2. Flashcards
@router.post("/flashcards/{document_id}", response_model=FlashcardsResponse)
async def get_document_flashcards(
    document_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    cards = await intel_service.generate_flashcards(text)
    return FlashcardsResponse(document_id=str(document_id), cards=cards)

# 3. Quiz
@router.post("/quiz/{document_id}", response_model=QuizResponse)
async def get_document_quiz(
    document_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    result = await intel_service.generate_quiz(doc.filename, text)
    return QuizResponse(document_id=str(document_id), **result)

# 4. Takeaways
@router.post("/takeaways/{document_id}", response_model=TakeawaysResponse)
async def get_document_takeaways(
    document_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    items = await intel_service.extract_takeaways(text)
    return TakeawaysResponse(document_id=str(document_id), takeaways=items)

# 5. Timeline
@router.post("/timeline/{document_id}", response_model=TimelineResponse)
async def get_document_timeline(
    document_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    timeline = await intel_service.extract_timeline(text)
    return TimelineResponse(document_id=str(document_id), timeline=timeline)

# 6. Tables
@router.post("/tables/{document_id}", response_model=TableExtractionResponse)
async def get_document_tables(
    document_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    tables = await intel_service.extract_tables(text)
    return TableExtractionResponse(document_id=str(document_id), tables=tables)

# 7. Entities
@router.post("/entities/{document_id}", response_model=EntityExtractionResponse)
async def get_document_entities(
    document_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    entities = await intel_service.extract_entities(text)
    return EntityExtractionResponse(document_id=str(document_id), entities=entities)

# 8. Keywords
@router.post("/keywords/{document_id}", response_model=KeywordExtractionResponse)
async def get_document_keywords(
    document_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    doc, text = await _get_doc_text(db, document_id, current_user)
    keywords = await intel_service.extract_keywords(text)
    return KeywordExtractionResponse(document_id=str(document_id), keywords=keywords)

# 9. Comparison
@router.post("/compare", response_model=DocumentComparisonResponse)
async def compare_documents(
    payload: ComparisonRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    try:
        doc_a_id = UUID(payload.document_id_a)
        doc_b_id = UUID(payload.document_id_b)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Document UUID format.")

    doc_a, text_a = await _get_doc_text(db, doc_a_id, current_user)
    doc_b, text_b = await _get_doc_text(db, doc_b_id, current_user)

    result = await intel_service.compare_documents(
        doc_a.filename, text_a, doc_b.filename, text_b
    )
    return DocumentComparisonResponse(**result)
