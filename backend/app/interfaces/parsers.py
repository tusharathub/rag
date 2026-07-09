from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class DocumentParsingError(Exception):
    """Custom exception raised when a document cannot be parsed (e.g. corruption, password protection)."""
    pass


class UnsupportedFormatError(Exception):
    """Custom exception raised when no parser is registered for a file extension."""
    pass


class TableData(BaseModel):
    """Structured representation of a parsed table block."""
    headers: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)
    caption: Optional[str] = None


class HeadingData(BaseModel):
    """Structured representation of a parsed section heading."""
    text: str
    level: int  # e.g. 1 for h1, 2 for h2, 3 for h3


class ImageData(BaseModel):
    """Representation of an extracted image within a page."""
    name: str
    content: bytes
    content_type: str
    page_number: Optional[int] = None


class ParsedPage(BaseModel):
    """Represents a single logical page (or worksheet/slide) inside a document."""
    page_number: int
    text: str
    headings: List[HeadingData] = Field(default_factory=list)
    tables: List[TableData] = Field(default_factory=list)
    images: List[ImageData] = Field(default_factory=list)


class ParsedDocumentResult(BaseModel):
    """Unified return type of the parsing system, grouping raw text, metadata, and pages."""
    raw_text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    pages: List[ParsedPage] = Field(default_factory=list)


class IDocumentParser(ABC):
    """Common interface for all document parsers."""
    
    @abstractmethod
    def parse(self, file_path: str) -> ParsedDocumentResult:
        """Parses a document file and returns a unified ParsedDocumentResult structure.
        
        Args:
            file_path: The absolute path of the file on disk.
            
        Returns:
            ParsedDocumentResult containing text, tables, headings, and images.
            
        Raises:
            DocumentParsingError: If parsing fails due to file corruption, 
                                 unreadable contents, or access restrictions.
        """
        pass
