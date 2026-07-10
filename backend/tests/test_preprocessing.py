import pytest
import uuid
from typing import List
from app.interfaces.parsers import ParsedDocumentResult, ParsedPage, HeadingData
from app.interfaces.processing import PreprocessingConfig
from app.interfaces.ai.services import IEmbeddingService
from app.services.preprocessing.cleaners import normalize_whitespace, HeaderFooterRemover
from app.services.preprocessing.chunkers import (
    split_into_sentences,
    get_token_count,
    TokenAwareChunker,
    SemanticChunker,
    SentenceUnit
)
from app.services.preprocessing.pipeline import TextPreprocessingPipeline
# -------------------------------------------------------------
# Integration Ingestion Service Test
# -------------------------------------------------------------
from app.services.document import DocumentProcessingService
from app.domain.models.document import DocumentDomain, DocumentStatus
from app.interfaces.storage.storage import IFileStorageService
from app.interfaces.db.repositories import IDocumentRepository


class MockStorageService(IFileStorageService):
    async def upload_file(self, file_data, storage_path: str) -> str:
        return storage_path
    async def download_file(self, storage_path: str) -> bytes:
        # Return mock text file bytes
        return b"Heading Section\nThis is the content of the document."
    async def delete_file(self, storage_path: str) -> bool:
        return True


class MockDocumentRepository(IDocumentRepository):
    def __init__(self, doc: DocumentDomain):
        self.doc = doc
        self.saved_chunks = []
        self.status_history = []

    async def create(self, document: DocumentDomain) -> DocumentDomain:
        return document
    async def get_by_id(self, document_id: uuid.UUID) -> Optional[DocumentDomain]:
        return self.doc if self.doc.id == document_id else None
    async def get_by_org(self, organization_id: uuid.UUID, skip: int = 0, limit: int = 10):
        return [self.doc]
    async def update_status(self, document_id: uuid.UUID, status: DocumentStatus) -> DocumentDomain:
        self.status_history.append(status)
        self.doc.status = status
        return self.doc
    async def delete(self, document_id: uuid.UUID) -> bool:
        return True
    async def bulk_save_chunks(self, chunks: List[DocumentChunkDomain]) -> None:
        self.saved_chunks.extend(chunks)
    async def hybrid_search(self, organization_id, query_embedding, query_text, limit=5):
        return []


@pytest.mark.asyncio
async def test_document_processing_service_integration():
    from datetime import datetime
    now = datetime.now()
    doc_id = uuid.uuid4()
    doc_domain = DocumentDomain(
        id=doc_id,
        name="test_doc.txt",
        storage_path="documents/test_doc.txt",
        file_type="txt",
        file_size=100,
        status=DocumentStatus.PENDING,
        organization_id=uuid.uuid4(),
        created_at=now,
        updated_at=now
    )

    mock_repo = MockDocumentRepository(doc_domain)
    mock_storage = MockStorageService()
    mock_embeddings = MockEmbeddingService([[0.1] * 1536])
    pipeline = TextPreprocessingPipeline(embedding_service=mock_embeddings)

    processing_service = DocumentProcessingService(
        repository=mock_repo,
        storage_service=mock_storage,
        embedding_service=mock_embeddings,
        preprocessor=pipeline
    )

    # Process the document with a small chunk size to force a split
    config = PreprocessingConfig(max_chunk_size=5, chunk_overlap=0)
    await processing_service.process_document(doc_id, config=config)

    # Assert status flow: PENDING -> PROCESSING -> COMPLETED
    assert mock_repo.status_history == [DocumentStatus.PROCESSING, DocumentStatus.COMPLETED]
    assert doc_domain.status == DocumentStatus.COMPLETED

    # Assert chunks were preprocessed, chunked, embedded, and saved
    assert len(mock_repo.saved_chunks) == 2  # "Heading Section" and "This is the content of the document."
    assert mock_repo.saved_chunks[0].embedding == [0.1] * 1536
    assert mock_repo.saved_chunks[0].content == "Heading Section"
    assert mock_repo.saved_chunks[1].content == "This is the content of the document."



# -------------------------------------------------------------
# Mock Embedding Service for Semantic Chunker Tests
# -------------------------------------------------------------
class MockEmbeddingService(IEmbeddingService):
    def __init__(self, sentence_vectors: List[List[float]]):
        self.sentence_vectors = sentence_vectors
        self.call_count = 0

    async def generate_embedding(self, text: str) -> List[float]:
        return [1.0, 0.0]

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        self.call_count += 1
        result = []
        for i in range(len(texts)):
            if i < len(self.sentence_vectors):
                result.append(self.sentence_vectors[i])
            else:
                result.append([1.0, 0.0])
        return result


# -------------------------------------------------------------
# Cleaners Tests
# -------------------------------------------------------------

def test_normalize_whitespace():
    input_text = "  Hello   world! \t This is  a sentence.  \n\n\n\nAnother paragraph.\n  "
    expected = "Hello world! This is a sentence.\n\nAnother paragraph."
    assert normalize_whitespace(input_text) == expected


