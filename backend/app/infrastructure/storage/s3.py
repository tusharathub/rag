import boto3
import asyncio
import logging
from typing import BinaryIO
from botocore.exceptions import ClientError
from app.interfaces.storage.storage import IFileStorageService
from app.core.config import settings

logger = logging.getLogger(__name__)


class S3FileStorageService(IFileStorageService):
    """S3 storage implementation for managing uploaded files."""
    
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    async def upload_file(self, file_data: BinaryIO, storage_path: str) -> str:
        """Uploads binary file to S3 bucket.
        
        Returns:
            The fully qualified S3 URI (s3://bucket/path)
        """
        # Ensure pointer is at the beginning
        try:
            file_data.seek(0)
        except Exception:
            pass

        def _upload():
            if not self.bucket_name:
                raise ValueError("S3_BUCKET_NAME configuration is missing.")
            self.s3_client.upload_fileobj(
                file_data, 
                self.bucket_name, 
                storage_path
            )
            return f"s3://{self.bucket_name}/{storage_path}"

        return await asyncio.to_thread(_upload)

    async def download_file(self, storage_path: str) -> bytes:
        """Downloads/Retrieves file bytes from S3."""
        def _download():
            if not self.bucket_name:
                raise ValueError("S3_BUCKET_NAME configuration is missing.")
            response = self.s3_client.get_object(
                Bucket=self.bucket_name, 
                Key=storage_path
            )
            return response["Body"].read()

        return await asyncio.to_thread(_download)

    async def delete_file(self, storage_path: str) -> bool:
        """Removes the file from S3."""
        def _delete():
            if not self.bucket_name:
                raise ValueError("S3_BUCKET_NAME configuration is missing.")
            try:
                self.s3_client.delete_object(
                    Bucket=self.bucket_name, 
                    Key=storage_path
                )
                return True
            except ClientError as e:
                logger.error(f"S3 deletion failed for {storage_path}: {e}")
                return False

        return await asyncio.to_thread(_delete)
