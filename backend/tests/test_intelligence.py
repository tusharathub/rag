from unittest.mock import AsyncMock
import pytest
from app.services.intelligence import DocumentIntelligenceService

@pytest.mark.asyncio
async def test_intelligence_service_summaries(monkeypatch):
    service = DocumentIntelligenceService()
    mock_llm = AsyncMock(return_value={
        "title": "Test Title",
        "executive_summary": "Executive summary text.",
        "key_points": ["Point 1", "Point 2"],
        "tldr": "TLDR text"
    })
    monkeypatch.setattr(service, '_call_llm_json', mock_llm)

    res = await service.generate_summary("Test Title", "Sample text content")
    assert res["title"] == "Test Title"
    assert len(res["key_points"]) == 2
    assert res["tldr"] == "TLDR text"

@pytest.mark.asyncio
async def test_intelligence_service_flashcards(monkeypatch):
    service = DocumentIntelligenceService()
    mock_llm = AsyncMock(return_value={
        "cards": [
            {"question": "What is X?", "answer": "X is Y", "hint": "Think Y", "difficulty": "easy"}
        ]
    })
    monkeypatch.setattr(service, '_call_llm_json', mock_llm)

    cards = await service.generate_flashcards("Sample text content")
    assert len(cards) == 1
    assert cards[0]["question"] == "What is X?"

