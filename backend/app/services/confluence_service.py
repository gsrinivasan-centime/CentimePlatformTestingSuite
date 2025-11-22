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
    
    async def delete_file(self, file_url: str) -> bool:
        """
        Delete a file attachment from Confluence
        
        Args:
            file_url: The download URL or view URL of the attachment
            
        Returns:
            True if deletion was successful, False otherwise
        """
        if not self.session:
            print("Warning: Confluence service not configured")
            return False
        
        try:
            # Extract attachment ID from URL
            # URL format: https://domain.atlassian.net/wiki/download/attachments/PAGE_ID/filename
            # or: https://domain.atlassian.net/wiki/rest/api/content/ATTACHMENT_ID
            
            attachment_id = None
            
            # Try to extract ID from different URL patterns
            if '/rest/api/content/' in file_url:
                # Direct content API URL
                parts = file_url.split('/rest/api/content/')
                if len(parts) > 1:
                    attachment_id = parts[1].split('/')[0].split('?')[0]
            elif '/download/attachments/' in file_url or '/attachments/' in file_url:
                # Download URL - need to find attachment by filename and page
                # This requires querying the page's attachments
                # For now, we'll skip this pattern and handle it differently
                print(f"Warning: Cannot extract attachment ID from URL: {file_url}")
                return False
            
            if not attachment_id:
                print(f"Warning: Could not extract attachment ID from URL: {file_url}")
                return False
            
            # Delete the attachment
            delete_url = f"{self.confluence_url}/rest/api/content/{attachment_id}"
            response = self.session.delete(delete_url)
            
            if response.status_code in [200, 204]:
                print(f"✓ Successfully deleted attachment {attachment_id}")
                return True
            else:
                print(f"✗ Failed to delete attachment {attachment_id}: Status {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ Error deleting file from Confluence: {str(e)}")
            return False
    
    async def delete_file_by_name(self, filename: str, page_id: Optional[str] = None) -> bool:
        """
        Delete a file attachment from Confluence by filename
        
        Args:
            filename: Name of the file to delete
            page_id: Optional page ID (defaults to configured page)
            
        Returns:
            True if deletion was successful, False otherwise
        """
        if not self.session:
            print("Warning: Confluence service not configured")
            return False
        
        target_page_id = page_id or self.page_id
        if not target_page_id:
            print("Warning: No page ID configured")
            return False
        
        try:
            # Find the attachment by filename
            check_url = f"{self.confluence_url}/rest/api/content/{target_page_id}/child/attachment"
            check_params = {
                'filename': filename,
                'expand': 'version'
            }
            
            response = self.session.get(check_url, params=check_params)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('results') and len(data['results']) > 0:
                    attachment_id = data['results'][0]['id']
                    
                    # Delete the attachment
                    delete_url = f"{self.confluence_url}/rest/api/content/{attachment_id}"
                    delete_response = self.session.delete(delete_url)
                    
                    if delete_response.status_code in [200, 204]:
                        print(f"✓ Successfully deleted attachment '{filename}' (ID: {attachment_id})")
                        return True
                    else:
                        print(f"✗ Failed to delete attachment '{filename}': Status {delete_response.status_code}")
                        return False
                else:
                    print(f"Warning: Attachment '{filename}' not found on page {target_page_id}")
                    return False
            else:
                print(f"✗ Failed to query attachments: Status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Error deleting file from Confluence: {str(e)}")
            return False
    
    def upload_feature_file(self, filename: str, content: str, page_id: Optional[str] = None) -> Dict[str, str]:
        """
        Upload a feature file (text content) to Confluence
        
        Args:
            filename: Name of the feature file (should end with .feature)
            content: Content of the feature file
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
            # Ensure filename ends with .feature
            if not filename.endswith('.feature'):
                filename = f"{filename}.feature"
            
            # Convert content to bytes
            content_bytes = content.encode('utf-8')
            
            # Upload attachment to Confluence page
            upload_url = f"{self.confluence_url}/rest/api/content/{target_page_id}/child/attachment"
            
            files = {
                'file': (filename, content_bytes, 'text/plain')
            }
            
            # Check if attachment with same name already exists
            check_url = f"{self.confluence_url}/rest/api/content/{target_page_id}/child/attachment"
            check_params = {
                'filename': filename,
                'expand': 'version'
            }
            
            existing_response = self.session.get(check_url, params=check_params)
            
            if existing_response.status_code == 200:
                existing_data = existing_response.json()
                
                # If file exists, update it
                if existing_data.get('results') and len(existing_data['results']) > 0:
                    attachment_id = existing_data['results'][0]['id']
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
                    detail=f"Failed to upload feature file to Confluence: {response.text}"
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
                'name': filename,
                'view_link': view_url,
                'download_link': download_url,
                'confluence_attachment_id': attachment.get('id'),
                'confluence_page_id': target_page_id
            }
            
        except requests.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload feature file to Confluence: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error uploading feature file to Confluence: {str(e)}")

# Singleton instance
confluence_service = ConfluenceService()
