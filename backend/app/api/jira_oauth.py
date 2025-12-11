"""
JIRA OAuth API Endpoints
Handles OAuth flow for user-specific JIRA authentication
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import secrets
import logging

from app.core.database import get_db
from app.core.config import settings
from app.api.auth import get_current_user
from app.models.models import User
from app.services.jira_oauth_service import jira_oauth_service
from app.services.token_encryption import token_encryption_service

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory state storage (for CSRF protection)
# In production, use Redis or database
oauth_states = {}


@router.get("/status")
async def get_jira_connection_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get the current user's JIRA connection status
    
    Returns connection status, account info if connected
    """
    if not jira_oauth_service.is_configured:
        return {
            "configured": False,
            "connected": False,
            "message": "JIRA OAuth is not configured on the server"
        }
    
    if not current_user.jira_access_token:
        return {
            "configured": True,
            "connected": False,
            "message": "Not connected to JIRA"
        }
    
    # Check if token is expired
    is_expired = False
    if current_user.jira_token_expires_at:
        is_expired = datetime.utcnow() >= current_user.jira_token_expires_at
    
    return {
        "configured": True,
        "connected": True,
        "expired": is_expired,
        "account_id": current_user.jira_account_id,
        "email": current_user.jira_account_email,
        "display_name": current_user.jira_display_name,
        "cloud_id": current_user.jira_cloud_id,
        "expires_at": current_user.jira_token_expires_at.isoformat() if current_user.jira_token_expires_at else None
    }


@router.get("/connect")
async def initiate_jira_connection(
    current_user: User = Depends(get_current_user)
):
    """
    Initiate the JIRA OAuth flow
    
    Returns the authorization URL to redirect the user to
    """
    if not jira_oauth_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="JIRA OAuth is not configured. Please contact administrator."
        )
    
    # Generate state token for CSRF protection
    state = jira_oauth_service.generate_state_token()
    
    # Store state with user ID (expires in 10 minutes)
    oauth_states[state] = {
        "user_id": current_user.id,
        "created_at": datetime.utcnow()
    }
    
    # Clean up old states (older than 10 minutes)
    current_time = datetime.utcnow()
    expired_states = [
        s for s, data in oauth_states.items() 
        if (current_time - data["created_at"]).total_seconds() > 600
    ]
    for s in expired_states:
        del oauth_states[s]
    
    auth_url = jira_oauth_service.generate_auth_url(state)
    
    return {
        "auth_url": auth_url,
        "state": state
    }


@router.get("/callback")
async def jira_oauth_callback(
    code: str = Query(..., description="Authorization code from Atlassian"),
    state: str = Query(..., description="State token for CSRF verification"),
    db: Session = Depends(get_db)
):
    """
    Handle the OAuth callback from Atlassian
    
    Exchanges code for tokens and stores them encrypted
    Redirects to frontend with success/error status
    """
    frontend_url = settings.FRONTEND_URL
    
    # Verify state token
    if state not in oauth_states:
        logger.warning(f"Invalid OAuth state: {state}")
        return RedirectResponse(
            url=f"{frontend_url}/jira/callback?error=invalid_state&message=Invalid%20or%20expired%20state%20token"
        )
    
    state_data = oauth_states.pop(state)
    user_id = state_data["user_id"]
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logger.error(f"User not found: {user_id}")
        return RedirectResponse(
            url=f"{frontend_url}/jira/callback?error=user_not_found&message=User%20not%20found"
        )
    
    try:
        # Exchange code for tokens
        token_data = jira_oauth_service.exchange_code_for_tokens(code)
        access_token = token_data["access_token"]
        
        # Get accessible JIRA sites
        resources = jira_oauth_service.get_accessible_resources(access_token)
        
        if not resources:
            logger.error("No accessible JIRA sites found")
            return RedirectResponse(
                url=f"{frontend_url}/jira/callback?error=no_sites&message=No%20accessible%20JIRA%20sites%20found"
            )
        
        # Use the first accessible site (or the one matching JIRA_SERVER if configured)
        cloud_id = resources[0]["id"]
        site_url = resources[0].get("url", "")
        
        # Try to find the site matching our JIRA_SERVER
        if settings.JIRA_SERVER:
            for resource in resources:
                if settings.JIRA_SERVER in resource.get("url", ""):
                    cloud_id = resource["id"]
                    site_url = resource["url"]
                    break
        
        # Get user info
        user_info = jira_oauth_service.get_current_user(access_token)
        
        # Store tokens and info
        jira_oauth_service.store_user_tokens(
            user=user,
            db=db,
            token_data=token_data,
            cloud_id=cloud_id,
            user_info=user_info
        )
        
        logger.info(f"Successfully connected JIRA for user {user.id}")
        
        # Redirect to frontend with success
        display_name = user_info.get("name", "Unknown")
        return RedirectResponse(
            url=f"{frontend_url}/jira/callback?success=true&name={display_name}&site={site_url}"
        )
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        error_msg = str(e).replace(" ", "%20")[:200]  # Limit error message length
        return RedirectResponse(
            url=f"{frontend_url}/jira/callback?error=auth_failed&message={error_msg}"
        )


@router.delete("/disconnect")
async def disconnect_jira(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect user's JIRA account
    
    Clears all stored OAuth tokens and account info
    """
    if not current_user.jira_access_token:
        raise HTTPException(
            status_code=400,
            detail="No JIRA account connected"
        )
    
    jira_oauth_service.clear_user_tokens(current_user, db)
    
    return {
        "success": True,
        "message": "JIRA account disconnected successfully"
    }


@router.post("/refresh")
async def refresh_jira_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually refresh the JIRA access token
    
    Useful for testing or when automatic refresh fails
    """
    if not current_user.jira_access_token:
        raise HTTPException(
            status_code=400,
            detail="No JIRA account connected"
        )
    
    try:
        # This will refresh the token if needed
        access_token = jira_oauth_service.ensure_valid_token(current_user, db)
        
        return {
            "success": True,
            "message": "Token is valid",
            "expires_at": current_user.jira_token_expires_at.isoformat() if current_user.jira_token_expires_at else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )
