from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.models.models import Release, User, ReleaseTestCase, ExecutionStatus, JiraStory, TestCase, SubModule, Feature
from app.schemas.schemas import Release as ReleaseSchema, ReleaseCreate
from app.api.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[ReleaseSchema])
def list_releases(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    releases = db.query(Release).order_by(Release.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enhance each release with progress information
    for release in releases:
        total_tests = db.query(func.count(ReleaseTestCase.id)).filter(
            ReleaseTestCase.release_id == release.id
        ).scalar() or 0
        
        if total_tests > 0:
            passed_tests = db.query(func.count(ReleaseTestCase.id)).filter(
                ReleaseTestCase.release_id == release.id,
                ReleaseTestCase.execution_status == ExecutionStatus.PASSED
            ).scalar() or 0
            
            release.progress = round((passed_tests / total_tests) * 100)
        else:
            release.progress = 0
    
    return releases

@router.post("/", response_model=ReleaseSchema, status_code=201)
def create_release(
    release: ReleaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if release version already exists
    db_release = db.query(Release).filter(Release.version == release.version).first()
    if db_release:
        raise HTTPException(status_code=400, detail="Release version already exists")
    
    db_release = Release(**release.dict())
    db.add(db_release)
    db.commit()
    db.refresh(db_release)
    return db_release

@router.get("/{release_id}", response_model=ReleaseSchema)
def get_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return release

@router.put("/{release_id}", response_model=ReleaseSchema)
def update_release(
    release_id: int,
    release_update: ReleaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Check if new version conflicts with existing release
    if release_update.version != release.version:
        existing = db.query(Release).filter(Release.version == release_update.version).first()
        if existing:
            raise HTTPException(status_code=400, detail="Release version already exists")
    
    for key, value in release_update.dict().items():
        setattr(release, key, value)
    
    db.commit()
    db.refresh(release)
    return release

@router.delete("/{release_id}", status_code=204)
def delete_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    db.delete(release)
    db.commit()
    return None

@router.get("/{release_id}/stories")
def get_release_stories(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all JIRA stories associated with this release based on release version with test execution statistics"""
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Find all stories with matching release version
    stories = db.query(JiraStory).filter(
        JiraStory.release == release.version
    ).order_by(JiraStory.updated_at.desc()).all()
    
    # Build stories with test execution stats
    stories_with_stats = []
    for story in stories:
        # Get test cases linked to this story
        test_cases = db.query(TestCase).filter(TestCase.jira_story_id == story.story_id).all()
        
        # Get execution statistics for these test cases in this release
        total_tests = len(test_cases)
        passed = 0
        failed = 0
        blocked = 0
        in_progress = 0
        not_started = 0
        
        for tc in test_cases:
            # Find the execution status from release_test_cases
            try:
                rtc = db.query(ReleaseTestCase).filter(
                    ReleaseTestCase.release_id == release.id,
                    ReleaseTestCase.test_case_id == tc.id
                ).first()
                
                if rtc and rtc.execution_status:
                    # Handle enum comparison
                    status_value = rtc.execution_status.value if hasattr(rtc.execution_status, 'value') else str(rtc.execution_status).lower()
                    if status_value == 'passed':
                        passed += 1
                    elif status_value == 'failed':
                        failed += 1
                    elif status_value == 'blocked':
                        blocked += 1
                    elif status_value in ['in_progress', 'in progress']:
                        in_progress += 1
                    else:
                        not_started += 1
                else:
                    not_started += 1
            except (LookupError, ValueError) as e:
                # Handle cases where execution_status has invalid enum value
                print(f"Warning: Invalid execution status for test case {tc.id}: {e}")
                not_started += 1
        
        # Calculate completion percentage (only count passed tests as completed)
        # Failed tests should not be counted as completed
        completion_percentage = (passed / total_tests * 100) if total_tests > 0 else 0
        
        stories_with_stats.append({
            "id": story.id,
            "story_id": story.story_id,
            "epic_id": story.epic_id,
            "title": story.title,
            "description": story.description,
            "status": story.status,
            "priority": story.priority,
            "assignee": story.assignee,
            "release": story.release,
            "created_at": story.created_at,
            "updated_at": story.updated_at,
            "test_stats": {
                "total": total_tests,
                "passed": passed,
                "failed": failed,
                "blocked": blocked,
                "in_progress": in_progress,
                "not_started": not_started,
                "completion_percentage": round(completion_percentage, 1)
            }
        })
    
    return {
        "release_id": release.id,
        "release_version": release.version,
        "stories": stories_with_stats,
        "total_stories": len(stories)
    }

@router.post("/{release_id}/sync-story-test-cases")
def sync_story_test_cases_to_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Sync all test cases from stories to this release.
    This will link all test cases from stories that have matching release version.
    """
    release = db.query(Release).filter(Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Find all stories with matching release version
    stories = db.query(JiraStory).filter(
        JiraStory.release == release.version
    ).all()
    
    linked_count = 0
    skipped_count = 0
    
    for story in stories:
        # Find all test cases linked to this story
        test_cases = db.query(TestCase).filter(TestCase.jira_story_id == story.story_id).all()
        
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
                linked_count += 1
            else:
                skipped_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Synced test cases from {len(stories)} stories to release {release.version}",
        "linked_count": linked_count,
        "skipped_count": skipped_count,
        "total_stories": len(stories)
    }

@router.patch("/{release_id}/test-case/{test_case_id}/execution-status")
def update_test_case_execution_status(
    release_id: int,
    test_case_id: int,
    execution_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update execution status of a test case in a release"""
    # Map frontend status format to enum format
    status_mapping = {
        "Not Started": ExecutionStatus.NOT_STARTED,
        "In Progress": ExecutionStatus.IN_PROGRESS,
        "Passed": ExecutionStatus.PASSED,
        "Failed": ExecutionStatus.FAILED,
        "Blocked": ExecutionStatus.BLOCKED
    }
    
    if execution_status not in status_mapping:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid execution status. Must be one of: {', '.join(status_mapping.keys())}"
        )
    
    # Find the release test case
    rtc = db.query(ReleaseTestCase).filter(
        ReleaseTestCase.release_id == release_id,
        ReleaseTestCase.test_case_id == test_case_id
    ).first()
    
    if not rtc:
        raise HTTPException(status_code=404, detail="Test case not found in this release")
    
    # Update the execution status with enum value
    rtc.execution_status = status_mapping[execution_status]
    db.commit()
    db.refresh(rtc)
    
    return {
        "success": True,
        "message": f"Execution status updated to {execution_status}",
        "test_case_id": test_case_id,
        "execution_status": execution_status
    }


