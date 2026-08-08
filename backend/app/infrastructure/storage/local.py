import os
import shutil
from typing import BinaryIO
from app.interfaces.storage.storage import IFileStorageService
from app.core.config import settings


class LocalFileStorageService(IFileStorageService):
    """Local filesystem storage implementation for managing uploaded files."""
    
    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_full_path(self, storage_path: str) -> str:
        # Prevent directory traversal attacks
        normalized_path = os.path.normpath(storage_path).lstrip("/\\")
        # Ensure we construct the path starting from base_dir
        full_path = os.path.normpath(os.path.join(self.base_dir, normalized_path))
        if not full_path.startswith(self.base_dir):
            raise ValueError(f"Path traversal attempt detected: {storage_path}")
        return full_path

    async def upload_file(self, file_data: BinaryIO, storage_path: str) -> str:
        """Uploads binary file to the local directory.
        
        Returns:
            The absolute file path on disk.
        """
        full_path = self._get_full_path(storage_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Make sure we seek to the start of the file in case it was read earlier
        try:
            file_data.seek(0)
        except Exception:
            pass
            
        with open(full_path, "wb") as f:
            shutil.copyfileobj(file_data, f)
            
        return full_path

    async def download_file(self, storage_path: str) -> bytes:
        """Downloads/Retrieves file bytes from local disk."""
        full_path = self._get_full_path(storage_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {storage_path}")
            
        with open(full_path, "rb") as f:
            return f.read()

    async def delete_file(self, storage_path: str) -> bool:
        """Removes the file from local disk."""
        try:
            full_path = self._get_full_path(storage_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
            return False
        except Exception:
            return False
