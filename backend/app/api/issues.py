from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Issue, Module, Release, User
from app.schemas.schemas import Issue as IssueSchema, IssueCreate, IssueUpdate, IssueStats
from app.api.auth import get_current_active_user
from app.services.file_storage import file_storage
from app.services.jira_service import jira_service
from fastapi import UploadFile, File, Form
import json
import requests

router = APIRouter()

@router.get("/", response_model=List[IssueSchema])
def list_issues(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    module_id: Optional[int] = None,
    release_id: Optional[int] = None,
    jira_story_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Issue)
    
    if status:
        query = query.filter(Issue.status == status)
    if module_id:
        query = query.filter(Issue.module_id == module_id)
    if release_id:
        query = query.filter(Issue.release_id == release_id)
    if jira_story_id:
        query = query.filter(Issue.jira_story_id == jira_story_id)
        
    issues = query.order_by(Issue.created_at.desc()).offset(skip).limit(limit).all()
    return issues

@router.post("/", response_model=IssueSchema, status_code=status.HTTP_201_CREATED)
def create_issue(
    issue: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_issue = Issue(**issue.dict(), created_by=current_user.id)
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    return db_issue

@router.get("/stats", response_model=List[IssueStats])
def get_issue_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get stats per module
    modules = db.query(Module).all()
    stats = []
    
    for module in modules:
        total = db.query(Issue).filter(Issue.module_id == module.id).count()
        open_issues = db.query(Issue).filter(
            Issue.module_id == module.id, 
            Issue.status.in_(["Open", "In Progress"])
        ).count()
        closed_issues = db.query(Issue).filter(
            Issue.module_id == module.id, 
            Issue.status.in_(["Closed", "Resolved"])
        ).count()
        
        stats.append(IssueStats(
            module_id=module.id,
            module_name=module.name,
            total_issues=total,
            open_issues=open_issues,
            closed_issues=closed_issues
        ))
        
    return stats

@router.get("/jira-users/search")
def search_jira_users(
    query: str = "",
    current_user: User = Depends(get_current_active_user)
):
    """
    Search for users in JIRA to use as assignees
    If no query provided, returns all users (up to 50)
    """
    try:
        # If no query, use empty string to get all users
        search_query = query if query else ""
        users = jira_service.search_users(search_query)
        return users
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch JIRA users: {str(e)}")

@router.get("/{issue_id}", response_model=IssueSchema)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@router.put("/{issue_id}", response_model=IssueSchema)
def update_issue(
    issue_id: int,
    issue_update: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    update_data = issue_update.dict(exclude_unset=True)
    
    # Handle status change to Closed/Resolved
    if "status" in update_data:
        if update_data["status"] in ["Closed", "Resolved"] and db_issue.status not in ["Closed", "Resolved"]:
            db_issue.closed_at = datetime.utcnow()
        elif update_data["status"] in ["Open", "In Progress"] and db_issue.status in ["Closed", "Resolved"]:
            db_issue.closed_at = None
            
    for key, value in update_data.items():
        setattr(db_issue, key, value)
        
    db.commit()
    db.refresh(db_issue)
    return db_issue

@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Delete associated media files from storage before deleting the issue
    deleted_files = []
    failed_files = []
    
    # Delete video if exists
    if db_issue.video_url:
        try:
            success = await file_storage.delete_file(db_issue.video_url)
            if success:
                deleted_files.append(db_issue.video_url)
            else:
                failed_files.append(db_issue.video_url)
        except Exception as e:
            print(f"Error deleting video file: {e}")
            failed_files.append(db_issue.video_url)
    
    # Delete screenshots if exist
    if db_issue.screenshot_urls:
        try:
            # Parse screenshot URLs (newline separated)
            screenshot_list = db_issue.screenshot_urls.split('\n')
            screenshot_list = [url.strip() for url in screenshot_list if url.strip()]
            
            for screenshot_url in screenshot_list:
                try:
                    success = await file_storage.delete_file(screenshot_url)
                    if success:
                        deleted_files.append(screenshot_url)
                    else:
                        failed_files.append(screenshot_url)
                except Exception as e:
                    print(f"Error deleting screenshot file: {e}")
                    failed_files.append(screenshot_url)
        except Exception as e:
            print(f"Error processing screenshot URLs: {e}")
    
    # Log deletion results
    if deleted_files:
        print(f"✓ Deleted {len(deleted_files)} media file(s) for issue {issue_id}")
    if failed_files:
        print(f"⚠ Failed to delete {len(failed_files)} media file(s) for issue {issue_id}")
        # We continue with issue deletion even if some files failed to delete
    
    # Delete the issue from database
    db.delete(db_issue)
    db.commit()
    return None

@router.post("/{issue_id}/upload", response_model=IssueSchema)
async def upload_media(
    issue_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload media files (screenshots/videos) to an issue"""
    db_issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    uploaded_files = []
    
    for file in files:
        try:
            result = await file_storage.upload_file(file)
            uploaded_files.append(result)
        except Exception as e:
            print(f"Error uploading file {file.filename}: {e}")
            # Continue with other files or raise error? 
            # For now, we'll continue and report what succeeded
            
    if not uploaded_files:
        raise HTTPException(status_code=500, detail="Failed to upload any files")

    # Update issue records
    # We store links as JSON strings or append to existing text
    # Structure: video_url for video, screenshot_urls for images
    
    current_screenshots = []
    if db_issue.screenshot_urls:
        # Try to parse as JSON first, if fails treat as newline separated
        try:
            current_screenshots = json.loads(db_issue.screenshot_urls)
            if not isinstance(current_screenshots, list):
                current_screenshots = [db_issue.screenshot_urls]
        except:
            current_screenshots = db_issue.screenshot_urls.split('\n') if db_issue.screenshot_urls else []

    # Clean up empty strings
    current_screenshots = [s for s in current_screenshots if s]

    for file_data in uploaded_files:
        # Check mime type to decide where to put it
        mime_type = file_data.get('mime_type', '')
        # Use download_link for direct access, falls back to view_link if not available
        link = file_data.get('download_link') or file_data.get('view_link')
        
        if 'video' in mime_type:
            # For video, we only support one main video_url for now in the model, 
            # or we can treat it as a list if we change the model. 
            # The model has `video_url` (String). So we overwrite or maybe we should have used a list.
            # Let's overwrite for now as per "upload video" singular request implies.
            db_issue.video_url = link
        else:
            # Assume image/screenshot
            current_screenshots.append(link)
    
    # Save back screenshots as newline separated string (to maintain backward compatibility with text field)
    # OR better, save as JSON if we want to store more metadata later.
    # The current frontend expects newline separated string for editing, but we are changing UI.
    # Let's stick to newline separated for now to be safe with existing model/frontend logic,
    # or switch to JSON if we update frontend to handle it.
    # The plan said "UI should fetch... from google drive". 
    # If we store just the link, we can render it.
    
    db_issue.screenshot_urls = '\n'.join(current_screenshots)
    
    db.commit()
    db.refresh(db_issue)
    return db_issue

@router.get("/{issue_id}/media-proxy")
async def proxy_media(
    issue_id: int,
    url: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Proxy media files from Confluence/Drive with authentication
    This allows the frontend to display media without exposing credentials
    """
    from fastapi.responses import StreamingResponse
    import requests
    from app.core.config import settings
    import base64
    
    # Verify issue exists and user has access
    db_issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not db_issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    try:
        print(f"Proxying media for issue {issue_id}, URL: {url}")
        
        # Determine if it's a Confluence URL
        if settings.CONFLUENCE_URL and 'atlassian.net' in url:
            # Fetch from Confluence with authentication
            auth_string = f"{settings.CONFLUENCE_EMAIL}:{settings.CONFLUENCE_API_TOKEN}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            headers = {
                'Authorization': f'Basic {auth_b64}',
                'Accept': '*/*'
            }
            
            print(f"Fetching from Confluence: {url}")
            
            # Confluence attachment URLs can be in different formats:
            # 1. Direct download: /wiki/download/attachments/...
            # 2. View page attachments: /wiki/pages/viewpageattachments.action?...
            # We need to handle the view page format and extract the actual download URL
            
            response = requests.get(url, headers=headers, stream=True, timeout=30, allow_redirects=True)
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                error_msg = f"Failed to fetch media from Confluence. Status: {response.status_code}"
                print(error_msg)
                raise HTTPException(status_code=response.status_code, detail=error_msg)
            
            # Get content type
            content_type = response.headers.get('content-type', 'application/octet-stream')
            
            # Stream the content
            return StreamingResponse(
                response.iter_content(chunk_size=8192),
                media_type=content_type,
                headers={
                    'Cache-Control': 'public, max-age=3600',
                    'Content-Disposition': response.headers.get('content-disposition', ''),
                    'Access-Control-Allow-Origin': '*'
                }
            )
        else:
            # For Google Drive or other public URLs, redirect
            print(f"Non-Confluence URL, redirecting: {url}")
            return {"redirect_url": url}
            
    except requests.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        error_msg = f"Failed to proxy media: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
