import requests
import json

BASE_URL = "http://localhost:8000/api"
# Assuming we have a way to get a token or auth is disabled for dev/test
# For now, we'll try to hit the endpoints. If auth is needed, we might need to login first.

def test_issues_api():
    print("Testing Issues API...")
    
    # 1. Login to get token (if needed) - Skipping for now, assuming dev env or manual token handling if strict
    # In a real scenario, we'd hit /api/auth/token first.
    headers = {} # Placeholder for headers, if authentication is needed, populate this.
    
    # 1. Create a new issue with new fields
    print("\n1. Creating a new issue with media links and Jira assignee...")
    issue_data = {
        "title": "Test Issue with Media",
        "description": "This is a test issue with video and screenshots.",
        "status": "Open",
        "priority": "High",
        "severity": "Critical",
        "module_id": 1,
        "video_url": "https://drive.google.com/file/d/12345",
        "screenshot_urls": "https://imgur.com/a/12345\nhttps://imgur.com/a/67890",
        "jira_assignee_id": "557058:3b660000-0000-0000-0000-000000000000", # Example ID
        "reporter_name": "Automated Tester",
        "jira_story_id": "CTP-123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/issues/", json=issue_data, headers=headers)
        if response.status_code == 200:
            issue = response.json()
            print(f"Success! Created issue ID: {issue['id']}")
            print(f"Video URL: {issue.get('video_url')}")
            print(f"Reporter: {issue.get('reporter_name')}")
        else:
            print(f"Failed to create issue: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error creating issue: {e}")

    # 2. Search for Jira users (Mock test if Jira not configured)
    print("\n2. Searching for Jira users...")
    try:
        response = requests.get(f"{BASE_URL}/jira-stories/users/search", params={"query": "test"}, headers=headers)
        if response.status_code == 200:
            users = response.json()
            print(f"Success! Found {len(users)} users.")
        elif response.status_code == 400:
             print(f"Jira not configured (Expected if no env vars): {response.text}")
        else:
            print(f"Failed to search users: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error searching users: {e}")
    print("Verification script is limited without running server/auth.")
    print("Please verify manually via UI or Swagger UI at http://localhost:8000/docs")

if __name__ == "__main__":
    test_issues_api()
