from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import JiraStory, TestCase, User, Release, ReleaseTestCase, SubModule, Feature
from app.schemas.schemas import (
    JiraStory as JiraStorySchema,
    JiraStoryCreate,
    JiraStoryUpdate
)
from app.api.auth import get_current_active_user
from app.services.jira_service import jira_service

router = APIRouter()

def auto_link_story_test_cases_to_release(db: Session, story_id: str, release_version: str):
    """
    Auto-link all test cases from a story to a release when release is set
    """
    if not release_version:
        return
    
    # Find the release by version
    release = db.query(Release).filter(Release.version == release_version).first()
    if not release:
        # Release doesn't exist yet, skip auto-linking
        return
    
    # Find all test cases linked to this story
    test_cases = db.query(TestCase).filter(TestCase.jira_story_id == story_id).all()
    
    for test_case in test_cases:
        # Check if already linked to this release
        existing_link = db.query(ReleaseTestCase).filter(
            ReleaseTestCase.release_id == release.id,
            ReleaseTestCase.test_case_id == test_case.id
        ).first()
        
        if not existing_link:
            # Look up sub_module_id and feature_id based on string values
            sub_module_id = None
            feature_id = None
            
            if test_case.sub_module:
                sub_module = db.query(SubModule).filter(
                    SubModule.module_id == test_case.module_id,
                    SubModule.name == test_case.sub_module
                ).first()
                if sub_module:
                    sub_module_id = sub_module.id
            
            if test_case.feature_section:
                feature = db.query(Feature).filter(
                    Feature.name == test_case.feature_section
                ).first()
                if feature:
                    feature_id = feature.id
            
            # Create the link
            release_test_case = ReleaseTestCase(
                release_id=release.id,
                test_case_id=test_case.id,
                module_id=test_case.module_id,
                sub_module_id=sub_module_id,
                feature_id=feature_id,
                priority="medium"  # Default priority for release test cases
            )
            db.add(release_test_case)
    
    db.commit()

