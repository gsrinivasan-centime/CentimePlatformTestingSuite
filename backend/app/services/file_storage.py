"""
Unified file storage service that supports multiple backends
"""
from typing import Dict
from fastapi import UploadFile
from app.core.config import settings
from app.services.drive_service import drive_service
from app.services.confluence_service import confluence_service

class FileStorageService:
    """
    Unified interface for file storage that can use different backends
    """
    
    def __init__(self):
        self.backend = settings.FILE_STORAGE_BACKEND
    
    async def upload_file(self, file: UploadFile) -> Dict[str, str]:
        """
        Upload a file using the configured backend
        
        Args:
            file: FastAPI UploadFile object
            
        Returns:
            Dict containing file metadata (id, name, view_link, download_link, etc.)
        """
        if self.backend == "confluence":
            return await confluence_service.upload_file(file)
        elif self.backend == "google_drive":
            return await drive_service.upload_file(file)
        else:
            raise ValueError(f"Unknown storage backend: {self.backend}")
    
    def verify_access(self) -> bool:
        """
        Verify access to the configured storage backend
        
        Returns:
            True if access is verified, False otherwise
        """
        if self.backend == "confluence":
            return confluence_service.verify_page_access()
        elif self.backend == "google_drive":
            return drive_service.verify_folder_access()
        else:
            return False
    
    def get_backend_name(self) -> str:
        """Get the name of the current storage backend"""
        return self.backend

# Singleton instance
file_storage = FileStorageService()
