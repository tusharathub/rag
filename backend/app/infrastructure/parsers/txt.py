import os
from app.interfaces.parsers import (
    IDocumentParser, 
    ParsedDocumentResult, 
    ParsedPage, 
    DocumentParsingError
)


class TxtParser(IDocumentParser):
    """Parser implementation for plain text documents."""

    def parse(self, file_path: str) -> ParsedDocumentResult:
        if not os.path.exists(file_path):
            raise DocumentParsingError(f"File not found: {file_path}")
            
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw_text = f.read()
                
            metadata = {
                "character_count": str(len(raw_text)),
                "word_count": str(len(raw_text.split())),
                "line_count": str(len(raw_text.splitlines()))
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
        except UnicodeDecodeError as e:
            raise DocumentParsingError(f"Plain text file decoding failed (not UTF-8): {str(e)}")
        except Exception as e:
            raise DocumentParsingError(f"Failed parsing plain text file: {str(e)}")
