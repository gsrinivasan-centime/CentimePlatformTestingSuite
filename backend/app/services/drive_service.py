import os
import json
from typing import Optional, Dict, List
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/drive.file']

class DriveService:
    def __init__(self):
        self.creds = None
        self.service = None
        self.folder_id = os.getenv('GOOGLE_DRIVE_FOLDER_ID')
        self._authenticate()

    def _authenticate(self):
        """Authenticate with Google Drive API using Service Account"""
        creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        
        if not creds_path or not os.path.exists(creds_path):
            print("Warning: GOOGLE_APPLICATION_CREDENTIALS not set or file not found.")
            return

        try:
            self.creds = Credentials.from_service_account_file(
                creds_path, scopes=SCOPES)
            self.service = build('drive', 'v3', credentials=self.creds)
        except Exception as e:
            print(f"Error authenticating with Google Drive: {e}")

    async def upload_file(self, file: UploadFile, folder_id: Optional[str] = None) -> Dict[str, str]:
        """
        Upload a file to Google Drive
        
        Args:
            file: FastAPI UploadFile object
            folder_id: Optional folder ID to upload to (defaults to env var)
            
        Returns:
            Dict containing 'id', 'web_view_link', 'web_content_link', 'thumbnail_link'
        """
        if not self.service:
            raise HTTPException(status_code=503, detail="Google Drive service not configured")

        target_folder_id = folder_id or self.folder_id
        if not target_folder_id:
             raise HTTPException(status_code=500, detail="Google Drive folder ID not configured")

        try:
            file_metadata = {
                'name': file.filename,
                'parents': [target_folder_id]
            }
            
            # Create media object
            media = MediaIoBaseUpload(
                file.file,
                mimetype=file.content_type,
                resumable=True
            )
            
            # Execute upload (with Shared Drive support)
            file_obj = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, webViewLink, webContentLink, thumbnailLink, mimeType',
                supportsAllDrives=True  # Support both regular drives and Shared Drives
            ).execute()
            
            # Make file readable to anyone with the link (optional, depends on privacy requirements)
            # For internal tools, usually we want this or specific permissions
            try:
                self.service.permissions().create(
                    fileId=file_obj.get('id'),
                    body={'type': 'anyone', 'role': 'reader'},
                    fields='id',
                    supportsAllDrives=True  # Support both regular drives and Shared Drives
                ).execute()
            except Exception as e:
                print(f"Warning: Could not set public permission: {e}")

            return {
                'id': file_obj.get('id'),
                'name': file.filename,
                'view_link': file_obj.get('webViewLink'),
                'download_link': file_obj.get('webContentLink'),
                'thumbnail_link': file_obj.get('thumbnailLink'),
                'mime_type': file_obj.get('mimeType')
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file to Drive: {str(e)}")
    
    def verify_folder_access(self, folder_id: Optional[str] = None) -> bool:
        """
        Verify that the service account has access to the specified folder
        
        Args:
            folder_id: Optional folder ID to verify (defaults to env var)
            
        Returns:
            True if folder is accessible, False otherwise
        """
        if not self.service:
            return False
            
        target_folder_id = folder_id or self.folder_id
        if not target_folder_id:
            return False
            
        try:
            # Try to get folder metadata
            folder = self.service.files().get(
                fileId=target_folder_id,
                fields='id, name, mimeType',
                supportsAllDrives=True
            ).execute()
            
            print(f"✓ Successfully verified access to folder: {folder.get('name')} ({target_folder_id})")
            return True
        except Exception as e:
            print(f"✗ Cannot access folder {target_folder_id}: {str(e)}")
            return False

# Singleton instance
drive_service = DriveService()
