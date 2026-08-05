import json
import logging
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

class DocumentIntelligenceService:
    def __init__(self):
        api_key = settings.OPENAI_API_KEY or "sk-dummy-key-for-testing"
        base_url = settings.OPENROUTER_BASE_URL if api_key.startswith("sk-or-") else None
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = settings.LLM_MODEL


    async def _call_llm_json(self, prompt: str, system_message: str) -> Dict[str, Any]:
        """Helper to invoke OpenAI with structured JSON response formatting."""
        response = await self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        content = response.choices[0].message.content or "{}"
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse LLM JSON response: {content}")
            return {}

    # 1. Automatic Summaries
    async def generate_summary(self, doc_title: str, text_content: str, summary_type: str = "comprehensive") -> Dict[str, Any]:
        system_msg = (
            "You are an expert document intelligence assistant. Extract document summary into JSON matching key fields: "
            "'title', 'executive_summary', 'key_points' (array of strings), 'tldr'."
        )
        prompt = f"Document Title: {doc_title}\nSummary Type: {summary_type}\n\nDocument Text:\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return {
            "summary_type": summary_type,
            "title": data.get("title", doc_title),
            "executive_summary": data.get("executive_summary", "Summary not available."),
            "key_points": data.get("key_points", []),
            "tldr": data.get("tldr", "")
        }

    # 2. Flashcards
    async def generate_flashcards(self, text_content: str, card_count: int = 8) -> List[Dict[str, Any]]:
        system_msg = (
            "You are an educational AI. Extract key concept flashcards from text into JSON under key 'cards' (array of objects). "
            "Each object must have 'question', 'answer', 'hint', 'difficulty' ('easy'|'medium'|'hard')."
        )
        prompt = f"Generate {card_count} flashcards for key concepts in this text:\n\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return data.get("cards", [])

    # 3. Quiz Generation
    async def generate_quiz(self, doc_title: str, text_content: str, question_count: int = 5) -> Dict[str, Any]:
        system_msg = (
            "You are a quiz authoring AI. Extract a quiz into JSON object with key 'questions' (array). "
            "Each question object has 'id', 'question', 'type' ('multiple_choice'|'true_false'), "
            "'options' (array of {option_id, text}), 'correct_answer', 'explanation'."
        )
        prompt = f"Title: {doc_title}\nCreate a {question_count}-question test for this text:\n\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return {
            "title": f"Quiz: {doc_title}",
            "questions": data.get("questions", [])
        }

    # 4. Key Takeaways
    async def extract_takeaways(self, text_content: str) -> List[Dict[str, Any]]:
        system_msg = (
            "Extract top key takeaways into JSON under key 'takeaways' (array of objects). "
            "Each object has 'category' ('insight'|'action_item'|'decision'|'metric'), 'title', 'description', 'importance' ('high'|'medium'|'low')."
        )
        prompt = f"Extract core takeaways from text:\n\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return data.get("takeaways", [])

    # 5. Timeline Extraction
    async def extract_timeline(self, text_content: str) -> List[Dict[str, Any]]:
        system_msg = (
            "Extract chronological events into JSON under key 'timeline' (array of objects). "
            "Each object has 'date_or_period', 'title', 'description', 'significance' ('high'|'medium'|'low')."
        )
        prompt = f"Extract chronological dates & events from text:\n\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return data.get("timeline", [])

    # 6. Table Extraction
    async def extract_tables(self, text_content: str) -> List[Dict[str, Any]]:
        system_msg = (
            "Identify structured or semi-structured data tables from text into JSON under key 'tables' (array of objects). "
            "Each object has 'table_id', 'title', 'headers' (array of strings), 'rows' (array of string arrays), 'summary'."
        )
        prompt = f"Extract all tables from text:\n\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return data.get("tables", [])

    # 7. Entity Extraction
    async def extract_entities(self, text_content: str) -> List[Dict[str, Any]]:
        system_msg = (
            "Perform Named Entity Recognition into JSON under key 'entities' (array of objects). "
            "Each object has 'name', 'category' ('PERSON'|'ORGANIZATION'|'LOCATION'|'DATE'|'MONEY'|'METRIC'|'CONCEPT'), 'context_snippet'."
        )
        prompt = f"Extract named entities from text:\n\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return data.get("entities", [])

    # 8. Keyword Extraction
    async def extract_keywords(self, text_content: str) -> List[Dict[str, Any]]:
        system_msg = (
            "Extract top relevant keywords/topics into JSON under key 'keywords' (array of objects). "
            "Each object has 'keyword', 'relevance_score' (float 0.0-1.0), 'category'."
        )
        prompt = f"Extract top key concepts and terms from text:\n\n{text_content[:15000]}"
        data = await self._call_llm_json(prompt, system_msg)
        return data.get("keywords", [])

    # 9. Document Comparison
    async def compare_documents(self, doc_a_title: str, text_a: str, doc_b_title: str, text_b: str) -> Dict[str, Any]:
        system_msg = (
            "Compare two documents into JSON with fields: 'doc_a_title', 'doc_b_title', 'executive_comparison', "
            "'common_themes' (array), 'unique_to_doc_a' (array), 'unique_to_doc_b' (array), "
            "'key_differences' (array of objects with 'topic', 'doc_a_view', 'doc_b_view')."
        )
        prompt = (
            f"Document A: {doc_a_title}\nText A:\n{text_a[:10000]}\n\n"
            f"Document B: {doc_b_title}\nText B:\n{text_b[:10000]}"
        )
        data = await self._call_llm_json(prompt, system_msg)
        return {
            "doc_a_title": doc_a_title,
            "doc_b_title": doc_b_title,
            "executive_comparison": data.get("executive_comparison", "Comparison completed."),
            "common_themes": data.get("common_themes", []),
            "unique_to_doc_a": data.get("unique_to_doc_a", []),
            "unique_to_doc_b": data.get("unique_to_doc_b", []),
            "key_differences": data.get("key_differences", [])
        }
