import os
from pypdf import PdfReader
from app.interfaces.parsers import (
    IDocumentParser, 
    ParsedDocumentResult, 
    ParsedPage, 
    ImageData, 
    DocumentParsingError
)


class PDFParser(IDocumentParser):
    """Parser implementation for PDF documents."""

    def parse(self, file_path: str) -> ParsedDocumentResult:
        if not os.path.exists(file_path):
            raise DocumentParsingError(f"File not found: {file_path}")
            
        try:
            reader = PdfReader(file_path)
            
            # Check encryption
            if reader.is_encrypted:
                try:
                    # Attempt decryption with empty password
                    reader.decrypt("")
                except Exception:
                    raise DocumentParsingError("Document is encrypted/password-protected.")

            pages = []
            all_text_parts = []
            
            for idx, page in enumerate(reader.pages):
                page_number = idx + 1
                try:
                    text = page.extract_text() or ""
                except Exception as e:
                    # Log or mark unreadable pages
                    text = f"[Unparseable page: {str(e)}]"

                # Attempt page images extraction
                images = []
                try:
                    if page.images:
                        for img_idx, img_file in enumerate(page.images):
                            # Default mime-type detection based on name
                            ext = "png"
                            if "." in img_file.name:
                                ext = img_file.name.split(".")[-1].lower()
                            
                            images.append(ImageData(
                                name=img_file.name or f"img_p{page_number}_{img_idx}.{ext}",
                                content=img_file.data,
                                content_type=f"image/{ext}",
                                page_number=page_number
                            ))
                except Exception:
                    # Do not crash the page parsing if image extraction fails
                    pass

                pages.append(ParsedPage(
                    page_number=page_number,
                    text=text,
                    headings=[],  # Basic pypdf extract_text does not output headings structure
                    tables=[],    # Table extraction not natively supported by standard pypdf
                    images=images
                ))
                if text:
                    all_text_parts.append(text)

            # Metadata aggregation
            metadata = {}
            if reader.metadata:
                for k, v in reader.metadata.items():
                    clean_key = k.lstrip("/")
                    metadata[clean_key] = str(v)
            metadata["page_count"] = len(reader.pages)

            raw_text = "\n\n".join(all_text_parts)
            return ParsedDocumentResult(
                raw_text=raw_text,
                metadata=metadata,
                pages=pages
            )
        except Exception as e:
            if isinstance(e, DocumentParsingError):
                raise
            raise DocumentParsingError(f"Failed parsing PDF file: {str(e)}")
