from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# 1. Summary Models
class SummaryRequest(BaseModel):
    summary_type: str = Field(default="comprehensive", description="executive, comprehensive, or tldr")

class SummaryResponse(BaseModel):
    document_id: str
    summary_type: str
    title: str
    executive_summary: str
    key_points: List[str]
    tldr: str

# 2. Flashcard Models
class Flashcard(BaseModel):
    question: str
    answer: str
    hint: Optional[str] = None
    difficulty: str = Field(default="medium", description="easy, medium, hard")

class FlashcardsResponse(BaseModel):
    document_id: str
    cards: List[Flashcard]

# 3. Quiz Models
class QuizOption(BaseModel):
    option_id: str
    text: str

class QuizQuestion(BaseModel):
    id: str
    question: str
    type: str = Field(default="multiple_choice", description="multiple_choice, true_false, short_answer")
    options: Optional[List[QuizOption]] = None
    correct_answer: str
    explanation: str

class QuizResponse(BaseModel):
    document_id: str
    title: str
    questions: List[QuizQuestion]

# 4. Key Takeaways Models
class TakeawayItem(BaseModel):
    category: str = Field(default="insight", description="insight, action_item, decision, metric")
    title: str
    description: str
    importance: str = Field(default="high", description="high, medium, low")

class TakeawaysResponse(BaseModel):
    document_id: str
    takeaways: List[TakeawayItem]

# 5. Timeline Models
class TimelineEvent(BaseModel):
    date_or_period: str
    title: str
    description: str
    significance: str = Field(default="medium", description="high, medium, low")

class TimelineResponse(BaseModel):
    document_id: str
    timeline: List[TimelineEvent]

# 6. Table Models
class ExtractedTable(BaseModel):
    table_id: str
    title: Optional[str] = "Extracted Table"
    headers: List[str]
    rows: List[List[str]]
    summary: Optional[str] = None

class TableExtractionResponse(BaseModel):
    document_id: str
    tables: List[ExtractedTable]

# 7. Entity Extraction Models
class EntityItem(BaseModel):
    name: str
    category: str = Field(description="PERSON, ORGANIZATION, LOCATION, DATE, MONEY, METRIC, CONCEPT")
    context_snippet: Optional[str] = None

class EntityExtractionResponse(BaseModel):
    document_id: str
    entities: List[EntityItem]

# 8. Keyword Extraction Models
class KeywordItem(BaseModel):
    keyword: str
    relevance_score: float = Field(ge=0.0, le=1.0)
    category: Optional[str] = "topic"

class KeywordExtractionResponse(BaseModel):
    document_id: str
    keywords: List[KeywordItem]

# 9. Document Comparison Models
class ComparisonRequest(BaseModel):
    document_id_a: str
    document_id_b: str

class DocumentComparisonResponse(BaseModel):
    doc_a_title: str
    doc_b_title: str
    executive_comparison: str
    common_themes: List[str]
    unique_to_doc_a: List[str]
    unique_to_doc_b: List[str]
    key_differences: List[Dict[str, str]]
