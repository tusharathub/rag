from app.interfaces.parsers import IDocumentParser, UnsupportedFormatError
from app.infrastructure.parsers.pdf import PDFParser
from app.infrastructure.parsers.docx import DocxParser
from app.infrastructure.parsers.excel import ExcelParser
from app.infrastructure.parsers.pptx import PptxParser
from app.infrastructure.parsers.markdown import MarkdownParser
from app.infrastructure.parsers.html import HtmlParser
from app.infrastructure.parsers.csv import CsvParser
from app.infrastructure.parsers.json import JsonParser
from app.infrastructure.parsers.txt import TxtParser


class DocumentParserFactory:
    """Strategy pattern factory for retrieving format-specific document parsers."""

    def __init__(self):
        self._parsers = {
            "pdf": PDFParser(),
            "docx": DocxParser(),
            "xlsx": ExcelParser(),
            "xls": ExcelParser(),
            "pptx": PptxParser(),
            "ppt": PptxParser(),
            "md": MarkdownParser(),
            "markdown": MarkdownParser(),
            "html": HtmlParser(),
            "htm": HtmlParser(),
            "csv": CsvParser(),
            "json": JsonParser(),
            "txt": TxtParser()
        }

    def get_parser(self, extension: str) -> IDocumentParser:
        """Retrieves the parser mapped to the given file extension.
        
        Args:
            extension: The file extension (e.g. '.pdf', 'docx').
            
        Returns:
            The IDocumentParser instance.
            
        Raises:
            UnsupportedFormatError: If no parser matches the extension.
        """
        ext = extension.lower().lstrip(".")
        parser = self._parsers.get(ext)
        if not parser:
            raise UnsupportedFormatError(f"No parser registered for extension: .{ext}")
        return parser
