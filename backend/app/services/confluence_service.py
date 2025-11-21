import os
import base64
from typing import Optional, Dict
import requests
from fastapi import UploadFile, HTTPException
from app.core.config import settings

class ConfluenceService:
    def __init__(self):
        self.confluence_url = settings.CONFLUENCE_URL
        self.email = settings.CONFLUENCE_EMAIL
        self.api_token = settings.CONFLUENCE_API_TOKEN
        self.space_key = settings.CONFLUENCE_SPACE_KEY
        self.page_id = settings.CONFLUENCE_PAGE_ID
        self.session = None
        self._setup_session()
    
    def _setup_session(self):
        """Setup requests session with authentication"""
        if not self.confluence_url or not self.email or not self.api_token:
            print("Warning: Confluence credentials not configured")
            return
        
        self.session = requests.Session()
        auth_string = f"{self.email}:{self.api_token}"
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
        
        self.session.headers.update({
            'Authorization': f'Basic {auth_b64}',
            'Accept': 'application/json',
            'X-Atlassian-Token': 'no-check'  # Required for file uploads
        })
    
    async def upload_file(self, file: UploadFile, page_id: Optional[str] = None) -> Dict[str, str]:
        """
        Upload a file as an attachment to a Confluence page
        
        Args:
            file: FastAPI UploadFile object
            page_id: Optional page ID (defaults to configured page)
            
        Returns:
            Dict containing attachment details
        """
        if not self.session:
            raise HTTPException(status_code=503, detail="Confluence service not configured")
        
        target_page_id = page_id or self.page_id
        if not target_page_id:
            raise HTTPException(status_code=500, detail="Confluence page ID not configured")
        
        try:
            # Prepare the file for upload
            file_content = await file.read()
            await file.seek(0)  # Reset file pointer
            
            # Upload attachment to Confluence page
            upload_url = f"{self.confluence_url}/rest/api/content/{target_page_id}/child/attachment"
            
            files = {
                'file': (file.filename, file_content, file.content_type)
            }
            
            # Check if attachment with same name already exists
            check_url = f"{self.confluence_url}/rest/api/content/{target_page_id}/child/attachment"
            check_params = {
                'filename': file.filename,
                'expand': 'version'
            }
            
            existing_response = self.session.get(check_url, params=check_params)
            
            if existing_response.status_code == 200:
                existing_data = existing_response.json()
                
                # If file exists, update it
                if existing_data.get('results') and len(existing_data['results']) > 0:
                    attachment_id = existing_data['results'][0]['id']
                    # To update an attachment, we POST to the page's attachment endpoint 
                    # with the attachment ID as a query parameter
                    update_url = f"{self.confluence_url}/rest/api/content/{target_page_id}/child/attachment/{attachment_id}/data"
                    
                    response = self.session.post(
                        update_url,
                        files=files,
                        headers={'X-Atlassian-Token': 'no-check'}
                    )
                else:
                    # Create new attachment
                    response = self.session.post(
                        upload_url,
                        files=files,
                        headers={'X-Atlassian-Token': 'no-check'}
                    )
            else:
                # Create new attachment
                response = self.session.post(
                    upload_url,
                    files=files,
                    headers={'X-Atlassian-Token': 'no-check'}
                )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to upload to Confluence: {response.text}"
                )
            
            result = response.json()
            
            # Extract attachment details from response
            if 'results' in result:
                attachment = result['results'][0]
            else:
                attachment = result
            
            # Build the download URL
            download_path = attachment.get('_links', {}).get('download', '')
            download_url = f"{self.confluence_url}{download_path}" if download_path else ""
            
            # Build the view URL
            view_path = attachment.get('_links', {}).get('webui', '')
            view_url = f"{self.confluence_url}{view_path}" if view_path else ""
            
            return {
                'id': attachment.get('id'),
                'name': file.filename,
                'view_link': view_url,
                'download_link': download_url,
                'mime_type': attachment.get('metadata', {}).get('mediaType', file.content_type),
                'size': attachment.get('extensions', {}).get('fileSize', 0)
            }
            
        except requests.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file to Confluence: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error uploading to Confluence: {str(e)}")
    
    def verify_page_access(self, page_id: Optional[str] = None) -> bool:
        """
        Verify that we can access the specified Confluence page
        
        Args:
            page_id: Optional page ID to verify (defaults to configured page)
            
        Returns:
            True if page is accessible, False otherwise
        """
        if not self.session:
            return False
        
        target_page_id = page_id or self.page_id
        if not target_page_id:
            return False
        
        try:
            url = f"{self.confluence_url}/rest/api/content/{target_page_id}"
            response = self.session.get(url, params={'expand': 'space,version'})
            
            if response.status_code == 200:
                page = response.json()
                print(f"✓ Successfully verified access to Confluence page: {page.get('title')} (ID: {target_page_id})")
                print(f"  Space: {page.get('space', {}).get('name')}")
                return True
            else:
                print(f"✗ Cannot access Confluence page {target_page_id}: Status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Error verifying Confluence page access: {str(e)}")
            return False

# Singleton instance
confluence_service = ConfluenceService()