@router.get("/", response_model=List[JiraStorySchema])
def get_all_stories(
    epic_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all JIRA stories with optional filtering"""
    query = db.query(JiraStory)
    
    if epic_id:
        query = query.filter(JiraStory.epic_id == epic_id)
    if status:
        query = query.filter(JiraStory.status == status)
    
    stories = query.order_by(JiraStory.created_at.desc()).all()
    
    # Add test case count to each story
    stories_with_counts = []
    for story in stories:
        story_dict = {
            "id": story.id,
            "story_id": story.story_id,
            "epic_id": story.epic_id,
            "title": story.title,
            "description": story.description,
            "status": story.status,
            "priority": story.priority,
            "assignee": story.assignee,
            "sprint": story.sprint,
            "release": story.release,
            "created_at": story.created_at,
            "updated_at": story.updated_at,
            "test_case_count": db.query(TestCase).filter(TestCase.jira_story_id == story.story_id).count()
        }
        stories_with_counts.append(story_dict)
    
    return stories_with_counts

@router.post("/", response_model=JiraStorySchema)
def create_story(
    story: JiraStoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new JIRA story"""
    # Check if story_id already exists
    existing_story = db.query(JiraStory).filter(JiraStory.story_id == story.story_id).first()
    if existing_story:
        raise HTTPException(status_code=400, detail=f"Story {story.story_id} already exists")
    
    db_story = JiraStory(
        **story.dict(),
        created_by=current_user.id
    )
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    
    # Auto-link test cases to release if release is provided
    if db_story.release:
        auto_link_story_test_cases_to_release(db, db_story.story_id, db_story.release)
    
    return db_story

@router.get("/{story_id}", response_model=JiraStorySchema)
def get_story(
    story_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific JIRA story by story_id"""
    story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@router.put("/{story_id}", response_model=JiraStorySchema)
def update_story(
    story_id: str,
    story_update: JiraStoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a JIRA story"""
    story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Track old release value to detect changes
    old_release = story.release
    
    # Update only provided fields
    update_data = story_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(story, key, value)
    
    db.commit()
    db.refresh(story)
    
    # Auto-link test cases to release if release was added or changed
    new_release = story.release
    if new_release and new_release != old_release:
        auto_link_story_test_cases_to_release(db, story.story_id, new_release)
    
    return story

@router.post("/{story_id}/refetch")
def refetch_story_from_jira(
    story_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Re-fetch story details from JIRA and update the database"""
    # Check if story exists
    story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Construct JIRA URL from story_id
    jira_url = f"https://centime.atlassian.net/browse/{story_id}"
    
    try:
        # Fetch latest details from JIRA
        # Note: fetch_story_details returns dict directly with story fields
        story_details = jira_service.fetch_story_details(jira_url)
        
        # Update the existing story with fresh data from JIRA
        old_release = story.release
        story.title = story_details.get('title', story.title)
        story.description = story_details.get('description', story.description)
        story.status = story_details.get('status', story.status)
        story.priority = story_details.get('priority', story.priority)
        story.assignee = story_details.get('assignee', story.assignee)
        story.sprint = story_details.get('sprint', story.sprint)
        story.epic_id = story_details.get('epic_id', story.epic_id)
        story.release = story_details.get('release', story.release)
        
        db.commit()
        db.refresh(story)
        
        # Auto-link test cases to release if release was added or changed
        new_release = story.release
        if new_release and new_release != old_release:
            auto_link_story_test_cases_to_release(db, story.story_id, new_release)
        
        return {
            "success": True,
            "message": "Story details refreshed successfully from JIRA",
            "story": story
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        # JiraService raises ValueError for configuration/API issues
        error_msg = str(e)
        if "not configured" in error_msg or "authentication failed" in error_msg:
            raise HTTPException(status_code=400, detail=error_msg)
        elif "not found" in error_msg:
            raise HTTPException(status_code=404, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching story from JIRA: {str(e)}"
        )

@router.delete("/{story_id}")
def delete_story(
    story_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a JIRA story"""
    story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check if any test cases are linked to this story
    linked_test_cases = db.query(TestCase).filter(TestCase.jira_story_id == story_id).count()
    if linked_test_cases > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete story. {linked_test_cases} test case(s) are linked to it. Please unlink them first."
        )
    
    db.delete(story)
    db.commit()
    return {"message": f"Story {story_id} deleted successfully"}

@router.get("/{story_id}/test-cases")
def get_story_test_cases(
    story_id: str,
    release_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all test cases linked to a specific story with optional execution status for a release"""
    story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    test_cases = db.query(TestCase).options(joinedload(TestCase.module)).filter(TestCase.jira_story_id == story_id).all()
    
    test_cases_data = []
    for tc in test_cases:
        tc_data = {
            "id": tc.id,
            "test_id": tc.test_id,
            "title": tc.title,
            "description": tc.description,
            "preconditions": tc.preconditions,
            "steps_to_reproduce": tc.steps_to_reproduce,
            "expected_result": tc.expected_result,
            "test_type": tc.test_type.value,
            "tag": tc.tag.value,
            "tags": tc.tags,
            "scenario_examples": tc.scenario_examples,
            "module_id": tc.module_id,
            "module_name": tc.module.name if tc.module else "Unknown",
            "sub_module": tc.sub_module,
            "feature_section": tc.feature_section,
            "automation_status": tc.automation_status.value if tc.automation_status else None,
            "jira_story_id": tc.jira_story_id,
            "jira_epic_id": tc.jira_epic_id
        }
        
        # If release_id is provided, get execution status
        if release_id:
            rtc = db.query(ReleaseTestCase).filter(
                ReleaseTestCase.release_id == release_id,
                ReleaseTestCase.test_case_id == tc.id
            ).first()
            
            # Convert enum to frontend format
            if rtc and rtc.execution_status:
                status_value = rtc.execution_status.value if hasattr(rtc.execution_status, 'value') else str(rtc.execution_status)
                status_map = {
                    "not_started": "Not Started",
                    "in_progress": "In Progress",
                    "passed": "Passed",
                    "failed": "Failed",
                    "blocked": "Blocked"
                }
                tc_data["execution_status"] = status_map.get(status_value, "Not Started")
            else:
                tc_data["execution_status"] = "Not Started"
            
            tc_data["release_test_case_id"] = rtc.id if rtc else None
        
        test_cases_data.append(tc_data)
    
    return {
        "story": {
            "story_id": story.story_id,
            "title": story.title,
            "epic_id": story.epic_id,
            "status": story.status
        },
        "test_cases": test_cases_data,
        "total_test_cases": len(test_cases)
    }

@router.post("/{story_id}/link-test-case/{test_case_id}")
def link_test_case_to_story(
    story_id: str,
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Link a test case to a story"""
    story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    # Link test case to story
    test_case.jira_story_id = story_id
    test_case.jira_epic_id = story.epic_id  # Also link to epic
    
    db.commit()
    db.refresh(test_case)
    
    # Auto-link to release if story has a release
    if story.release:
        release = db.query(Release).filter(Release.version == story.release).first()
        if release:
            # Check if already linked to this release
            existing_link = db.query(ReleaseTestCase).filter(
                ReleaseTestCase.release_id == release.id,
                ReleaseTestCase.test_case_id == test_case.id
            ).first()
            
            if not existing_link:
                # Look up sub_module_id and feature_id based on string values
                sub_module_id = None
                feature_id = None
                
                if test_case.sub_module:
                    sub_module = db.query(SubModule).filter(
                        SubModule.module_id == test_case.module_id,
                        SubModule.name == test_case.sub_module
                    ).first()
                    if sub_module:
                        sub_module_id = sub_module.id
                
                if test_case.feature_section:
                    feature = db.query(Feature).filter(
                        Feature.name == test_case.feature_section
                    ).first()
                    if feature:
                        feature_id = feature.id
                
                # Create the link
                release_test_case = ReleaseTestCase(
                    release_id=release.id,
                    test_case_id=test_case.id,
                    module_id=test_case.module_id,
                    sub_module_id=sub_module_id,
                    feature_id=feature_id,
                    priority="medium"  # Default priority for release test cases
                )
                db.add(release_test_case)
                db.commit()
    
    return {
        "message": f"Test case {test_case.test_id} linked to story {story_id}",
        "test_case": {
            "id": test_case.id,
            "test_id": test_case.test_id,
            "title": test_case.title
        }
    }

@router.delete("/{story_id}/unlink-test-case/{test_case_id}")
def unlink_test_case_from_story(
    story_id: str,
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Unlink a test case from a story and remove it from any releases"""
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    if test_case.jira_story_id != story_id:
        raise HTTPException(status_code=400, detail="Test case is not linked to this story")
    
    # Get the story to find its release
    story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
    
    # Remove test case from any releases that match the story's release
    if story and story.release:
        # Find releases with matching version
        releases = db.query(Release).filter(Release.version == story.release).all()
        
        for release in releases:
            # Remove the test case from this release
            db.query(ReleaseTestCase).filter(
                ReleaseTestCase.release_id == release.id,
                ReleaseTestCase.test_case_id == test_case_id
            ).delete()
    
    # Unlink test case from story
    test_case.jira_story_id = None
    test_case.jira_epic_id = None
    
    db.commit()
    
    return {
        "message": f"Test case {test_case.test_id} unlinked from story {story_id} and removed from associated releases"
    }

@router.get("/epic/{epic_id}/stories")
def get_stories_by_epic(
    epic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all stories for a specific epic"""
    stories = db.query(JiraStory).filter(JiraStory.epic_id == epic_id).order_by(JiraStory.created_at.desc()).all()
    
    return {
        "epic_id": epic_id,
        "stories": [{
            "id": story.id,
            "story_id": story.story_id,
            "title": story.title,
            "status": story.status,
            "priority": story.priority,
            "created_at": story.created_at
        } for story in stories],
        "total_stories": len(stories)
    }


class ImportStoryRequest(BaseModel):
    story_url: str


@router.post("/import-from-jira")
def import_story_from_jira(
    request: ImportStoryRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Fetch story details from JIRA using a story URL or ID
    
    This endpoint does NOT save to database - it only fetches and returns the data
    for the frontend to populate the form.
    """
    try:
        story_details = jira_service.fetch_story_details(request.story_url)
        
        return {
            "success": True,
            "story": story_details,
            "message": "Story details fetched successfully from JIRA"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch story from JIRA: {str(e)}"
        )


@router.post("/sync-by-release/{release_version}")
def sync_stories_by_release(
    release_version: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Sync stories from JIRA by release version (fixVersion)
    This will search JIRA for all stories with the specified fixVersion and import them
    """
    try:
        # Search for stories in JIRA with this release version
        stories_data = jira_service.search_stories_by_release(release_version)
        
        if not stories_data:
            return {
                "message": f"No stories found in JIRA with release version: {release_version}",
                "synced_count": 0,
                "stories": []
            }
        
        synced_stories = []
        updated_count = 0
        created_count = 0
        
        for story_data in stories_data:
            story_id = story_data['story_id']
            
            # Check if story already exists
            existing_story = db.query(JiraStory).filter(JiraStory.story_id == story_id).first()
            
            if existing_story:
                # Update existing story
                for key, value in story_data.items():
                    if key != 'story_id':  # Don't update the ID
                        setattr(existing_story, key, value)
                updated_count += 1
                synced_stories.append(existing_story)
            else:
                # Create new story
                new_story = JiraStory(**story_data)
                db.add(new_story)
                created_count += 1
                synced_stories.append(new_story)
        
        db.commit()
        
        # Refresh to get updated data
        for story in synced_stories:
            db.refresh(story)
        
        return {
            "message": f"Successfully synced {len(synced_stories)} stories from JIRA",
            "synced_count": len(synced_stories),
            "created_count": created_count,
            "updated_count": updated_count,
            "release_version": release_version,
            "stories": [
                {
                    "story_id": s.story_id,
                    "title": s.title,
                    "status": s.status,
                    "priority": s.priority
                } for s in synced_stories
            ]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync stories from JIRA: {str(e)}"
        )


@router.post("/sync-all-stories")
def sync_all_existing_stories(
    force_full_sync: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Sync existing stories from JIRA to update their details.
    Uses incremental sync by default - only syncs stories updated in JIRA since last sync.
    
    Args:
        force_full_sync: If True, syncs all stories regardless of last sync time (default: False)
    
    This does NOT fetch new stories, only updates existing ones.
    If a story's fix version has changed, it will be unlinked from releases that don't match.
    """
    try:
        from datetime import datetime, timezone
        
        # Get all stories from database
        all_stories = db.query(JiraStory).all()
        
        if not all_stories:
            return {
                "success": True,
                "message": "No stories found to sync",
                "updated": 0,
                "skipped": 0,
                "errors": []
            }
        
        # Determine which stories need syncing
        if force_full_sync:
            # Full sync - sync all stories
            stories_to_sync = all_stories
            sync_mode = "full"
        else:
            # Incremental sync - only sync stories updated in JIRA since last sync
            # Find the oldest last_synced_at timestamp (or use a default lookback period)
            oldest_sync = None
            for story in all_stories:
                if story.last_synced_at:
                    if oldest_sync is None or story.last_synced_at < oldest_sync:
                        oldest_sync = story.last_synced_at
            
            # If no stories have been synced before, look back 30 days
            if oldest_sync is None:
                from datetime import timedelta
                oldest_sync = datetime.utcnow() - timedelta(days=30)
            
            # Format datetime for JIRA JQL (YYYY-MM-DD HH:mm)
            sync_time_str = oldest_sync.strftime('%Y-%m-%d %H:%M')
            
            # Get all story IDs
            story_ids = [story.story_id for story in all_stories]
            
            # Query JIRA for stories that were updated since last sync
            try:
                updated_stories_data = jira_service.search_stories_updated_after(story_ids, sync_time_str)
                updated_story_ids = {s['story_id'] for s in updated_stories_data}
                
                # Create a map for quick lookup
                jira_data_map = {s['story_id']: s for s in updated_stories_data}
                
                # Only sync stories that were updated in JIRA
                stories_to_sync = [s for s in all_stories if s.story_id in updated_story_ids]
                sync_mode = "incremental"
            except Exception as e:
                # If JIRA query fails, fall back to full sync
                stories_to_sync = all_stories
                sync_mode = "full (fallback)"
                jira_data_map = {}
        
        updated_count = 0
        skipped_count = len(all_stories) - len(stories_to_sync)
        error_count = 0
        errors = []
        unlinked_releases = []
        current_time = datetime.utcnow()
        
        for story in stories_to_sync:
            try:
                # If we have JIRA data from bulk query, use it; otherwise fetch individually
                if not force_full_sync and sync_mode == "incremental" and story.story_id in jira_data_map:
                    story_details = jira_data_map[story.story_id]
                else:
                    # Fetch latest details from JIRA
                    story_details = jira_service.fetch_story_details(story.story_id)
                
                # Track old values
                old_release = story.release
                
                # Update story fields
                story.title = story_details.get('title', story.title)
                story.description = story_details.get('description', story.description)
                story.status = story_details.get('status', story.status)
                story.priority = story_details.get('priority', story.priority)
                story.assignee = story_details.get('assignee', story.assignee)
                story.sprint = story_details.get('sprint', story.sprint)
                story.epic_id = story_details.get('epic_id', story.epic_id)
                story.release = story_details.get('release', story.release)
                story.last_synced_at = current_time
                
                new_release = story.release
                
                # If release (fix version) has changed, handle release unlinking
                if old_release != new_release:
                    # Get all test cases linked to this story
                    test_cases = db.query(TestCase).filter(TestCase.jira_story_id == story.story_id).all()
                    test_case_ids = [tc.id for tc in test_cases]
                    
                    if test_case_ids:
                        # Find releases that have these test cases linked
                        release_links = db.query(ReleaseTestCase).filter(
                            ReleaseTestCase.test_case_id.in_(test_case_ids)
                        ).all()
                        
                        for link in release_links:
                            release = db.query(Release).filter(Release.id == link.release_id).first()
                            if release:
                                # If the release version doesn't match the new fix version, unlink
                                if release.version != new_release:
                                    db.delete(link)
                                    unlinked_releases.append({
                                        "story_id": story.story_id,
                                        "release_version": release.version,
                                        "old_fix_version": old_release,
                                        "new_fix_version": new_release
                                    })
                    
                    # If new release exists and is different, auto-link test cases to it
                    if new_release:
                        auto_link_story_test_cases_to_release(db, story.story_id, new_release)
                
                updated_count += 1
                
            except ValueError as e:
                error_count += 1
                errors.append({
                    "story_id": story.story_id,
                    "error": str(e)
                })
            except Exception as e:
                error_count += 1
                errors.append({
                    "story_id": story.story_id,
                    "error": f"Unexpected error: {str(e)}"
                })
        
        db.commit()
        
        message = f"Sync completed ({sync_mode} mode): {updated_count} stories updated"
        if skipped_count > 0:
            message += f", {skipped_count} stories skipped (no updates in JIRA)"
        if error_count > 0:
            message += f", {error_count} failed"
        if unlinked_releases:
            message += f", {len(unlinked_releases)} test cases unlinked from releases due to fix version changes"
        
        return {
            "success": True,
            "message": message,
            "sync_mode": sync_mode,
            "total_stories": len(all_stories),
            "updated": updated_count,
            "skipped": skipped_count,
            "errors": errors[:10] if errors else [],  # Limit error details
            "unlinked_releases": unlinked_releases[:20] if unlinked_releases else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync stories: {str(e)}"
        )


@router.get("/jira-config-status")
def check_jira_configuration(
    current_user: User = Depends(get_current_active_user)
):
    """Check if JIRA integration is properly configured"""
    return {
        "configured": jira_service.is_configured,
        "server": jira_service.jira_server if jira_service.is_configured else None,
        "message": "JIRA integration is configured" if jira_service.is_configured 
                   else "JIRA integration is not configured. Please set JIRA_SERVER, JIRA_EMAIL, and JIRA_API_TOKEN in .env file"
    }
