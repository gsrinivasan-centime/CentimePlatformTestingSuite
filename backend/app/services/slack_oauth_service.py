"""
Slack OAuth Service

Handles Slack OAuth 2.0 flow for user authentication and sending DMs as the authenticated user.
"""

import os
import requests
from urllib.parse import urlencode
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import User
from app.services.token_encryption import token_encryption_service

# Slack OAuth URLs
SLACK_AUTH_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
SLACK_API_BASE = "https://slack.com/api"


class SlackOAuthService:
    """Service for handling Slack OAuth and user operations"""
    
    def __init__(self):
        self.client_id = settings.SLACK_OAUTH_CLIENT_ID
        self.client_secret = settings.SLACK_OAUTH_CLIENT_SECRET
        self.redirect_uri = settings.SLACK_OAUTH_REDIRECT_URI
        self.bot_token = settings.SLACK_BOT_TOKEN
    
    @property
    def is_configured(self) -> bool:
        """Check if Slack OAuth is configured"""
        return bool(self.client_id and self.client_secret and self.redirect_uri)
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate the Slack OAuth authorization URL.
        Uses user_scope for user token (not bot scope).
        """
        params = {
            "client_id": self.client_id,
            "user_scope": "chat:write,im:write,mpim:write,users:read,users:read.email",  # mpim:write for group DMs
            "redirect_uri": self.redirect_uri,
            "state": state,
        }
        return f"{SLACK_AUTH_URL}?{urlencode(params)}"
    
    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        Returns user token data including access_token, user_id, team info.
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
        }
        
        response = requests.post(
            SLACK_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        result = response.json()
        
        if not result.get("ok"):
            error = result.get("error", "Unknown error")
            raise Exception(f"Slack OAuth error: {error}")
        
        return result
    
    def get_user_info(self, access_token: str, user_id: str) -> Dict[str, Any]:
        """Get Slack user information"""
        response = requests.get(
            f"{SLACK_API_BASE}/users.info",
            params={"user": user_id},
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        result = response.json()
        if not result.get("ok"):
            raise Exception(f"Failed to get user info: {result.get('error')}")
        
        return result.get("user", {})
    
    def store_user_token(self, user: User, token_data: Dict[str, Any], db: Session) -> None:
        """
        Store the user's Slack OAuth token (encrypted) and related info.
        """
        # Extract authed_user info (this is the user who authorized)
        authed_user = token_data.get("authed_user", {})
        access_token = authed_user.get("access_token")
        user_id = authed_user.get("id")
        
        if not access_token:
            raise Exception("No access token in response")
        
        # Get team info
        team = token_data.get("team", {})
        
        # Try to get user's display name
        display_name = None
        try:
            user_info = self.get_user_info(access_token, user_id)
            display_name = user_info.get("real_name") or user_info.get("name")
        except Exception as e:
            print(f"Warning: Could not get Slack user info: {e}")
        
        # Encrypt and store token
        user.slack_user_access_token = token_encryption_service.encrypt(access_token)
        user.slack_user_id = user_id
        user.slack_display_name = display_name
        
        db.commit()
        
        # Return team info for storing in application settings if needed
        return {
            "team_id": team.get("id"),
            "team_name": team.get("name"),
            "user_id": user_id,
            "display_name": display_name
        }
    
    def get_user_token(self, user: User) -> Optional[str]:
        """Get decrypted Slack user token"""
        if not user.slack_user_access_token:
            return None
        try:
            return token_encryption_service.decrypt(user.slack_user_access_token)
        except Exception:
            return None
    
    def clear_user_token(self, user: User, db: Session) -> None:
        """Clear user's Slack OAuth credentials"""
        user.slack_user_access_token = None
        user.slack_user_id = None
        user.slack_display_name = None
        db.commit()
    
    def is_user_connected(self, user: User) -> bool:
        """Check if user has connected their Slack account"""
        return bool(user.slack_user_access_token and user.slack_user_id)
    
    def send_dm_as_user(
        self,
        user: User,
        recipient_slack_id: str,
        message: str,
        blocks: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Send a DM to a recipient using the authenticated user's token.
        The message will appear as coming from the user, not a bot.
        """
        access_token = self.get_user_token(user)
        if not access_token:
            raise Exception("User has not connected their Slack account")
        
        # Open a DM channel with the recipient
        open_response = requests.post(
            f"{SLACK_API_BASE}/conversations.open",
            json={"users": recipient_slack_id},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        open_result = open_response.json()
        if not open_result.get("ok"):
            error = open_result.get("error", "Unknown error")
            raise Exception(f"Failed to open DM channel: {error}")
        
        channel_id = open_result["channel"]["id"]
        
        # Send the message
        message_data = {
            "channel": channel_id,
            "text": message,
        }
        if blocks:
            message_data["blocks"] = blocks
        
        send_response = requests.post(
            f"{SLACK_API_BASE}/chat.postMessage",
            json=message_data,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        send_result = send_response.json()
        if not send_result.get("ok"):
            error = send_result.get("error", "Unknown error")
            raise Exception(f"Failed to send message: {error}")
        
        return send_result
    
    def send_dm_via_bot(
        self,
        recipient_slack_id: str,
        message: str,
        blocks: Optional[List[Dict]] = None,
        sender_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a DM via the bot token (fallback if user not connected).
        Can include sender attribution in the message.
        """
        if not self.bot_token:
            raise Exception("Slack bot token not configured")
        
        # Open a DM channel with the recipient
        open_response = requests.post(
            f"{SLACK_API_BASE}/conversations.open",
            json={"users": recipient_slack_id},
            headers={
                "Authorization": f"Bearer {self.bot_token}",
                "Content-Type": "application/json"
            }
        )
        
        open_result = open_response.json()
        if not open_result.get("ok"):
            error = open_result.get("error", "Unknown error")
            raise Exception(f"Failed to open DM channel: {error}")
        
        channel_id = open_result["channel"]["id"]
        
        # Add sender attribution if provided
        if sender_name:
            message = f"📨 *Message from {sender_name}:*\n{message}"
        
        # Send the message
        message_data = {
            "channel": channel_id,
            "text": message,
        }
        if blocks:
            message_data["blocks"] = blocks
        
        send_response = requests.post(
            f"{SLACK_API_BASE}/chat.postMessage",
            json=message_data,
            headers={
                "Authorization": f"Bearer {self.bot_token}",
                "Content-Type": "application/json"
            }
        )
        
        send_result = send_response.json()
        if not send_result.get("ok"):
            error = send_result.get("error", "Unknown error")
            raise Exception(f"Failed to send message: {error}")
        
        return send_result
    
    def get_workspace_users(self, use_user_token: bool = False, user: Optional[User] = None) -> List[Dict[str, Any]]:
        """
        Get list of users in the workspace.
        Can use either bot token or user token.
        """
        if use_user_token and user:
            token = self.get_user_token(user)
            if not token:
                token = self.bot_token
        else:
            token = self.bot_token
        
        if not token:
            raise Exception("No Slack token available")
        
        users = []
        cursor = None
        
        while True:
            params = {"limit": 200}
            if cursor:
                params["cursor"] = cursor
            
            response = requests.get(
                f"{SLACK_API_BASE}/users.list",
                params=params,
                headers={"Authorization": f"Bearer {token}"}
            )
            
            result = response.json()
            if not result.get("ok"):
                raise Exception(f"Failed to get users: {result.get('error')}")
            
            for member in result.get("members", []):
                # Skip bots and deleted users
                if member.get("is_bot") or member.get("deleted"):
                    continue
                
                users.append({
                    "id": member.get("id"),
                    "name": member.get("name"),
                    "real_name": member.get("real_name") or member.get("profile", {}).get("real_name"),
                    "email": member.get("profile", {}).get("email"),
                    "display_name": member.get("profile", {}).get("display_name"),
                    "avatar": member.get("profile", {}).get("image_48"),
                })
            
            # Check for pagination
            cursor = result.get("response_metadata", {}).get("next_cursor")
            if not cursor:
                break
        
        return users
    
    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find a Slack user by email address using bot token"""
        if not self.bot_token:
            raise Exception("Slack bot token not configured")
        
        response = requests.get(
            f"{SLACK_API_BASE}/users.lookupByEmail",
            params={"email": email},
            headers={"Authorization": f"Bearer {self.bot_token}"}
        )
        
        result = response.json()
        if not result.get("ok"):
            if result.get("error") == "users_not_found":
                return None
            raise Exception(f"Failed to find user: {result.get('error')}")
        
        user = result.get("user", {})
        return {
            "id": user.get("id"),
            "name": user.get("name"),
            "real_name": user.get("real_name"),
            "email": user.get("profile", {}).get("email"),
            "display_name": user.get("profile", {}).get("display_name"),
        }


# Singleton instance
slack_oauth_service = SlackOAuthService()
