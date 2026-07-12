import os
import uuid
import logging
from datetime import datetime, timezone
from typing import BinaryIO, List, Optional, Dict
from app.interfaces.storage.storage import IFileStorageService
from app.interfaces.db.repositories import IDocumentRepository
from app.domain.models.document import DocumentDomain, DocumentStatus
from app.utils.document import (
    validate_file_type, 
    compute_sha256, 
    extract_metadata, 
    FileValidationError
)
from app.core.config import settings
from app.interfaces.processing import ITextPreprocessor, PreprocessingConfig
from app.interfaces.ai.services import IEmbeddingService
from app.infrastructure.parsers.factory import DocumentParserFactory
from app.domain.models.document import DocumentChunkDomain


logger = logging.getLogger(__name__)


class DuplicateFileError(Exception):
    """Raised when a file with the same content hash already exists in the collection."""
    def __init__(self, message: str, existing_document: DocumentDomain):
        super().__init__(message)
        self.existing_document = existing_document


class DocumentUploadService:
    """Service coordinates business rules and pipeline for document uploads."""
    
    def __init__(self, repository: IDocumentRepository, storage_service: IFileStorageService):
        self.repository = repository
        self.storage_service = storage_service
        # Default to 20MB max file size
        self.max_size_bytes = 20 * 1024 * 1024 

    async def upload_document(
        self,
        file_name: str,
        content_type: str,
        file_stream: BinaryIO,
        collection_id: uuid.UUID
    ) -> DocumentDomain:
        """Processes and stores an uploaded document.
        
        Args:
            file_name: Original file name.
            content_type: Content type from upload request.
            file_stream: Readable stream of the file content.
            collection_id: Collection to store the file in.
            
        Returns:
            DocumentDomain representing the registered document.
            
        Raises:
            FileValidationError: If size, extension, or magic bytes are invalid.
            DuplicateFileError: If file is a duplicate within the collection.
        """
        # Ensure temp directory exists inside workspace storage
        temp_dir = os.path.abspath(os.path.join(settings.LOCAL_STORAGE_DIR, "temp"))
        os.makedirs(temp_dir, exist_ok=True)
        
        # 1. Write incoming stream to temporary file to enforce size limits and compute hash safely
        temp_file_id = uuid.uuid4()
        temp_path = os.path.join(temp_dir, f"temp_{temp_file_id}")
        
        logger.info(f"Writing incoming file stream to temp path: {temp_path}")
        size_bytes = 0
        try:
            with open(temp_path, "wb") as temp_file:
                while True:
                    chunk = file_stream.read(65536)  # 64KB chunks
                    if not chunk:
                        break
                    size_bytes += len(chunk)
                    if size_bytes > self.max_size_bytes:
                        raise FileValidationError(
                            f"File size exceeds maximum allowed limit of {self.max_size_bytes // (1024*1024)}MB."
                        )
                    temp_file.write(chunk)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if isinstance(e, FileValidationError):
                raise
            logger.error(f"Failed writing upload stream to temp file: {e}")
            raise FileValidationError(f"Could not read upload stream: {str(e)}")

        # 2. Validate extension, MIME type, and magic bytes
        try:
            ext, final_mime = validate_file_type(temp_path, file_name, content_type)
        except FileValidationError as e:
            logger.warning(f"File validation failed for {file_name}: {e}")
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise

        # 3. Compute file hash (SHA-256)
        file_hash = compute_sha256(temp_path)

        # 4. Check for duplicates in the target collection
        # Note: We query repository using concrete helper `get_by_hash`
        if hasattr(self.repository, "get_by_hash"):
            existing_doc = await self.repository.get_by_hash(file_hash, collection_id)
            if existing_doc:
                logger.info(f"Duplicate document detected (ID: {existing_doc.id}, Hash: {file_hash})")
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise DuplicateFileError(
                    message=f"A duplicate file '{existing_doc.name}' already exists in this collection.",
                    existing_document=existing_doc
                )

        # 5. Extract metadata from document
        metadata = extract_metadata(temp_path, ext)
        # Store system/technical metadata
        metadata["original_filename"] = file_name
        metadata["mime_type"] = final_mime
        metadata["sha256"] = file_hash

        # 6. Upload file to permanent storage
        document_id = uuid.uuid4()
        # Storage path relative: documents/{collection_id}/{doc_id}.{ext}
        storage_path = f"documents/{collection_id}/{document_id}.{ext}"
        
        try:
            with open(temp_path, "rb") as final_stream:
                logger.info(f"Moving file to permanent storage at key: {storage_path}")
                permanent_uri = await self.storage_service.upload_file(final_stream, storage_path)
        except Exception as e:
            logger.error(f"Failed to upload to permanent storage: {e}")
            raise FileValidationError(f"Could not save file to permanent storage: {str(e)}")
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # 7. Persist to Postgres database
        now = datetime.now(timezone.utc)
        new_doc = DocumentDomain(
            id=document_id,
            name=file_name,
            storage_path=storage_path, # We store the key/path which is resolved by storage service
            file_type=ext,
            file_size=size_bytes,
            status=DocumentStatus.PENDING,
            organization_id=collection_id, # Acts as organization_id
            file_hash=file_hash,
            created_at=now,
            updated_at=now
        )

        try:
            # Create DB entry
            saved_doc = await self.repository.create(new_doc)
            
            # Save metadata entries
            if hasattr(self.repository, "save_metadata_items"):
                await self.repository.save_metadata_items(document_id, metadata)
                
            return saved_doc
        except Exception as e:
            logger.error(f"Failed to record document in database: {e}")
            # Try to roll back the storage upload to keep storage and database consistent
            await self.storage_service.delete_file(storage_path)
            raise

    async def get_document(self, document_id: uuid.UUID) -> Optional[DocumentDomain]:
        """Retrieves a document domain record by ID."""
        return await self.repository.get_by_id(document_id)

    async def get_document_metadata(self, document_id: uuid.UUID) -> Dict[str, str]:
        """Retrieves all metadata key-values for a document."""
        if hasattr(self.repository, "get_metadata_items"):
            return await self.repository.get_metadata_items(document_id)
        return {}

    async def list_documents(self, collection_id: uuid.UUID, skip: int = 0, limit: int = 10) -> List[DocumentDomain]:
        """Lists documents in a collection."""
        return await self.repository.get_by_org(collection_id, skip=skip, limit=limit)

    async def delete_document(self, document_id: uuid.UUID) -> bool:
        """Deletes a document from storage and database (soft delete)."""
        doc = await self.repository.get_by_id(document_id)
        if not doc:
            return False
            
        # Delete the permanent file from storage first
        logger.info(f"Deleting file from storage: {doc.storage_path}")
        await self.storage_service.delete_file(doc.storage_path)
        
        # Soft delete from repository
        return await self.repository.delete(document_id)


