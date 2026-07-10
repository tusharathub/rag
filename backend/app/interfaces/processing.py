from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import uuid
from pydantic import BaseModel, Field
from app.domain.models.document import DocumentChunkDomain
from app.interfaces.parsers import ParsedDocumentResult


class PreprocessingConfig(BaseModel):
    """Configuration options for the text preprocessing and chunking pipeline."""
    
    # Text cleaning options
    remove_headers_footers: bool = Field(
        default=True, 
        description="Detect and remove repeating headers/footers across pages."
    )
    normalize_whitespace: bool = Field(
        default=True, 
        description="Clean up excessive spaces, tabs, and duplicate newlines."
    )
    
    # Chunking strategy: 'token' or 'semantic'
    strategy: str = Field(
        default="token", 
        description="The chunking strategy to use: 'token' for fixed size or 'semantic' for similarity-based."
    )
    
    # Token-aware chunking options
    max_chunk_size: int = Field(
        default=500, 
        description="Maximum number of tokens per chunk."
    )
    chunk_overlap: int = Field(
        default=50, 
        description="Overlapping tokens between consecutive chunks."
    )
    
    # Semantic chunking options
    semantic_threshold_percentile: float = Field(
        default=95.0, 
        description="The percentile of embedding distances between sentences above which a split is triggered."
    )
    
    # Tokenizer model name (e.g. 'cl100k_base' for OpenAI tiktoken)
    tokenizer_name: str = Field(
        default="cl100k_base", 
        description="The tiktoken encoding model to count tokens."
    )


class ITextPreprocessor(ABC):
    """Abstract interface defining the text preprocessing and chunking contract."""

    @abstractmethod
    def preprocess(
        self, 
        parsed_doc: ParsedDocumentResult, 
        document_id: uuid.UUID,
        config: Optional[PreprocessingConfig] = None
    ) -> List[DocumentChunkDomain]:
        """Preprocesses a parsed document (cleans, segments, chunks) and returns domain chunk items.

        Args:
            parsed_doc: The unified parsing result containing page texts, tables, headings.
            document_id: The UUID of the source Document in database.
            config: Optional configuration override. Uses default config if not supplied.

        Returns:
            A list of DocumentChunkDomain objects ready for embedding and vector store saving.
        """
        pass
