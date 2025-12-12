"""
JIRA OAuth 2.0 (3LO) Service
Handles OAuth flow, token management, and user-authenticated JIRA API calls
"""
import requests
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlencode
import logging

from app.core.config import settings
from app.services.token_encryption import token_encryption_service
from app.models.models import User
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Atlassian OAuth endpoints
ATLASSIAN_AUTH_URL = "https://auth.atlassian.com/authorize"
ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
ATLASSIAN_API_URL = "https://api.atlassian.com"


class JiraOAuthService:
    """Service for JIRA OAuth 2.0 (3LO) authentication and API calls"""
    
    def __init__(self):
        self.client_id = settings.JIRA_OAUTH_CLIENT_ID
        self.client_secret = settings.JIRA_OAUTH_CLIENT_SECRET
        self.redirect_uri = settings.JIRA_OAUTH_REDIRECT_URI
    
    @property
    def is_configured(self) -> bool:
        """Check if OAuth is properly configured"""
        return bool(self.client_id and self.client_secret and self.redirect_uri)
    
    def generate_state_token(self) -> str:
        """Generate a random state token for CSRF protection"""
        return secrets.token_urlsafe(32)
    
    def generate_auth_url(self, state: str) -> str:
        """
        Generate the Atlassian OAuth authorization URL
        
        Args:
            state: CSRF protection token
            
        Returns:
            Full authorization URL to redirect user to
        """
        if not self.is_configured:
            raise ValueError("JIRA OAuth is not configured")
        
        params = {
            "audience": "api.atlassian.com",
            "client_id": self.client_id,
            "scope": "read:jira-work write:jira-work read:me offline_access",
            "redirect_uri": self.redirect_uri,
            "state": state,
            "response_type": "code",
            "prompt": "consent"
        }
        
        return f"{ATLASSIAN_AUTH_URL}?{urlencode(params)}"
    
    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens
        
        Args:
            code: Authorization code from OAuth callback
            
        Returns:
            Dict with access_token, refresh_token, expires_in, scope
        """
        if not self.is_configured:
            raise ValueError("JIRA OAuth is not configured")
        
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri
        }
        
        response = requests.post(
            ATLASSIAN_TOKEN_URL,
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
            raise ValueError(f"Failed to exchange code for tokens: {response.text}")
        
        return response.json()
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Get new access token using refresh token
        
        Args:
            refresh_token: The refresh token
            
        Returns:
            Dict with new access_token, refresh_token (rotated), expires_in
        """
        if not self.is_configured:
            raise ValueError("JIRA OAuth is not configured")
        
        data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token
        }
        
        response = requests.post(
            ATLASSIAN_TOKEN_URL,
            json=data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            logger.error(f"Token refresh failed: {response.status_code} - {response.text}")
            raise ValueError(f"Failed to refresh token: {response.text}")
        
        return response.json()
    
    def get_accessible_resources(self, access_token: str) -> list:
        """
        Get list of JIRA cloud sites the user has access to
        
        Args:
            access_token: Valid OAuth access token
            
        Returns:
            List of accessible resources with id, url, name, scopes
        """
        response = requests.get(
            f"{ATLASSIAN_API_URL}/oauth/token/accessible-resources",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get accessible resources: {response.status_code}")
            raise ValueError("Failed to get accessible JIRA sites")
        
        return response.json()
    
    def get_current_user(self, access_token: str) -> Dict[str, Any]:
        """
        Get the current user's profile information
        
        Args:
            access_token: Valid OAuth access token
            
        Returns:
            Dict with account_id, email, name, picture
        """
        response = requests.get(
            "https://api.atlassian.com/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get user info: {response.status_code}")
            raise ValueError("Failed to get user information")
        
        return response.json()
    
    def ensure_valid_token(self, user: User, db: Session) -> str:
        """
        Ensure the user has a valid access token, refreshing if necessary
        
        Args:
            user: User model instance
            db: Database session
            
        Returns:
            Valid access token
            
        Raises:
            ValueError: If user has no JIRA connection or refresh fails
        """
        if not user.jira_access_token:
            raise ValueError("User has not connected their JIRA account")
        
        # Decrypt current tokens
        try:
            access_token = token_encryption_service.decrypt(user.jira_access_token)
        except Exception as e:
            logger.error(f"Failed to decrypt access token: {e}")
            raise ValueError("Failed to decrypt JIRA tokens. Please reconnect your account.")
        
        # Check if token is expired or about to expire (within 5 minutes)
        if user.jira_token_expires_at:
            if datetime.utcnow() >= user.jira_token_expires_at - timedelta(minutes=5):
                # Token is expired or expiring soon, try to refresh
                if not user.jira_refresh_token:
                    raise ValueError("JIRA session expired. Please reconnect your account.")
                
                try:
                    refresh_token = token_encryption_service.decrypt(user.jira_refresh_token)
                    token_data = self.refresh_access_token(refresh_token)
                    
                    # Update user with new tokens
                    user.jira_access_token = token_encryption_service.encrypt(token_data["access_token"])
                    if "refresh_token" in token_data:
                        user.jira_refresh_token = token_encryption_service.encrypt(token_data["refresh_token"])
                    user.jira_token_expires_at = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
                    
                    db.commit()
                    logger.info(f"Refreshed JIRA token for user {user.id}")
                    
                    access_token = token_data["access_token"]
                    
                except Exception as e:
                    logger.error(f"Failed to refresh token for user {user.id}: {e}")
                    # Clear invalid tokens
                    user.jira_access_token = None
                    user.jira_refresh_token = None
                    user.jira_token_expires_at = None
                    db.commit()
                    raise ValueError("JIRA session expired. Please reconnect your account.")
        
        return access_token
    
    def _parse_comment_with_mentions(
        self, 
        comment_body: str, 
        mentions: list = None
    ) -> list:
        """
        Parse comment text and build ADF content array with proper mention nodes.
        
        The frontend sends text with mentions in format: @[Display Name](accountId)
        We need to convert this to ADF paragraph content with text and mention nodes.
        
        Args:
            comment_body: Comment text with @[Name](id) mention markers
            mentions: Array of {id, display} objects (optional, for validation)
            
        Returns:
            List of ADF content nodes (text and mention nodes)
        """
        import re
        
        # Pattern to match @[Display Name](accountId)
        mention_pattern = r'@\[([^\]]+)\]\(([^)]+)\)'
        
        content = []
        last_end = 0
        
        for match in re.finditer(mention_pattern, comment_body):
            # Add any text before this mention
            if match.start() > last_end:
                text_before = comment_body[last_end:match.start()]
                if text_before:
                    content.append({
                        "type": "text",
                        "text": text_before
                    })
            
            # Add the mention node
            display_name = match.group(1)
            account_id = match.group(2)
            content.append({
                "type": "mention",
                "attrs": {
                    "id": account_id,
                    "text": f"@{display_name}",
                    "accessLevel": ""
                }
            })
            
            last_end = match.end()
        
        # Add any remaining text after the last mention
        if last_end < len(comment_body):
            remaining_text = comment_body[last_end:]
            if remaining_text:
                content.append({
                    "type": "text",
                    "text": remaining_text
                })
        
        # If no mentions found, just return the plain text
        if not content:
            content.append({
                "type": "text",
                "text": comment_body
            })
        
        return content
    
    def add_comment(
        self, 
        access_token: str, 
        cloud_id: str, 
        issue_key: str, 
        comment_body: str,
        mentions: list = None
    ) -> Dict[str, Any]:
        """
        Add a comment to a JIRA issue using user's OAuth token
        
        Args:
            access_token: Valid OAuth access token
            cloud_id: JIRA cloud site ID
            issue_key: Issue key (e.g., CN-1234)
            comment_body: Comment text (with @[Name](id) markers for mentions)
            mentions: Optional list of {id, display} mention objects
            
        Returns:
            Created comment data
        """
        url = f"{ATLASSIAN_API_URL}/ex/jira/{cloud_id}/rest/api/3/issue/{issue_key}/comment"
        
        # Parse comment and build ADF content with mentions
        paragraph_content = self._parse_comment_with_mentions(comment_body, mentions)
        
        # Build Atlassian Document Format (ADF) body
        adf_body = {
            "version": 1,
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": paragraph_content
                }
            ]
        }
        
        payload = {
            "body": adf_body
        }
        
        response = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"Failed to add comment: {response.status_code} - {response.text}")
            raise ValueError(f"Failed to add comment: {response.text}")
        
        return response.json()
    
    def get_issue(
        self,
        access_token: str,
        cloud_id: str,
        issue_key: str
    ) -> Dict[str, Any]:
        """
        Get issue details using user's OAuth token
        
        Args:
            access_token: Valid OAuth access token
            cloud_id: JIRA cloud site ID
            issue_key: Issue key (e.g., CN-1234)
            
        Returns:
            Issue data
        """
        url = f"{ATLASSIAN_API_URL}/ex/jira/{cloud_id}/rest/api/3/issue/{issue_key}"
        
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to get issue: {response.status_code}")
            raise ValueError(f"Failed to get issue: {response.text}")
        
        return response.json()
    
    def store_user_tokens(
        self,
        user: User,
        db: Session,
        token_data: Dict[str, Any],
        cloud_id: str,
        user_info: Dict[str, Any]
    ) -> None:
        """
        Store encrypted OAuth tokens and user info in database
        
        Args:
            user: User model instance
            db: Database session
            token_data: Token response from Atlassian
            cloud_id: Selected JIRA cloud site ID
            user_info: User profile from Atlassian
        """
        # Encrypt tokens before storing
        user.jira_access_token = token_encryption_service.encrypt(token_data["access_token"])
        if "refresh_token" in token_data:
            user.jira_refresh_token = token_encryption_service.encrypt(token_data["refresh_token"])
        
        # Calculate expiry time
        expires_in = token_data.get("expires_in", 3600)  # Default 1 hour
        user.jira_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Store cloud and account info
        user.jira_cloud_id = cloud_id
        user.jira_account_id = user_info.get("account_id")
        user.jira_account_email = user_info.get("email")
        user.jira_display_name = user_info.get("name")
        
        db.commit()
        logger.info(f"Stored JIRA OAuth tokens for user {user.id}")
    
    def clear_user_tokens(self, user: User, db: Session) -> None:
        """
        Clear all JIRA OAuth data for a user
        
        Args:
            user: User model instance
            db: Database session
        """
        user.jira_access_token = None
        user.jira_refresh_token = None
        user.jira_token_expires_at = None
        user.jira_cloud_id = None
        user.jira_account_id = None
        user.jira_account_email = None
        user.jira_display_name = None
        
        db.commit()
        logger.info(f"Cleared JIRA OAuth tokens for user {user.id}")

    def get_issue_transitions(
        self,
        access_token: str,
        cloud_id: str,
        issue_key: str
    ) -> list:
        """
        Get available status transitions for an issue based on user's permissions
        
        Args:
            access_token: Valid OAuth access token
            cloud_id: JIRA cloud site ID
            issue_key: Issue key (e.g., CN-1234)
            
        Returns:
            List of available transitions with id, name, to status
        """
        url = f"{ATLASSIAN_API_URL}/ex/jira/{cloud_id}/rest/api/3/issue/{issue_key}/transitions"
        
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        permission_error_msg = "You don't have permission to view or modify the status of this issue. Please check your JIRA permissions."
        
        # Try to parse response as JSON
        try:
            response_data = response.json()
        except Exception:
            response_data = None
        
        if response.status_code in [401, 403]:
            logger.error(f"Failed to get transitions: {response.status_code} - {response.text}")
            raise ValueError(permission_error_msg)
        
        if response.status_code != 200:
            logger.error(f"Failed to get transitions: {response.status_code} - {response.text}")
            raise ValueError(permission_error_msg)
        
        # Check if response body contains error
        if isinstance(response_data, dict):
            error_code = response_data.get('code')
            error_message = str(response_data.get('message', ''))
            if error_code in [401, 403] or 'Unauthorized' in error_message or 'scope' in error_message.lower():
                logger.error(f"Permission error in response body: {response_data}")
                raise ValueError(permission_error_msg)
        
        transitions = response_data.get("transitions", []) if response_data else []
        
        return [
            {
                "id": t.get("id"),
                "name": t.get("name"),
                "to": {
                    "id": t.get("to", {}).get("id"),
                    "name": t.get("to", {}).get("name"),
                    "statusCategory": t.get("to", {}).get("statusCategory", {}).get("name")
                }
            }
            for t in transitions
        ]

    def transition_issue(
        self,
        access_token: str,
        cloud_id: str,
        issue_key: str,
        transition_id: str
    ) -> Dict[str, Any]:
        """
        Transition an issue to a new status
        
        Args:
            access_token: Valid OAuth access token
            cloud_id: JIRA cloud site ID
            issue_key: Issue key (e.g., CN-1234)
            transition_id: The transition ID to execute
            
        Returns:
            Success response
        """
        url = f"{ATLASSIAN_API_URL}/ex/jira/{cloud_id}/rest/api/3/issue/{issue_key}/transitions"
        
        payload = {
            "transition": {
                "id": transition_id
            }
        }
        
        response = requests.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code not in [200, 204]:
            logger.error(f"Failed to transition issue: {response.status_code} - {response.text}")
            raise ValueError(f"Failed to transition issue: {response.text}")
        
        return {"success": True}

    def get_assignable_users(
        self,
        access_token: str,
        cloud_id: str,
        issue_key: str,
        query: str = ""
    ) -> list:
        """
        Get users that can be assigned to an issue
        
        Args:
            access_token: Valid OAuth access token
            cloud_id: JIRA cloud site ID
            issue_key: Issue key (e.g., CN-1234)
            query: Optional search query for user name/email
            
        Returns:
            List of assignable users
        """
        url = f"{ATLASSIAN_API_URL}/ex/jira/{cloud_id}/rest/api/3/user/assignable/search"
        
        params = {
            "issueKey": issue_key,
            "maxResults": 50
        }
        if query:
            params["query"] = query
        
        response = requests.get(
            url,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        # Try to parse response as JSON
        try:
            response_data = response.json()
        except Exception:
            response_data = None
        
        # Check for permission errors - either by status code or response body
        permission_error_msg = "You don't have permission to assign users to this issue. Please check your JIRA permissions."
        
        if response.status_code in [401, 403]:
            logger.error(f"Failed to get assignable users: {response.status_code} - {response.text}")
            raise ValueError(permission_error_msg)
        
        if response.status_code != 200:
            logger.error(f"Failed to get assignable users: {response.status_code} - {response.text}")
            raise ValueError(permission_error_msg)
        
        # Check if response body contains error (some APIs return 200 with error in body)
        if isinstance(response_data, dict):
            error_code = response_data.get('code')
            error_message = str(response_data.get('message', ''))
            if error_code in [401, 403] or 'Unauthorized' in error_message or 'scope' in error_message.lower():
                logger.error(f"Permission error in response body: {response_data}")
                raise ValueError(permission_error_msg)
        
        # Response should be a list of users
        if not isinstance(response_data, list):
            logger.error(f"Unexpected response format for assignable users: {response_data}")
            raise ValueError(permission_error_msg)
        
        return [
            {
                "accountId": u.get("accountId"),
                "displayName": u.get("displayName"),
                "emailAddress": u.get("emailAddress"),
                "avatarUrl": u.get("avatarUrls", {}).get("24x24")
            }
            for u in users
        ]

    def update_issue_assignee(
        self,
        access_token: str,
        cloud_id: str,
        issue_key: str,
        assignee_account_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Update the assignee of an issue
        
        Args:
            access_token: Valid OAuth access token
            cloud_id: JIRA cloud site ID
            issue_key: Issue key (e.g., CN-1234)
            assignee_account_id: Account ID of the new assignee, or None to unassign
            
        Returns:
            Success response
        """
        url = f"{ATLASSIAN_API_URL}/ex/jira/{cloud_id}/rest/api/3/issue/{issue_key}/assignee"
        
        payload = {
            "accountId": assignee_account_id
        }
        
        response = requests.put(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code not in [200, 204]:
            logger.error(f"Failed to update assignee: {response.status_code} - {response.text}")
            raise ValueError(f"Failed to update assignee: {response.text}")
        
        return {"success": True}


# Singleton instance
jira_oauth_service = JiraOAuthService()
