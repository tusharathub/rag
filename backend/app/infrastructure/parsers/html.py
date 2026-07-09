import os
from bs4 import BeautifulSoup
from app.interfaces.parsers import (
    IDocumentParser, 
    ParsedDocumentResult, 
    ParsedPage, 
    HeadingData, 
    TableData, 
    DocumentParsingError
)


class HtmlParser(IDocumentParser):
    """Parser implementation for HTML documents."""

    def parse(self, file_path: str) -> ParsedDocumentResult:
        if not os.path.exists(file_path):
            raise DocumentParsingError(f"File not found: {file_path}")
            
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                html_content = f.read()
                
            soup = BeautifulSoup(html_content, "html.parser")
            
            # Decompose script and style nodes to avoid extracting scripting text
            for node in soup(["script", "style"]):
                node.decompose()
                
            raw_text = soup.get_text(separator="\n").strip()
            
            # 1. Extract Headings (h1 - h6)
            headings = []
            for tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
                level = int(tag_name[1])
                for tag in soup.find_all(tag_name):
                    text = tag.get_text().strip()
                    if text:
                        headings.append(HeadingData(text=text, level=level))
                        
            # 2. Extract Tables
            tables = []
            for t_idx, table_tag in enumerate(soup.find_all("table")):
                headers = []
                rows = []
                
                # Check for table header cells
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
                        # Fallback: treat first row as header if no explicit th tags
                        headers = row_cells
                    else:
                        rows.append(row_cells)
                        
                caption_tag = table_tag.find("caption")
                caption = caption_tag.get_text().strip() if caption_tag else f"Table {t_idx + 1}"
                
                tables.append(TableData(
                    headers=headers,
                    rows=rows,
                    caption=caption
                ))

            # 3. Metadata extraction (title and description tag)
            metadata = {}
            if soup.title and soup.title.string:
                metadata["title"] = soup.title.string.strip()
                
            desc_meta = soup.find("meta", attrs={"name": "description"})
            if desc_meta and desc_meta.get("content"):
                metadata["description"] = desc_meta.get("content").strip()

            pages = [ParsedPage(
                page_number=1,
                text=raw_text,
                headings=headings,
                tables=tables,
                images=[]  # HTML tags point to external image URIs, binary extraction is skipped
            )]

            return ParsedDocumentResult(
                raw_text=raw_text,
                metadata=metadata,
                pages=pages
            )
        except Exception as e:
            raise DocumentParsingError(f"Failed parsing HTML file: {str(e)}")
