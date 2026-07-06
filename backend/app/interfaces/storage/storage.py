from abc import ABC, abstractmethod
from typing import BinaryIO


class IFileStorageService(ABC):
    @abstractmethod
    async def upload_file(self, file_data: BinaryIO, storage_path: str) -> str:
        """Uploads binary file to the storage medium (local filesystem or S3).
        
        Returns:
            The fully qualified file path or bucket URI.
        """
        pass

    @abstractmethod
    async def download_file(self, storage_path: str) -> bytes:
        """Downloads/Retrieves file bytes from storage."""
        pass

    @abstractmethod
    async def delete_file(self, storage_path: str) -> bool:
        """Removes the file from storage."""
        pass