def test_header_footer_remover():
    # Setup pages with repeating headers and footers
    pages = [
        ParsedPage(page_number=1, text="Company Confidential\nIntroduction\nPage 1 of 3", headings=[]),
        ParsedPage(page_number=2, text="Company Confidential\nMethodology\nPage 2 of 3", headings=[]),
        ParsedPage(page_number=3, text="Company Confidential\nResults\nPage 3 of 3", headings=[])
    ]
    
    remover = HeaderFooterRemover(margin_lines=1, min_pages=3, frequency_threshold=0.5)
    
    # 1. Test detection
    detected = remover.detect_headers_footers(pages)
    assert "Company Confidential" in detected
    # Page numbers are dynamic, so they are not detected via frequency
    assert "Page 1 of 3" not in detected 

    # 2. Test cleaning (removes Company Confidential via frequency, Page X of Y via regex)
    cleaned_page_1 = remover.clean_page(pages[0].text, detected)
    assert "Company Confidential" not in cleaned_page_1
    assert "Page 1 of 3" not in cleaned_page_1
    assert "Introduction" in cleaned_page_1


# -------------------------------------------------------------
# Chunkers Tests
# -------------------------------------------------------------

def test_sentence_splitter():
    text = "Hello world. Dr. Smith is here vs. the competitor. What is happening? Yes!"
    sentences = split_into_sentences(text)
    assert len(sentences) == 4
    assert sentences[0] == "Hello world."
    assert sentences[1] == "Dr. Smith is here vs. the competitor."
    assert sentences[2] == "What is happening?"
    assert sentences[3] == "Yes!"


def test_token_aware_chunker():
    sentences = [
        SentenceUnit(text="This is sentence one.", token_count=5, page_number=1, headings=[]),
        SentenceUnit(text="This is sentence two.", token_count=5, page_number=1, headings=[]),
        SentenceUnit(text="This is sentence three.", token_count=5, page_number=1, headings=[]),
        SentenceUnit(text="This is sentence four.", token_count=5, page_number=1, headings=[])
    ]
    
    # Max size = 12 tokens, overlap = 5 tokens
    chunker = TokenAwareChunker(max_chunk_size=12, chunk_overlap=5)
    chunks = chunker.chunk_sentences(sentences)
    
    # Assert sentence grouping:
    # Chunk 1: [one, two] = 10 tokens
    # Chunk 2: overlap starts with [two] (5 tokens), adds [three] = 10 tokens
    # Chunk 3: overlap starts with [three] (5 tokens), adds [four] = 10 tokens
    assert len(chunks) == 3
    assert [s.text for s in chunks[0]] == ["This is sentence one.", "This is sentence two."]
    assert [s.text for s in chunks[1]] == ["This is sentence two.", "This is sentence three."]
    assert [s.text for s in chunks[2]] == ["This is sentence three.", "This is sentence four."]


@pytest.mark.asyncio
async def test_semantic_chunker_similarity():
    # Set up sentence vectors:
    # Sentence 0 & 1 are identical ([1.0, 0.0]). Sentence 2 is orthogonal ([0.0, 1.0]) -> high cosine distance.
    vectors = [
        [1.0, 0.0],
        [1.0, 0.0],
        [0.0, 1.0]
    ]
    mock_embeddings = MockEmbeddingService(vectors)
    
    sentences = [
        SentenceUnit(text="Topic A part one.", token_count=5, page_number=1, headings=[]),
        SentenceUnit(text="Topic A part two.", token_count=5, page_number=1, headings=[]),
        SentenceUnit(text="Topic B different topic.", token_count=5, page_number=1, headings=[])
    ]
    
    # Use high threshold percentile so it splits on the large jump (90th percentile)
    chunker = SemanticChunker(
        embedding_service=mock_embeddings, 
        max_chunk_size=50, 
        threshold_percentile=50.0
    )
    chunks = await chunker.chunk_sentences(sentences)
    
    # Assert it split between Topic A and Topic B
    assert len(chunks) == 2
    assert [s.text for s in chunks[0]] == ["Topic A part one.", "Topic A part two."]
    assert [s.text for s in chunks[1]] == ["Topic B different topic."]


# -------------------------------------------------------------
# Pipeline Integration Tests
# -------------------------------------------------------------

@pytest.mark.asyncio
async def test_pipeline_end_to_end():
    doc = ParsedDocumentResult(
        raw_text="",
        metadata={},
        pages=[
            ParsedPage(
                page_number=1,
                text="Document Title\nThis is the intro sentence.\nHeading Section\nThis is paragraph in section.",
                headings=[
                    HeadingData(text="Document Title", level=1),
                    HeadingData(text="Heading Section", level=2)
                ]
            )
        ]
    )

    pipeline = TextPreprocessingPipeline(embedding_service=None)
    
    config = PreprocessingConfig(
        strategy="token",
        max_chunk_size=8,
        chunk_overlap=0
    )
    
    doc_uuid = uuid.uuid4()
    chunks = await pipeline.preprocess(doc, doc_uuid, config)
    
    assert len(chunks) > 0
    assert chunks[0].document_id == doc_uuid
    assert chunks[0].chunk_index == 0
    
    # Verify section tracking
    # The second sentence "This is paragraph in section." should have the heading path "Document Title > Heading Section"
    # because it comes after the "Heading Section" level 2 heading.
    intro_chunk = [c for c in chunks if "intro" in c.content][0]
    section_chunk = [c for c in chunks if "paragraph" in c.content][0]
    
    assert intro_chunk.metadata["section_path"] == "Document Title"
    assert section_chunk.metadata["section_path"] == "Document Title > Heading Section"
    assert section_chunk.metadata["page_start"] == 1
    assert section_chunk.metadata["page_end"] == 1
