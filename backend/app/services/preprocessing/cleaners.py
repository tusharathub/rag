import re
from typing import List, Set, Dict
from collections import Counter
from app.interfaces.parsers import ParsedPage


def normalize_whitespace(text: str) -> str:
    """Normalizes spaces, tabs, and newlines in the text.
    
    - Replaces consecutive spaces or tabs with a single space.
    - Preserves paragraph structures by limiting consecutive newlines to at most 2.
    - Strips leading and trailing whitespace from each line.
    """
    if not text:
        return ""
    
    # Split text into lines, strip each line
    lines = [line.strip() for line in text.splitlines()]
    
    # Join with newlines
    text = "\n".join(lines)
    
    # Replace multiple consecutive spaces and tabs with a single space
    text = re.sub(r"[ \t]+", " ", text)
    
    # Normalize excessive newlines: 3 or more newlines become exactly 2 newlines (a paragraph break)
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    return text.strip()


class HeaderFooterRemover:
    """Detects and removes repeating headers and footers dynamically in multi-page documents."""

    def __init__(self, margin_lines: int = 2, min_pages: int = 3, frequency_threshold: float = 0.5):
        """
        Args:
            margin_lines: Number of lines at the top and bottom of each page to scan.
            min_pages: Minimum number of pages required to run dynamic frequency detection.
            frequency_threshold: Fraction of pages (0.0 to 1.0) on which a line must appear to be considered a header/footer.
        """
        self.margin_lines = margin_lines
        self.min_pages = min_pages
        self.frequency_threshold = frequency_threshold
        
        # Standard regexes for common page numbers and headers
        self.common_patterns = [
            re.compile(r"^page\s+\d+\s+(of|/)\s+\d+$", re.IGNORECASE),  # Page 1 of 5
            re.compile(r"^page\s+\d+$", re.IGNORECASE),                 # Page 1
            re.compile(r"^\d+\s+(of|/)\s+\d+$", re.IGNORECASE),         # 1 of 5
            re.compile(r"^-\s*\d+\s*-$"),                              # - 1 - or -1-
            re.compile(r"^\d+$")                                        # Solitary page numbers (e.g. 1)
        ]

    def detect_headers_footers(self, pages: List[ParsedPage]) -> Set[str]:
        """Identifies repeating lines at the top or bottom of pages."""
        detected: Set[str] = set()
        total_pages = len(pages)
        
        if total_pages < self.min_pages:
            return detected

        top_lines_counter = Counter()
        bottom_lines_counter = Counter()

        for page in pages:
            # Clean page lines for analysis
            lines = [line.strip() for line in page.text.splitlines() if line.strip()]
            if not lines:
                continue

            # Analyze top margin lines
            top_slice = lines[:self.margin_lines]
            for line in top_slice:
                top_lines_counter[line] += 1

            # Analyze bottom margin lines
            bottom_slice = lines[-self.margin_lines:] if len(lines) > self.margin_lines else lines
            for line in bottom_slice:
                bottom_lines_counter[line] += 1

        # Collect lines appearing above the frequency threshold across pages
        threshold_count = max(2, int(total_pages * self.frequency_threshold))
        
        for line, count in top_lines_counter.items():
            if count >= threshold_count:
                detected.add(line)

        for line, count in bottom_lines_counter.items():
            if count >= threshold_count:
                detected.add(line)

        return detected

    def clean_page(self, page_text: str, headers_footers: Set[str]) -> str:
        """Cleans headers, footers, and page numbers from a single page's text."""
        lines = page_text.splitlines()
        cleaned_lines = []
        total_lines = len(lines)

        for idx, line in enumerate(lines):
            stripped = line.strip()
            
            # Skip if empty
            if not stripped:
                cleaned_lines.append("")
                continue

            # Check if it matches dynamically detected headers/footers in margin zones
            is_margin_line = (idx < self.margin_lines or idx >= total_lines - self.margin_lines)
            if is_margin_line and stripped in headers_footers:
                continue

            # Check if it matches generic page number regex patterns in margin zones
            if is_margin_line:
                matched_pattern = False
                for pattern in self.common_patterns:
                    if pattern.match(stripped):
                        matched_pattern = True
                        break
                if matched_pattern:
                    continue

            # If not skipped, preserve line
            cleaned_lines.append(line)

        return "\n".join(cleaned_lines)
