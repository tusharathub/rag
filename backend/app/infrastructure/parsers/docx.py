import os
from docx import Document as DocxDoc
from app.interfaces.parsers import (
    IDocumentParser, 
    ParsedDocumentResult, 
    ParsedPage, 
    HeadingData, 
    TableData, 
    ImageData, 
    DocumentParsingError
)


class DocxParser(IDocumentParser):
    """Parser implementation for Word DOCX documents."""

    def parse(self, file_path: str) -> ParsedDocumentResult:
        if not os.path.exists(file_path):
            raise DocumentParsingError(f"File not found: {file_path}")
            
        try:
            doc = DocxDoc(file_path)
            
            headings = []
            tables = []
            images = []
            raw_text_parts = []
            
            # 1. Parse paragraphs (text & headings)
            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                raw_text_parts.append(text)
                
                # Heading identification using paragraph style names
                style_name = para.style.name if para.style else ""
                if style_name and style_name.startswith("Heading"):
                    try:
                        level_str = style_name.replace("Heading", "").strip()
                        level = int(level_str) if level_str.isdigit() else 1
                        headings.append(HeadingData(text=text, level=level))
                    except Exception:
                        pass

            # 2. Parse tables
            for table_idx, table in enumerate(doc.tables):
                headers = []
                rows = []
                for r_idx, row in enumerate(table.rows):
                    row_cells = [cell.text.strip() for cell in row.cells]
                    
                    if r_idx == 0:
                        headers = row_cells
                    else:
                        rows.append(row_cells)
                
                tables.append(TableData(
                    headers=headers,
                    rows=rows,
                    caption=f"Table {table_idx + 1}"
                ))
                # Add table text to raw text representation
                for row_data in rows:
                    raw_text_parts.append(" | ".join(row_data))

            # 3. Parse embedded images (via zip package parts)
            try:
                # Traverse images directly in the package structure
                for img_idx, image_part in enumerate(doc.part.package.image_parts):
                    name = os.path.basename(image_part.partname)
                    ext = "png"
                    if "." in name:
                        ext = name.split(".")[-1].lower()
                    
                    images.append(ImageData(
                        name=name or f"image_{img_idx}.{ext}",
                        content=image_part.blob,
                        content_type=f"image/{ext}",
                        page_number=1
                    ))
            except Exception:
                pass

            raw_text = "\n\n".join(raw_text_parts)

            # Metadata extraction
            metadata = {}
            props = doc.core_properties
            for prop in ["author", "category", "created", "last_modified_by", "modified", "title", "subject"]:
                try:
                    val = getattr(props, prop)
                    if val:
                        metadata[prop] = str(val)
                except Exception:
                    pass
            metadata["page_count"] = 1

            pages = [ParsedPage(
                page_number=1,
                text=raw_text,
                headings=headings,
                tables=tables,
                images=images
            )]

            return ParsedDocumentResult(
                raw_text=raw_text,
                metadata=metadata,
                pages=pages
            )
        except Exception as e:
            raise DocumentParsingError(f"Failed parsing DOCX file: {str(e)}")
