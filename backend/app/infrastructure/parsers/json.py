import os
import json
from app.interfaces.parsers import (
    IDocumentParser, 
    ParsedDocumentResult, 
    ParsedPage, 
    DocumentParsingError
)


class JsonParser(IDocumentParser):
    """Parser implementation for JSON structured data files."""

    def parse(self, file_path: str) -> ParsedDocumentResult:
        if not os.path.exists(file_path):
            raise DocumentParsingError(f"File not found: {file_path}")
            
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
                
            # Convert JSON structure to structured/formatted string
            raw_text = json.dumps(data, indent=2)
            
            metadata = {
                "json_type": "array" if isinstance(data, list) else "object",
                "item_count": str(len(data)) if isinstance(data, (list, dict)) else "0"
            }
            
            pages = [ParsedPage(
                page_number=1,
                text=raw_text,
                headings=[],
                tables=[],
                images=[]
            )]
            
            return ParsedDocumentResult(
                raw_text=raw_text,
                metadata=metadata,
                pages=pages
            )
        except Exception as e:
            raise DocumentParsingError(f"Failed parsing JSON file: {str(e)}")
