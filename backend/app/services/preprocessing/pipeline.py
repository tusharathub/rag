import uuid
from typing import List, Dict, Any, Optional
from app.interfaces.processing import ITextPreprocessor, PreprocessingConfig
from app.interfaces.parsers import ParsedDocumentResult
from app.domain.models.document import DocumentChunkDomain
from app.interfaces.ai.services import IEmbeddingService
from app.services.preprocessing.cleaners import normalize_whitespace, HeaderFooterRemover
from app.services.preprocessing.chunkers import (
    SentenceUnit,
    split_into_sentences,
    get_token_count,
    TokenAwareChunker,
    SemanticChunker
)


class TextPreprocessingPipeline(ITextPreprocessor):
    """Production-grade text preprocessing and chunking orchestrator pipeline."""

    def __init__(self, embedding_service: Optional[IEmbeddingService] = None):
        """
        Args:
            embedding_service: Optional embedding service for semantic similarity splits.
        """
        self.embedding_service = embedding_service

    async def preprocess(
        self, 
        parsed_doc: ParsedDocumentResult, 
        document_id: uuid.UUID,
        config: Optional[PreprocessingConfig] = None
    ) -> List[DocumentChunkDomain]:
        """Runs the cleaning, section tracking, and chunking pipeline."""
        cfg = config or PreprocessingConfig()

        # Step 1: Document-level Cleaning (Headers & Footers detection)
        cleaned_pages_text: List[str] = []
        
        if cfg.remove_headers_footers and len(parsed_doc.pages) >= 2:
            remover = HeaderFooterRemover()
            detected_headers_footers = remover.detect_headers_footers(parsed_doc.pages)
            
            for page in parsed_doc.pages:
                cleaned_text = remover.clean_page(page.text, detected_headers_footers)
                cleaned_pages_text.append(cleaned_text)
        else:
            cleaned_pages_text = [page.text for page in parsed_doc.pages]

        # Step 2: Sentence Segmentation and Structure/Heading Tracking
        sentence_units: List[SentenceUnit] = []
        
        # Track the hierarchical section path
        # Level -> Heading text mapping
        active_headings: Dict[int, str] = {}

        for p_idx, page in enumerate(parsed_doc.pages):
            page_text = cleaned_pages_text[p_idx]
            if cfg.normalize_whitespace:
                page_text = normalize_whitespace(page_text)

            # Create a lookup for headings on this page to quickly identify them in text
            headings_lookup = {
                h.text.strip().lower(): h 
                for h in page.headings 
                if h.text.strip()
            }

            raw_sentences = []
            for line in page_text.splitlines():
                cleaned_line = line.strip()
                if cleaned_line:
                    raw_sentences.extend(split_into_sentences(cleaned_line))

            
            for sent_text in raw_sentences:
                stripped_sent = sent_text.strip()
                if not stripped_sent:
                    continue

                # 2a: Section detection. Check if this sentence represents a heading
                matched_heading = headings_lookup.get(stripped_sent.lower())
                if matched_heading:
                    level = matched_heading.level
                    
                    # Clean out all sub-levels from our current tracking dictionary
                    keys_to_remove = [k for k in active_headings.keys() if k >= level]
                    for k in keys_to_remove:
                        active_headings.pop(k, None)
                    
                    active_headings[level] = matched_heading.text.strip()

                # Get sorted list of current headings to form the section hierarchy path
                current_path_list = [
                    active_headings[k] 
                    for k in sorted(active_headings.keys())
                ]

                # Calculate token count
                tok_count = get_token_count(stripped_sent, encoding_name=cfg.tokenizer_name)
                
                sentence_units.append(
                    SentenceUnit(
                        text=stripped_sent,
                        token_count=tok_count,
                        page_number=page.page_number,
                        headings=current_path_list
                    )
                )

        if not sentence_units:
            return []

        # Step 3: Chunking
        chunk_segments: List[List[SentenceUnit]] = []
        
        if cfg.strategy == "semantic":
            chunker = SemanticChunker(
                embedding_service=self.embedding_service,
                max_chunk_size=cfg.max_chunk_size,
                threshold_percentile=cfg.semantic_threshold_percentile,
                tokenizer_name=cfg.tokenizer_name
            )
            chunk_segments = await chunker.chunk_sentences(sentence_units)
        else:
            # Default to TokenAware Chunking
            chunker = TokenAwareChunker(
                max_chunk_size=cfg.max_chunk_size,
                chunk_overlap=cfg.chunk_overlap,
                tokenizer_name=cfg.tokenizer_name
            )
            chunk_segments = chunker.chunk_sentences(sentence_units)

        # Step 4: Map groups of SentenceUnits to DocumentChunkDomain model
        domain_chunks: List[DocumentChunkDomain] = []
        
        for c_idx, segment in enumerate(chunk_segments):
            if not segment:
                continue

            # Reconstruct content
            content = " ".join(su.text for su in segment)
            
            # Determine pages this chunk spans
            pages = {su.page_number for su in segment}
            page_start = min(pages)
            page_end = max(pages)

            # Determine the main section path for this chunk (take the most common heading path or the last)
            # Find the heading list of the last sentence unit in the chunk
            main_headings = segment[-1].headings
            section_path = " > ".join(main_headings) if main_headings else ""

            # Calculate total tokens
            chunk_token_count = sum(su.token_count for su in segment)

            # Construct metadata
            metadata = {
                "section_path": section_path,
                "page_start": page_start,
                "page_end": page_end,
                "token_count": chunk_token_count,
                "char_count": len(content)
            }

            domain_chunks.append(
                DocumentChunkDomain(
                    id=uuid.uuid4(),
                    document_id=document_id,
                    content=content,
                    chunk_index=c_idx,
                    metadata=metadata,
                    embedding=None
                )
            )

        return domain_chunks
