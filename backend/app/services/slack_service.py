"""
Slack Integration Service
Handles sending DM notifications to users via Slack Bot API
"""
import os
import logging
import requests
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class SlackService:
    """Service for sending Slack notifications via Bot API"""
    
    def __init__(self):
        self.bot_token = os.getenv('SLACK_BOT_TOKEN', '')
        self.is_configured = bool(self.bot_token)
        self.base_url = "https://slack.com/api"
        
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers for Slack API requests"""
        return {
            "Authorization": f"Bearer {self.bot_token}",
            "Content-Type": "application/json"
        }
    
    def lookup_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Look up a Slack user by their email address
        
        Args:
            email: User's email address
            
        Returns:
            User object if found, None otherwise
        """
        if not self.is_configured:
            logger.warning("Slack is not configured - SLACK_BOT_TOKEN not set")
            return None
        
        if not email:
            logger.warning("[Slack] No email provided for user lookup")
            return None
            
        try:
            response = requests.get(
                f"{self.base_url}/users.lookupByEmail",
                headers=self._get_headers(),
                params={"email": email}
            )
            
            data = response.json()
            
            if data.get("ok"):
                return data.get("user")
            else:
                error = data.get("error", "Unknown error")
                if error == "users_not_found":
                    logger.info(f"[Slack] User with email {email} not found in Slack workspace")
                else:
                    logger.warning(f"[Slack] Failed to lookup user by email: {error}")
                return None
                
        except Exception as e:
            logger.error(f"[Slack] Error looking up user by email {email}: {e}")
            return None
    
    def lookup_user_by_name(self, display_name: str) -> Optional[Dict[str, Any]]:
        """
        Look up a Slack user by their display name (fuzzy match).
        Falls back to searching all users and matching by name.
        
        Args:
            display_name: User's display name from JIRA
            
        Returns:
            User object if found, None otherwise
        """
        if not self.is_configured or not display_name:
            return None
            
        try:
            # Get all users from Slack workspace
            response = requests.get(
                f"{self.base_url}/users.list",
                headers=self._get_headers(),
                params={"limit": 500}
            )
            
            data = response.json()
            
            if not data.get("ok"):
                logger.warning(f"[Slack] Failed to list users: {data.get('error')}")
                return None
            
            members = data.get("members", [])
            display_name_lower = display_name.lower().strip()
            
            # Try exact match first on real_name or display_name
            for member in members:
                if member.get("deleted") or member.get("is_bot"):
                    continue
                    
                profile = member.get("profile", {})
                real_name = (profile.get("real_name") or "").lower().strip()
                slack_display_name = (profile.get("display_name") or "").lower().strip()
                
                if real_name == display_name_lower or slack_display_name == display_name_lower:
                    logger.info(f"[Slack] Found user by exact name match: {display_name}")
                    return member
            
            # Try partial match (first + last name)
            name_parts = display_name_lower.split()
            if len(name_parts) >= 2:
                first_name = name_parts[0]
                last_name = name_parts[-1]
                
                for member in members:
                    if member.get("deleted") or member.get("is_bot"):
                        continue
                        
                    profile = member.get("profile", {})
                    real_name = (profile.get("real_name") or "").lower()
                    
                    if first_name in real_name and last_name in real_name:
                        logger.info(f"[Slack] Found user by partial name match: {display_name} -> {profile.get('real_name')}")
                        return member
            
            logger.info(f"[Slack] No user found matching name: {display_name}")
            return None
                
        except Exception as e:
            logger.error(f"[Slack] Error looking up user by name {display_name}: {e}")
            return None
    
    def open_dm_channel(self, user_id: str) -> Optional[str]:
        """
        Open a DM channel with a user
        
        Args:
            user_id: Slack user ID
            
        Returns:
            Channel ID if successful, None otherwise
        """
        if not self.is_configured:
            return None
            
        try:
            response = requests.post(
                f"{self.base_url}/conversations.open",
                headers=self._get_headers(),
                json={"users": user_id}
            )
            
            data = response.json()
            
            if data.get("ok"):
                return data.get("channel", {}).get("id")
            else:
                logger.warning(f"[Slack] Failed to open DM channel: {data.get('error')}")
                return None
                
        except Exception as e:
            logger.error(f"[Slack] Error opening DM channel: {e}")
            return None
    
    def send_message(self, channel_id: str, text: str, blocks: Optional[list] = None) -> bool:
        """
        Send a message to a Slack channel
        
        Args:
            channel_id: Channel or DM channel ID
            text: Fallback text for notifications
            blocks: Rich message blocks (optional)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_configured:
            return False
            
        try:
            payload = {
                "channel": channel_id,
                "text": text
            }
            
            if blocks:
                payload["blocks"] = blocks
                
            response = requests.post(
                f"{self.base_url}/chat.postMessage",
                headers=self._get_headers(),
                json=payload
            )
            
            data = response.json()
            
            if data.get("ok"):
                logger.info(f"[Slack] ✅ Message sent to channel {channel_id}")
                return True
            else:
                logger.warning(f"[Slack] Failed to send message: {data.get('error')}")
                return False
                
        except Exception as e:
            logger.error(f"[Slack] Error sending message: {e}")
            return False
    
    def send_dm(self, user_id: str, text: str, blocks: Optional[list] = None) -> bool:
        """
        Send a direct message to a Slack user
        
        Args:
            user_id: Slack user ID
            text: Fallback text for notifications
            blocks: Rich message blocks (optional)
            
        Returns:
            True if successful, False otherwise
        """
        channel_id = self.open_dm_channel(user_id)
        if not channel_id:
            return False
            
        return self.send_message(channel_id, text, blocks)
    
    def notify_issue_assigned(
        self,
        assignee_email: Optional[str],
        assignee_name: Optional[str],
        issue_title: str,
        issue_id: int,
        priority: str,
        reporter_name: Optional[str],
        portal_url: str
    ) -> bool:
        """
        Send a DM notification when an issue is assigned to a user
        
        Args:
            assignee_email: Email address of the assignee (may be empty)
            assignee_name: Display name of the assignee (used for fallback lookup)
            issue_title: Title of the issue
            issue_id: ID of the issue (used for display)
            priority: Issue priority (Critical, High, Medium, Low)
            reporter_name: Name of the person who reported the issue
            portal_url: URL to view the issue in the portal (direct link)
            
        Returns:
            True if notification sent successfully, False otherwise"""
        if not self.is_configured:
            logger.warning("[Slack] Cannot send notification - Slack not configured")
            return False
        
        user = None
        
        # Try email lookup first if email is available
        if assignee_email:
            user = self.lookup_user_by_email(assignee_email)
            if user:
                logger.info(f"[Slack] Found user by email: {assignee_email}")
        
        # Fallback to name-based lookup if email not available or not found
        if not user and assignee_name:
            logger.info(f"[Slack] Email lookup failed, trying name lookup for: {assignee_name}")
            user = self.lookup_user_by_name(assignee_name)
            
        if not user:
            logger.warning(f"[Slack] Cannot notify - user not found (email: {assignee_email}, name: {assignee_name})")
            return False
            
        slack_user_id = user.get("id")
        user_name = user.get("real_name") or user.get("name", "there")
        
        # Priority emoji mapping
        priority_emoji = {
            "Critical": "🔴",
            "High": "🟠",
            "Medium": "🟡",
            "Low": "🟢"
        }.get(priority, "⚪")
        
        # Build rich message blocks
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🎫 New Issue Assigned to You",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Hi {user_name}! You've been assigned a new issue:"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Issue ID:*\n#{issue_id}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Priority:*\n{priority_emoji} {priority}"
                    }
                ]
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Title:*\n{issue_title}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Reporter:*\n{reporter_name or 'Not specified'}"
                    }
                ]
            }
        ]
        
        # Add divider and action button
        blocks.extend([
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
                            "text": "View Issue in Portal",
                            "emoji": True
                        },
                        "url": portal_url,
                        "style": "primary"
                    }
                ]
            }
        ])
        
        # Fallback text for notifications
        fallback_text = f"🎫 New Issue Assigned: {issue_title} ({priority})"
        
        # Send DM
        success = self.send_dm(slack_user_id, fallback_text, blocks)
        
        if success:
            logger.info(f"[Slack] ✅ Sent issue assignment notification to {assignee_email}")
        else:
            logger.warning(f"[Slack] Failed to send issue assignment notification to {assignee_email}")
            
        return success


# Singleton instance
slack_service = SlackService()