class DocumentProcessingService:
    """Service that coordinates parsing, cleaning, chunking, embedding, and indexing of documents."""
    
    def __init__(
        self,
        repository: IDocumentRepository,
        storage_service: IFileStorageService,
        embedding_service: IEmbeddingService,
        preprocessor: ITextPreprocessor
    ):
        self.repository = repository
        self.storage_service = storage_service
        self.embedding_service = embedding_service
        self.preprocessor = preprocessor
        self.parser_factory = DocumentParserFactory()

    async def process_document(self, document_id: uuid.UUID, config: Optional[PreprocessingConfig] = None) -> None:
        """Parses the document, processes it through the pipeline, generates embeddings, and saves chunks."""
        # 1. Fetch document metadata
        doc = await self.repository.get_by_id(document_id)
        if not doc:
            logger.error(f"Document {document_id} not found in repository.")
            return

        # 2. Update status to PROCESSING
        await self.repository.update_status(document_id, DocumentStatus.PROCESSING)
        logger.info(f"Started processing document {doc.name} (ID: {document_id})")

        temp_path = None
        try:
            # 3. Download file from storage
            file_bytes = await self.storage_service.download_file(doc.storage_path)
            
            # Write to a temporary file for the parser to read
            import tempfile
            _, ext = os.path.splitext(doc.name)
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(file_bytes)
                temp_path = tmp.name

            # 4. Resolve parser and parse document
            parser = self.parser_factory.get_parser(doc.file_type)
            parsed_result = parser.parse(temp_path)

            # 5. Run text preprocessing pipeline (clean + chunk)
            chunks = await self.preprocessor.preprocess(parsed_result, document_id, config)
            
            if chunks:
                # 6. Generate embeddings in batch for all chunks
                chunk_contents = [c.content for c in chunks]
                embeddings = await self.embedding_service.generate_embeddings_batch(chunk_contents)
                
                # Assign embeddings, collection_id and page_number to chunks
                for idx, chunk in enumerate(chunks):
                    chunk.embedding = embeddings[idx]
                    chunk.collection_id = doc.organization_id
                    chunk.page_number = chunk.metadata.get("page_start")

                # 7. Bulk save chunks to database
                await self.repository.bulk_save_chunks(chunks)

            # 8. Update status to COMPLETED
            await self.repository.update_status(document_id, DocumentStatus.COMPLETED)
            logger.info(f"Successfully processed document {doc.name} (Chunks: {len(chunks)})")

        except Exception as e:
            logger.error(f"Failed to process document {doc.name}: {e}", exc_info=True)
            # Update status to FAILED
            await self.repository.update_status(document_id, DocumentStatus.FAILED)
            raise
        finally:
            # Clean up temp file
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as cleanup_err:
                    logger.warning(f"Failed to clean up temp file {temp_path}: {cleanup_err}")
