"""
Slack OAuth API Endpoints

Handles Slack OAuth flow for user authentication and messaging.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import secrets
import json

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, ApplicationSetting
from app.api.auth import get_current_active_user, get_current_super_admin
from app.services.slack_oauth_service import slack_oauth_service

router = APIRouter()

# In-memory storage for OAuth states (with expiry)
# In production, consider using Redis or database
oauth_states: Dict[str, Dict[str, Any]] = {}
STATE_EXPIRY_MINUTES = 10


def cleanup_expired_states():
    """Remove expired OAuth states"""
    now = datetime.utcnow()
    expired = [
        state for state, data in oauth_states.items()
        if now - data["created_at"] > timedelta(minutes=STATE_EXPIRY_MINUTES)
    ]
    for state in expired:
        del oauth_states[state]


# Pydantic models
class SlackStatusResponse(BaseModel):
    connected: bool
    configured: bool
    user_id: Optional[str] = None
    display_name: Optional[str] = None


class SlackConnectResponse(BaseModel):
    auth_url: str


class SlackWorkspaceResponse(BaseModel):
    workspace_id: str
    workspace_name: str


class SlackWorkspaceUpdate(BaseModel):
    workspace_id: str
    workspace_name: str


class SlackUserResponse(BaseModel):
    id: str
    name: str
    real_name: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar: Optional[str] = None


class SendDMRequest(BaseModel):
    recipient_slack_ids: List[str]  # Can be single or multiple recipients for group DM
    message: str
    send_as_user: bool = True  # True = send as user, False = send via bot
    ticket_key: Optional[str] = None  # Optional ticket reference


class SendDMResponse(BaseModel):
    success: bool
    message: str
    sent_as: str  # "user" or "bot"


# === Status Endpoints ===

@router.get("/status", response_model=SlackStatusResponse)
def get_slack_status(
    current_user: User = Depends(get_current_active_user)
):
    """Check if current user has connected their Slack account"""
    return {
        "connected": slack_oauth_service.is_user_connected(current_user),
        "configured": slack_oauth_service.is_configured,
        "user_id": current_user.slack_user_id,
        "display_name": current_user.slack_display_name
    }


# === OAuth Flow Endpoints ===

@router.get("/connect", response_model=SlackConnectResponse)
def initiate_slack_connect(
    current_user: User = Depends(get_current_active_user)
):
    """
    Initiate Slack OAuth flow.
    Returns the authorization URL to redirect the user to.
    """
    if not slack_oauth_service.is_configured:
        raise HTTPException(
            status_code=400,
            detail="Slack OAuth is not configured on the server"
        )
    
    # Cleanup expired states
    cleanup_expired_states()
    
    # Generate a secure state parameter
    state = secrets.token_urlsafe(32)
    
    # Store state with user ID for validation in callback
    oauth_states[state] = {
        "user_id": current_user.id,
        "created_at": datetime.utcnow()
    }
    
    auth_url = slack_oauth_service.get_authorization_url(state)
    
    return {"auth_url": auth_url}


@router.get("/callback")
def slack_oauth_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handle Slack OAuth callback.
    Exchanges code for token and stores it for the user.
    Redirects to frontend callback page.
    """
    frontend_callback_url = f"{settings.FRONTEND_URL}/slack/callback"
    
    # Handle error from Slack
    if error:
        return RedirectResponse(
            url=f"{frontend_callback_url}?success=false&error={error}"
        )
    
    # Validate required parameters
    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_callback_url}?success=false&error=missing_params"
        )
    
    # Validate state
    state_data = oauth_states.pop(state, None)
    if not state_data:
        return RedirectResponse(
            url=f"{frontend_callback_url}?success=false&error=invalid_state"
        )
    
    # Check state expiry
    if datetime.utcnow() - state_data["created_at"] > timedelta(minutes=STATE_EXPIRY_MINUTES):
        return RedirectResponse(
            url=f"{frontend_callback_url}?success=false&error=state_expired"
        )
    
    # Get the user
    user_id = state_data["user_id"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(
            url=f"{frontend_callback_url}?success=false&error=user_not_found"
        )
    
    try:
        # Exchange code for token
        token_data = slack_oauth_service.exchange_code_for_token(code)
        
        # Store the token
        result = slack_oauth_service.store_user_token(user, token_data, db)
        
        # Store workspace info in application settings if not set
        team_id = result.get("team_id")
        team_name = result.get("team_name")
        if team_id:
            # Check if workspace is already set
            workspace_setting = db.query(ApplicationSetting).filter(
                ApplicationSetting.key == "slack_workspace_id"
            ).first()
            
            if workspace_setting and not workspace_setting.value:
                workspace_setting.value = team_id
                workspace_setting.updated_at = datetime.utcnow()
                
                # Also set workspace name
                name_setting = db.query(ApplicationSetting).filter(
                    ApplicationSetting.key == "slack_workspace_name"
                ).first()
                if name_setting:
                    name_setting.value = team_name or ""
                    name_setting.updated_at = datetime.utcnow()
                
                db.commit()
        
        display_name = result.get("display_name", "")
        return RedirectResponse(
            url=f"{frontend_callback_url}?success=true&name={display_name}"
        )
        
    except Exception as e:
        print(f"Slack OAuth error: {e}")
        return RedirectResponse(
            url=f"{frontend_callback_url}?success=false&error=token_exchange_failed"
        )


@router.delete("/disconnect")
def disconnect_slack(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Disconnect user's Slack account"""
    slack_oauth_service.clear_user_token(current_user, db)
    return {"success": True, "message": "Slack account disconnected"}


# === Workspace Settings (Super Admin) ===

@router.get("/workspace", response_model=SlackWorkspaceResponse)
def get_workspace_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get Slack workspace settings"""
    workspace_id = db.query(ApplicationSetting).filter(
        ApplicationSetting.key == "slack_workspace_id"
    ).first()
    
    workspace_name = db.query(ApplicationSetting).filter(
        ApplicationSetting.key == "slack_workspace_name"
    ).first()
    
    return {
        "workspace_id": workspace_id.value if workspace_id else "",
        "workspace_name": workspace_name.value if workspace_name else ""
    }


@router.put("/workspace", response_model=SlackWorkspaceResponse)
def update_workspace_settings(
    data: SlackWorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """Update Slack workspace settings (Super Admin only)"""
    # Update workspace ID
    workspace_id_setting = db.query(ApplicationSetting).filter(
        ApplicationSetting.key == "slack_workspace_id"
    ).first()
    
    if workspace_id_setting:
        workspace_id_setting.value = data.workspace_id
        workspace_id_setting.updated_at = datetime.utcnow()
    else:
        workspace_id_setting = ApplicationSetting(
            key="slack_workspace_id",
            value=data.workspace_id,
            description="Slack Workspace/Team ID for the organization"
        )
        db.add(workspace_id_setting)
    
    # Update workspace name
    workspace_name_setting = db.query(ApplicationSetting).filter(
        ApplicationSetting.key == "slack_workspace_name"
    ).first()
    
    if workspace_name_setting:
        workspace_name_setting.value = data.workspace_name
        workspace_name_setting.updated_at = datetime.utcnow()
    else:
        workspace_name_setting = ApplicationSetting(
            key="slack_workspace_name",
            value=data.workspace_name,
            description="Slack Workspace name for display"
        )
        db.add(workspace_name_setting)
    
    db.commit()
    
    return {
        "workspace_id": data.workspace_id,
        "workspace_name": data.workspace_name
    }


# === Messaging Endpoints ===

@router.get("/users", response_model=List[SlackUserResponse])
def get_slack_users(
    current_user: User = Depends(get_current_active_user)
):
    """Get list of users in the Slack workspace"""
    try:
        users = slack_oauth_service.get_workspace_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-dm", response_model=SendDMResponse)
def send_slack_dm(
    data: SendDMRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send a DM to a Slack user.
    Can send as the authenticated user (if connected) or via bot.
    """
    try:
        # Build the message text
        message = data.message
        
        # Build Slack blocks for rich formatting
        blocks = None
        if data.ticket_key:
            # Get the frontend URL from settings or use default
            frontend_url = settings.FRONTEND_URL or 'http://localhost:3000'
            jira_server = settings.JIRA_SERVER or 'https://centime.atlassian.net'
            
            jira_ticket_url = f"{jira_server}/browse/{data.ticket_key}"
            qa_portal_ticket_url = f"{frontend_url}/production-tickets?ticket={data.ticket_key}"
            
            blocks = [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": message
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "📊 View in QA Portal",
                                "emoji": True
                            },
                            "url": qa_portal_ticket_url,
                            "action_id": f"open_qa_portal_{data.ticket_key}",
                            "style": "primary"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "🎫 View in JIRA",
                                "emoji": True
                            },
                            "url": jira_ticket_url,
                            "action_id": f"open_jira_{data.ticket_key}"
                        }
                    ]
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"💬 _Sent via Centime QA Portal by {current_user.full_name or current_user.email}_"
                        }
                    ]
                }
            ]
        
        # Join multiple recipients for group DM
        recipients = ",".join(data.recipient_slack_ids)
        is_group = len(data.recipient_slack_ids) > 1
        
        if data.send_as_user and slack_oauth_service.is_user_connected(current_user):
            # Send as user
            slack_oauth_service.send_dm_as_user(
                user=current_user,
                recipient_slack_id=recipients,
                message=message,
                blocks=blocks
            )
            return {
                "success": True,
                "message": f"Message sent successfully{' to group' if is_group else ''}",
                "sent_as": "user"
            }
        else:
            # Send via bot with sender attribution
            sender_name = current_user.full_name or current_user.email
            slack_oauth_service.send_dm_via_bot(
                recipient_slack_id=recipients,
                message=message,
                blocks=blocks,
                sender_name=sender_name if not blocks else None  # Don't add sender prefix if using blocks
            )
            return {
                "success": True,
                "message": f"Message sent via bot{' to group' if is_group else ''}",
                "sent_as": "bot"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/find-user")
def find_slack_user_by_email(
    email: str = Query(...),
    current_user: User = Depends(get_current_active_user)
):
    """Find a Slack user by email address"""
    try:
        user = slack_oauth_service.find_user_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interactions")
async def handle_slack_interactions(request: Request):
    """
    Handle Slack interactivity events (button clicks, etc.).
    
    For buttons with URLs, Slack opens the URL directly.
    We just need to acknowledge the request with 200 OK.
    """
    try:
        # Slack sends interactions as form-urlencoded with payload key
        form_data = await request.form()
        payload_str = form_data.get("payload", "{}")
        payload = json.loads(payload_str)
        
        # Log the interaction for debugging (optional)
        action_type = payload.get("type", "unknown")
        user = payload.get("user", {}).get("name", "unknown")
        
        if action_type == "block_actions":
            actions = payload.get("actions", [])
            for action in actions:
                action_id = action.get("action_id", "")
                print(f"Slack interaction: {user} clicked {action_id}")
        
        # For URL buttons, just acknowledge - Slack handles the URL opening
        return Response(content="", status_code=200)
        
    except Exception as e:
        print(f"Slack interaction error: {e}")
        # Always return 200 to Slack to avoid retries
        return Response(content="", status_code=200)
