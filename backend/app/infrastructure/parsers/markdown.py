import os
import markdown
from bs4 import BeautifulSoup
from app.interfaces.parsers import (
    IDocumentParser, 
    ParsedDocumentResult, 
    ParsedPage, 
    HeadingData, 
    TableData, 
    DocumentParsingError
)


class MarkdownParser(IDocumentParser):
    """Parser implementation for Markdown documents."""

    def parse(self, file_path: str) -> ParsedDocumentResult:
        if not os.path.exists(file_path):
            raise DocumentParsingError(f"File not found: {file_path}")
            
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                md_content = f.read()
                
            # Render Markdown to HTML with standard tables and fenced code blocks extensions
            html_content = markdown.markdown(
                md_content, 
                extensions=["tables", "fenced_code"]
            )
            
            soup = BeautifulSoup(html_content, "html.parser")
            raw_text = soup.get_text(separator="\n").strip()
            
            # 1. Extract headings (h1 - h6)
            headings = []
            for tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                level = int(tag_name[1])
                for tag in soup.find_all(tag_name):
                    text = tag.get_text().strip()
                    if text:
                        headings.append(HeadingData(text=text, level=level))

            # 2. Extract tables
            tables = []
            for t_idx, table_tag in enumerate(soup.find_all("table")):
                headers = []
                rows = []
                
                th_tags = table_tag.find_all("th")
                if th_tags:
                    headers = [th.get_text().strip() for th in th_tags]
                    
                tr_tags = table_tag.find_all("tr")
                for tr in tr_tags:
                    td_tags = tr.find_all("td")
                    if not td_tags:
                        continue
                    row_cells = [td.get_text().strip() for td in td_tags]
                    
                    if not headers and not rows:
                        headers = row_cells
                    else:
                        rows.append(row_cells)
                        
                tables.append(TableData(
                    headers=headers,
                    rows=rows,
                    caption=f"Markdown Table {t_idx + 1}"
                ))

            # 3. Simple markdown metadata extraction
            # Try to fetch title from first H1 if available
            metadata = {}
            if headings and headings[0].level == 1:
                metadata["title"] = headings[0].text
            metadata["character_count"] = str(len(md_content))
            metadata["word_count"] = str(len(md_content.split()))

            pages = [ParsedPage(
                page_number=1,
                text=raw_text,
                headings=headings,
                tables=tables,
                images=[]
            )]

            return ParsedDocumentResult(
                raw_text=raw_text,
                metadata=metadata,
                pages=pages
            )
        except Exception as e:
            raise DocumentParsingError(f"Failed parsing Markdown file: {str(e)}")
