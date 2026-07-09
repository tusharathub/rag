import os
import csv
from app.interfaces.parsers import (
    IDocumentParser, 
    ParsedDocumentResult, 
    ParsedPage, 
    TableData, 
    DocumentParsingError
)


class CsvParser(IDocumentParser):
    """Parser implementation for CSV text files."""

    def parse(self, file_path: str) -> ParsedDocumentResult:
        if not os.path.exists(file_path):
            raise DocumentParsingError(f"File not found: {file_path}")
            
        try:
            rows = []
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    # Skip empty rows
                    if not row or all(cell.strip() == "" for cell in row):
                        continue
                    rows.append([cell.strip() for cell in row])

            if not rows:
                raise DocumentParsingError("CSV file is empty or contains no parsable data.")

            headers = rows[0]
            table_rows = rows[1:] if len(rows) > 1 else []

            # Create standard textual representation for chunk indexing
            text_lines = []
            text_lines.append(" | ".join(headers))
            for row in table_rows:
                text_lines.append(" | ".join(row))
            
            raw_text = "\n".join(text_lines)

            tables = [TableData(
                headers=headers,
                rows=table_rows,
                caption=f"CSV Table: {os.path.basename(file_path)}"
            )]

            metadata = {
                "row_count": str(len(rows)),
                "column_count": str(len(headers))
            }

            pages = [ParsedPage(
                page_number=1,
                text=raw_text,
                headings=[],
                tables=tables,
                images=[]
            )]

            return ParsedDocumentResult(
                raw_text=raw_text,
                metadata=metadata,
                pages=pages
            )
        except Exception as e:
            if isinstance(e, DocumentParsingError):
                raise
            raise DocumentParsingError(f"Failed parsing CSV file: {str(e)}")
