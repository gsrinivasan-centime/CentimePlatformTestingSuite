"""
Migration script to convert Confluence view_link URLs to download URLs
The view URLs look like: /wiki/pages/viewpageattachments.action?pageId=...&preview=/...
The download URLs look like: /wiki/download/attachments/pageId/filename
"""
import sqlite3
import json
import re
from urllib.parse import parse_qs, urlparse

def extract_download_url_from_view(view_url):
    """
    Convert a Confluence view URL to a download URL
    Example input: https://centime.atlassian.net/wiki/pages/viewpageattachments.action?pageId=1133838341&preview=/1133838341/1895596034/image+(21).png
    Example output: https://centime.atlassian.net/wiki/download/attachments/1133838341/image+(21).png
    """
    if not view_url or 'viewpageattachments.action' not in view_url:
        return view_url  # Already a download URL or other format
    
    try:
        parsed = urlparse(view_url)
        query_params = parse_qs(parsed.query)
        
        page_id = query_params.get('pageId', [None])[0]
        preview_path = query_params.get('preview', [None])[0]
        
        if not page_id or not preview_path:
            return view_url
        
        # Extract filename from preview path (last part)
        # preview_path looks like: /1133838341/1895596034/filename.png
        parts = preview_path.strip('/').split('/')
        if len(parts) >= 3:
            filename = parts[-1]
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            download_url = f"{base_url}/wiki/download/attachments/{page_id}/{filename}"
            return download_url
        
        return view_url
    except Exception as e:
        print(f"Error converting URL {view_url}: {e}")
        return view_url

def migrate_urls():
    """Update all issue screenshot_urls and video_url from view links to download links"""
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    # Get all issues with screenshot_urls or video_url
    cursor.execute("SELECT id, screenshot_urls, video_url FROM issues WHERE screenshot_urls IS NOT NULL OR video_url IS NOT NULL")
    issues = cursor.fetchall()
    
    updated_count = 0
    
    for issue_id, screenshot_urls, video_url in issues:
        updated = False
        
        # Fix screenshot_urls
        new_screenshot_urls = screenshot_urls
        if screenshot_urls:
            try:
                # Try to parse as JSON
                screenshots = json.loads(screenshot_urls)
                if isinstance(screenshots, list):
                    new_screenshots = [extract_download_url_from_view(url) for url in screenshots]
                    new_screenshot_urls = json.dumps(new_screenshots)
                    if new_screenshot_urls != screenshot_urls:
                        updated = True
            except json.JSONDecodeError:
                # Not JSON, might be newline separated
                screenshots = screenshot_urls.split('\n')
                new_screenshots = [extract_download_url_from_view(url) for url in screenshots]
                new_screenshot_urls = json.dumps(new_screenshots)
                if new_screenshot_urls != screenshot_urls:
                    updated = True
        
        # Fix video_url
        new_video_url = video_url
        if video_url:
            new_video_url = extract_download_url_from_view(video_url)
            if new_video_url != video_url:
                updated = True
        
        if updated:
            cursor.execute(
                "UPDATE issues SET screenshot_urls = ?, video_url = ? WHERE id = ?",
                (new_screenshot_urls, new_video_url, issue_id)
            )
            updated_count += 1
            print(f"Updated issue {issue_id}")
    
    conn.commit()
    conn.close()
    
    print(f"\nMigration complete! Updated {updated_count} issues.")

if __name__ == "__main__":
    print("Starting migration to fix Confluence URLs...")
    migrate_urls()
