import os
import io
import pytest
import tempfile
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.domain.models.document import DocumentDomain, DocumentStatus
from app.utils.document import (
    compute_sha256,
    validate_file_type,
    extract_metadata,
    FileValidationError
)
from app.infrastructure.storage.local import LocalFileStorageService
from app.services.document import DocumentUploadService, DuplicateFileError


# -------------------------------------------------------------
# Utility Function Tests
# -------------------------------------------------------------

def test_compute_sha256():
    """Verify that hashing correctly calculates the SHA-256 of file content."""
    content = b"Hello, Antigravity testing!"
    expected_hash = "7eaafabf64e4717ae6d7a44eed40e636ed6f084cded54062159e00f6fb8f94aa"
    
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(content)
        temp_file_path = temp_file.name

    try:
        calculated_hash = compute_sha256(temp_file_path)
        assert calculated_hash == expected_hash
    finally:
        os.remove(temp_file_path)


def test_validate_file_type_pdf_valid():
    """Verify validation passes for a valid PDF signature."""
    pdf_content = b"%PDF-1.4\n1 0 obj\n..."
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(pdf_content)
        temp_file_path = temp_file.name

    try:
        ext, mime = validate_file_type(temp_file_path, "report.pdf", "application/pdf")
        assert ext == "pdf"
        assert mime == "application/pdf"
    finally:
        os.remove(temp_file_path)


def test_validate_file_type_pdf_invalid_magic():
    """Verify validation fails if a file is named .pdf but doesn't have the PDF magic header."""
    fake_pdf_content = b"Not a pdf at all!"
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(fake_pdf_content)
        temp_file_path = temp_file.name

    try:
        with pytest.raises(FileValidationError) as excinfo:
            validate_file_type(temp_file_path, "spoofed.pdf", "application/pdf")
        assert "File signature (magic bytes) does not match" in str(excinfo.value)
    finally:
        os.remove(temp_file_path)


def test_validate_file_type_unsupported_extension():
    """Verify validation fails for unsupported file extensions (e.g. .png)."""
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file_path = temp_file.name

    try:
        with pytest.raises(FileValidationError) as excinfo:
            validate_file_type(temp_file_path, "image.png", "image/png")
        assert "Unsupported file extension" in str(excinfo.value)
    finally:
        os.remove(temp_file_path)


def test_validate_file_type_invalid_utf8():
    """Verify validation fails for binary files named as .txt or .md."""
    # Invalid UTF-8 bytes
    invalid_utf8 = b"\xff\xfe\x00\x00\x01\x02"
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(invalid_utf8)
        temp_file_path = temp_file.name

    try:
        with pytest.raises(FileValidationError) as excinfo:
            validate_file_type(temp_file_path, "notes.txt", "text/plain")
        assert "not valid UTF-8 text" in str(excinfo.value)
    finally:
        os.remove(temp_file_path)


def test_metadata_extraction_txt():
    """Verify correct metadata extraction for text files."""
    text_content = "Line 1\nLine 2\nLine 3 with words."
    with tempfile.NamedTemporaryFile(mode="w", delete=False, encoding="utf-8") as temp_file:
        temp_file.write(text_content)
        temp_file_path = temp_file.name

    try:
        meta = extract_metadata(temp_file_path, "txt")
        assert meta["line_count"] == "3"
        assert meta["word_count"] == "8"
        assert meta["character_count"] == str(len(text_content))
    finally:
        os.remove(temp_file_path)


def test_metadata_extraction_json():
    """Verify metadata extraction for JSON files."""
    json_content = '{"key1": "value1", "key2": [1, 2, 3]}'
    with tempfile.NamedTemporaryFile(mode="w", delete=False, encoding="utf-8") as temp_file:
        temp_file.write(json_content)
        temp_file_path = temp_file.name

    try:
        meta = extract_metadata(temp_file_path, "json")
        assert meta["type"] == "object"
        assert meta["item_count"] == "2"
    finally:
        os.remove(temp_file_path)


# -------------------------------------------------------------
# Local Storage Service Tests
# -------------------------------------------------------------

