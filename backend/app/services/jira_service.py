"""
JIRA Integration Service
Handles fetching story details from JIRA REST API
"""
import os
import re
import requests
from typing import Optional, Dict
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

class JiraService:
    def __init__(self):
        self.jira_server = os.getenv('JIRA_SERVER', '')
        self.jira_email = os.getenv('JIRA_EMAIL', '')
        self.jira_api_token = os.getenv('JIRA_API_TOKEN', '')
        
        # Validate configuration
        self.is_configured = all([
            self.jira_server,
            self.jira_email,
            self.jira_api_token
        ])
    
    def extract_story_id_from_url(self, url: str) -> Optional[str]:
        """
        Extract JIRA story ID from various URL formats
        Examples:
        - https://company.atlassian.net/browse/PROJ-123
        - https://jira.company.com/browse/PROJ-123
        """
        patterns = [
            r'/browse/([A-Z]+-\d+)',  # Standard JIRA URL
            r'selectedIssue=([A-Z]+-\d+)',  # Query parameter format
            r'^([A-Z]+-\d+)$',  # Direct story ID
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def fetch_story_details(self, story_url: str) -> Dict:
        """
        Fetch story details from JIRA using the REST API
        
        Args:
            story_url: JIRA story URL or story ID (e.g., PROJ-123)
            
        Returns:
            Dict containing story details
            
        Raises:
            ValueError: If JIRA is not configured or story not found
            requests.RequestException: If API call fails
        """
        if not self.is_configured:
            raise ValueError(
                "JIRA integration is not configured. Please set JIRA_SERVER, "
                "JIRA_EMAIL, and JIRA_API_TOKEN in your .env file."
            )
        
        # Extract story ID from URL
        story_id = self.extract_story_id_from_url(story_url)
        if not story_id:
            raise ValueError(
                f"Could not extract story ID from: {story_url}. "
                "Please provide a valid JIRA URL or story ID (e.g., PROJ-123)"
            )
        
        # Construct API URL
        api_url = f"{self.jira_server}/rest/api/3/issue/{story_id}"
        
        # Make API request
        try:
            response = requests.get(
                api_url,
                auth=HTTPBasicAuth(self.jira_email, self.jira_api_token),
                headers={
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout=10
            )
            
            response.raise_for_status()
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                raise ValueError("JIRA authentication failed. Please check your credentials.")
            elif e.response.status_code == 404:
                raise ValueError(f"Story {story_id} not found in JIRA.")
            else:
                raise ValueError(f"JIRA API error: {e}")
        except requests.exceptions.Timeout:
            raise ValueError("JIRA API request timed out. Please try again.")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to connect to JIRA: {e}")
        
        # Parse response
        data = response.json()
        fields = data.get('fields', {})
        
        # Extract relevant information
        story_details = {
            'story_id': data.get('key', story_id),
            'title': fields.get('summary', ''),
            'description': fields.get('description', {}).get('content', [{}])[0].get('content', [{}])[0].get('text', '') if isinstance(fields.get('description'), dict) else str(fields.get('description', '')),
            'status': fields.get('status', {}).get('name', 'To Do'),
            'priority': fields.get('priority', {}).get('name', 'Medium'),
            'assignee': fields.get('assignee', {}).get('displayName', '') if fields.get('assignee') else '',
            'epic_id': self._extract_epic_link(fields),
            'sprint': self._extract_sprint(fields),
            'release': self._extract_fix_version(fields),
        }
        
        return story_details
    
    def _extract_epic_link(self, fields: Dict) -> str:
        """Extract epic link from various possible field locations"""
        # Try different field names for epic
        epic_fields = [
            'parent',  # For stories under epics
            'epic',
            'customfield_10014',  # Common epic link field
        ]
        
        for field in epic_fields:
            if field in fields and fields[field]:
                if isinstance(fields[field], dict):
                    return fields[field].get('key', '')
                return str(fields[field])
        
        return ''
    
    def _extract_sprint(self, fields: Dict) -> str:
        """Extract sprint information"""
        # Sprint is often in a custom field
        sprint_fields = [
            'sprint',
            'customfield_10020',  # Common sprint field
        ]
        
        for field in sprint_fields:
            if field in fields and fields[field]:
                if isinstance(fields[field], list) and len(fields[field]) > 0:
                    sprint = fields[field][0]
                    if isinstance(sprint, dict):
                        return sprint.get('name', '')
                    # Sprint string format: "com.atlassian.greenhopper.service.sprint.Sprint@...name=Sprint 1,..."
                    if isinstance(sprint, str) and 'name=' in sprint:
                        match = re.search(r'name=([^,\]]+)', sprint)
                        if match:
                            return match.group(1)
                elif isinstance(fields[field], str):
                    return fields[field]
        
        return ''
    
    def _extract_fix_version(self, fields: Dict) -> str:
        """Extract fix version/release information"""
        # Fix Version is a standard JIRA field
        fix_versions = fields.get('fixVersions', [])
        
        if fix_versions and isinstance(fix_versions, list) and len(fix_versions) > 0:
            # Return the first fix version name
            return fix_versions[0].get('name', '')
        
        return ''
    
    def search_stories_by_release(self, release_version: str) -> list:
        """
        Search JIRA stories by fixVersion using JQL
        
        Args:
            release_version: The release version to search for
            
        Returns:
            List of story details
            
        Raises:
            ValueError: If JIRA is not configured or search fails
        """
        if not self.is_configured:
            raise ValueError(
                "JIRA integration is not configured. Please set JIRA_SERVER, "
                "JIRA_EMAIL, and JIRA_API_TOKEN in your .env file."
            )
        
        # Construct JQL query to search by fixVersion
        # Note: Using 'issuetype' instead of 'type' for better compatibility
        jql = f'fixVersion = "{release_version}" AND issuetype = Story'
        
        # Use the new v3 JQL endpoint (v2 search has been deprecated)
        api_url = f"{self.jira_server}/rest/api/3/search/jql"
        
        # Make API request
        try:
            response = requests.get(
                api_url,
                auth=HTTPBasicAuth(self.jira_email, self.jira_api_token),
                headers={
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                params={
                    'jql': jql,
                    'maxResults': 100,  # Adjust as needed
                    'fields': 'summary,description,status,priority,assignee,parent,epic,customfield_10014,sprint,customfield_10020,fixVersions'
                },
                timeout=30
            )
            
            response.raise_for_status()
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                raise ValueError("JIRA authentication failed. Please check your credentials.")
            elif e.response.status_code == 400:
                # Try to get more details from the response
                try:
                    error_detail = e.response.json()
                    error_messages = error_detail.get('errorMessages', [])
                    if error_messages:
                        raise ValueError(f"JIRA error: {', '.join(error_messages)}")
                except:
                    pass
                raise ValueError(f"Invalid JQL query or release version: {release_version}")
            elif e.response.status_code == 410:
                raise ValueError(f"JIRA API endpoint deprecated. Response: {e.response.text[:200]}")
            else:
                # Include response body for debugging
                try:
                    error_detail = e.response.json()
                    raise ValueError(f"JIRA API error ({e.response.status_code}): {error_detail}")
                except:
                    raise ValueError(f"JIRA API error: {e}")
        except requests.exceptions.Timeout:
            raise ValueError("JIRA API request timed out. Please try again.")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to connect to JIRA: {e}")
        
        # Parse response
        data = response.json()
        issues = data.get('issues', [])
        
        # Extract story details from each issue
        stories = []
        for issue in issues:
            story_id = issue.get('key', '')
            fields = issue.get('fields', {})
            
            # Extract description (handle both v2 plain text and v3 ADF format)
            description = ''
            desc_field = fields.get('description', '')
            if isinstance(desc_field, dict):
                # v3 ADF format
                try:
                    description = desc_field.get('content', [{}])[0].get('content', [{}])[0].get('text', '')
                except (IndexError, AttributeError, TypeError):
                    description = ''
            elif isinstance(desc_field, str):
                # v2 plain text format
                description = desc_field
            else:
                description = str(desc_field) if desc_field else ''
            
            story_details = {
                'story_id': story_id,
                'title': fields.get('summary', ''),
                'description': description,
                'status': fields.get('status', {}).get('name', 'To Do'),
                'priority': fields.get('priority', {}).get('name', 'Medium'),
                'assignee': fields.get('assignee', {}).get('displayName', '') if fields.get('assignee') else '',
                'epic_id': self._extract_epic_link(fields),
                'sprint': self._extract_sprint(fields),
                'release': release_version,  # Use the provided release version
            }
            stories.append(story_details)
        
        return stories

# Singleton instance
jira_service = JiraService()