@pytest.mark.asyncio
async def test_local_storage_lifecycle():
    """Test uploading, downloading, and deleting files via LocalFileStorageService."""
    with tempfile.TemporaryDirectory() as temp_dir:
        storage_service = LocalFileStorageService(base_dir=temp_dir)
        
        file_content = b"Some file content to store."
        file_stream = io.BytesIO(file_content)
        relative_path = "subfolder/test_file.txt"
        
        # Upload
        full_path = await storage_service.upload_file(file_stream, relative_path)
        assert os.path.exists(full_path)
        
        # Download
        downloaded_bytes = await storage_service.download_file(relative_path)
        assert downloaded_bytes == file_content
        
        # Delete
        deleted = await storage_service.delete_file(relative_path)
        assert deleted is True
        assert not os.path.exists(full_path)


@pytest.mark.asyncio
async def test_local_storage_path_traversal():
    """Verify that LocalFileStorageService blocks path traversal attempts."""
    with tempfile.TemporaryDirectory() as temp_dir:
        storage_service = LocalFileStorageService(base_dir=temp_dir)
        
        file_content = b"hacker content"
        file_stream = io.BytesIO(file_content)
        traversal_path = "../escaped_file.txt"
        
        with pytest.raises(ValueError) as excinfo:
            await storage_service.upload_file(file_stream, traversal_path)
        assert "Path traversal attempt detected" in str(excinfo.value)


# -------------------------------------------------------------
# Service Layer Orchestration Tests
# -------------------------------------------------------------

@pytest.mark.asyncio
async def test_service_upload_success():
    """Test successful document upload workflow in service layer."""
    # Mocks
    mock_repo = AsyncMock()
    mock_repo.get_by_hash.return_value = None  # No duplicate
    
    mock_saved_doc = DocumentDomain(
        id=uuid.uuid4(),
        name="test.txt",
        storage_path="documents/col_id/doc_id.txt",
        file_type="txt",
        file_size=20,
        status=DocumentStatus.PENDING,
        organization_id=uuid.uuid4(),
        file_hash="fakehash",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_repo.create.return_value = mock_saved_doc
    
    mock_storage = AsyncMock()
    mock_storage.upload_file.return_value = "/absolute/storage/path/to/test.txt"
    
    with tempfile.TemporaryDirectory() as storage_dir:
        # Override settings for local testing
        from app.core.config import settings
        original_dir = settings.LOCAL_STORAGE_DIR
        settings.LOCAL_STORAGE_DIR = storage_dir
        
        try:
            service = DocumentUploadService(mock_repo, mock_storage)
            
            # Content
            content = b"Some valid plain text"
            file_stream = io.BytesIO(content)
            collection_id = uuid.uuid4()
            
            doc = await service.upload_document(
                file_name="test.txt",
                content_type="text/plain",
                file_stream=file_stream,
                collection_id=collection_id
            )
            
            assert doc == mock_saved_doc
            mock_storage.upload_file.assert_called_once()
            mock_repo.create.assert_called_once()
            mock_repo.save_metadata_items.assert_called_once()
        finally:
            settings.LOCAL_STORAGE_DIR = original_dir


@pytest.mark.asyncio
async def test_service_upload_duplicate_detection():
    """Test that duplicate files raise DuplicateFileError and clean up temp storage."""
    mock_repo = AsyncMock()
    
    existing_doc = DocumentDomain(
        id=uuid.uuid4(),
        name="already_existing.txt",
        storage_path="documents/col_id/old.txt",
        file_type="txt",
        file_size=21,
        status=DocumentStatus.COMPLETED,
        organization_id=uuid.uuid4(),
        file_hash="some_hash",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    # Repo mock returns the duplicate document
    mock_repo.get_by_hash.return_value = existing_doc
    
    mock_storage = AsyncMock()
    
    with tempfile.TemporaryDirectory() as storage_dir:
        from app.core.config import settings
        original_dir = settings.LOCAL_STORAGE_DIR
        settings.LOCAL_STORAGE_DIR = storage_dir
        
        try:
            service = DocumentUploadService(mock_repo, mock_storage)
            
            # Content
            content = b"Some duplicate content"
            file_stream = io.BytesIO(content)
            
            with pytest.raises(DuplicateFileError) as excinfo:
                await service.upload_document(
                    file_name="new.txt",
                    content_type="text/plain",
                    file_stream=file_stream,
                    collection_id=uuid.uuid4()
                )
                
            assert excinfo.value.existing_document == existing_doc
            # Ensure permanent storage upload was NEVER called
            mock_storage.upload_file.assert_not_called()
            # Ensure no temp files were leaked in the temp folder
            temp_files = os.listdir(os.path.join(storage_dir, "temp"))
            assert len(temp_files) == 0
        finally:
            settings.LOCAL_STORAGE_DIR = original_dir
