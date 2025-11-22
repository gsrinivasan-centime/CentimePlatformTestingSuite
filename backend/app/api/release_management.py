from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Dict, Any
from datetime import datetime
import json

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import models
from app.schemas import schemas

router = APIRouter()

# =====================
# Release Test Cases
# =====================

@router.post("/releases/{release_id}/test-cases", response_model=List[schemas.ReleaseTestCase])
def add_test_cases_to_release(
    release_id: int,
    request: schemas.AddTestCasesToRelease,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add multiple test cases to a release"""
    # Verify release exists
    release = db.query(models.Release).filter(models.Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    release_test_cases = []
    for test_case_id in request.test_case_ids:
        # Get test case
        test_case = db.query(models.TestCase).filter(models.TestCase.id == test_case_id).first()
        if not test_case:
            continue
        
        # Check if already added
        existing = db.query(models.ReleaseTestCase).filter(
            and_(
                models.ReleaseTestCase.release_id == release_id,
                models.ReleaseTestCase.test_case_id == test_case_id
            )
        ).first()
        
        if existing:
            continue
        
        # Look up sub_module_id and feature_id based on string values from test_case
        sub_module_id = None
        feature_id = None
        
        if test_case.sub_module:
            sub_module = db.query(models.SubModule).filter(
                and_(
                    models.SubModule.name == test_case.sub_module,
                    models.SubModule.module_id == test_case.module_id
                )
            ).first()
            if sub_module:
                sub_module_id = sub_module.id
        
        if test_case.feature_section and sub_module_id:
            feature = db.query(models.Feature).filter(
                and_(
                    models.Feature.name == test_case.feature_section,
                    models.Feature.sub_module_id == sub_module_id
                )
            ).first()
            if feature:
                feature_id = feature.id
        
        # Create release test case
        release_test_case = models.ReleaseTestCase(
            release_id=release_id,
            test_case_id=test_case_id,
            module_id=test_case.module_id,
            sub_module_id=sub_module_id,
            feature_id=feature_id,
            priority="medium",
            execution_status=models.ExecutionStatus.NOT_STARTED
        )
        db.add(release_test_case)
        release_test_cases.append(release_test_case)
    
    # Log history
    history = models.ReleaseHistory(
        release_id=release_id,
        user_id=current_user.id,
        action="test_cases_added",
        details=json.dumps({"count": len(request.test_case_ids)})
    )
    db.add(history)
    
    db.commit()
    for rtc in release_test_cases:
        db.refresh(rtc)
    
    return release_test_cases

@router.get("/releases/{release_id}/test-cases", response_model=List[schemas.ReleaseTestCase])
def get_release_test_cases(
    release_id: int,
    module_id: int = None,
    sub_module_id: int = None,
    feature_id: int = None,
    execution_status: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all test cases for a release with optional filters"""
    query = db.query(models.ReleaseTestCase).filter(models.ReleaseTestCase.release_id == release_id)
    
    if module_id:
        query = query.filter(models.ReleaseTestCase.module_id == module_id)
    if sub_module_id:
        query = query.filter(models.ReleaseTestCase.sub_module_id == sub_module_id)
    if feature_id:
        query = query.filter(models.ReleaseTestCase.feature_id == feature_id)
    if execution_status:
        query = query.filter(models.ReleaseTestCase.execution_status == execution_status)
    
    return query.order_by(models.ReleaseTestCase.display_order, models.ReleaseTestCase.id).all()

@router.put("/releases/{release_id}/test-cases/{test_case_id}", response_model=schemas.ReleaseTestCase)
def update_release_test_case(
    release_id: int,
    test_case_id: int,
    update_data: schemas.ReleaseTestCaseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update test case execution status and details"""
    rtc = db.query(models.ReleaseTestCase).filter(
        and_(
            models.ReleaseTestCase.release_id == release_id,
            models.ReleaseTestCase.test_case_id == test_case_id
        )
    ).first()
    
    if not rtc:
        raise HTTPException(status_code=404, detail="Test case not found in release")
    
    # Track what changed
    changes = {}
    
    # Update fields
    if update_data.execution_status is not None:
        old_status = rtc.execution_status
        rtc.execution_status = update_data.execution_status
        changes["execution_status"] = {"from": old_status.value if old_status else None, "to": update_data.execution_status.value}
        
        if update_data.execution_status != models.ExecutionStatus.NOT_STARTED:
            rtc.executed_by_id = current_user.id
            rtc.execution_date = datetime.utcnow()
    
    if update_data.execution_duration is not None:
        rtc.execution_duration = update_data.execution_duration
    
    if update_data.comments is not None:
        rtc.comments = update_data.comments
        changes["comments"] = True
    
    if update_data.bug_ids is not None:
        rtc.bug_ids = update_data.bug_ids
        changes["bug_ids"] = True
    
    if update_data.screenshots is not None:
        rtc.screenshots = update_data.screenshots
        changes["screenshots"] = True
    
    if update_data.priority is not None:
        rtc.priority = update_data.priority
        changes["priority"] = update_data.priority
    
    if update_data.display_order is not None:
        rtc.display_order = update_data.display_order
    
    rtc.updated_at = datetime.utcnow()
    
    # Log history
    history = models.ReleaseHistory(
        release_id=release_id,
        user_id=current_user.id,
        action="test_case_updated",
        details=json.dumps({
            "test_case_id": test_case_id,
            "changes": changes
        })
    )
    db.add(history)
    
    db.commit()
    db.refresh(rtc)
    
    return rtc

@router.delete("/releases/{release_id}/test-cases/{test_case_id}")
def remove_test_case_from_release(
    release_id: int,
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Remove a test case from a release"""
    rtc = db.query(models.ReleaseTestCase).filter(
        and_(
            models.ReleaseTestCase.release_id == release_id,
            models.ReleaseTestCase.test_case_id == test_case_id
        )
    ).first()
    
    if not rtc:
        raise HTTPException(status_code=404, detail="Test case not found in release")
    
    db.delete(rtc)
    
    # Log history
    history = models.ReleaseHistory(
        release_id=release_id,
        user_id=current_user.id,
        action="test_case_removed",
        details=json.dumps({"test_case_id": test_case_id})
    )
    db.add(history)
    
    db.commit()
    
    return {"message": "Test case removed from release"}

# =====================
# Dashboard Statistics
# =====================

@router.get("/releases/{release_id}/dashboard", response_model=schemas.ReleaseDashboard)
def get_release_dashboard(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get dashboard statistics for a release"""
    # Verify release exists
    release = db.query(models.Release).filter(models.Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Overall statistics
    total_query = db.query(models.ReleaseTestCase).filter(models.ReleaseTestCase.release_id == release_id)
    total_test_cases = total_query.count()
    
    # Count by status
    status_counts = db.query(
        models.ReleaseTestCase.execution_status,
        func.count(models.ReleaseTestCase.id)
    ).filter(
        models.ReleaseTestCase.release_id == release_id
    ).group_by(
        models.ReleaseTestCase.execution_status
    ).all()
    
    status_dict = {status.value: count for status, count in status_counts}
    
    passed = status_dict.get("passed", 0)
    failed = status_dict.get("failed", 0)
    blocked = status_dict.get("blocked", 0)
    not_started = status_dict.get("not_started", 0)
    in_progress = status_dict.get("in_progress", 0)
    skipped = status_dict.get("skipped", 0)
    
    pass_rate = (passed / total_test_cases * 100) if total_test_cases > 0 else 0
    
    # Module-wise statistics
    module_stats_query = db.query(
        models.Module.id,
        models.Module.name,
        models.ReleaseTestCase.execution_status,
        func.count(models.ReleaseTestCase.id)
    ).join(
        models.ReleaseTestCase, models.Module.id == models.ReleaseTestCase.module_id
    ).filter(
        models.ReleaseTestCase.release_id == release_id
    ).group_by(
        models.Module.id,
        models.Module.name,
        models.ReleaseTestCase.execution_status
    ).all()
    
    # Organize module stats
    module_dict: Dict[int, Dict[str, Any]] = {}
    for module_id, module_name, status, count in module_stats_query:
        if module_id not in module_dict:
            module_dict[module_id] = {
                "module_id": module_id,
                "module_name": module_name,
                "total": 0,
                "passed": 0,
                "failed": 0,
                "blocked": 0,
                "not_started": 0,
                "in_progress": 0,
                "skipped": 0
            }
        
        status_key = status.value if status else "not_started"
        module_dict[module_id][status_key] = count
        module_dict[module_id]["total"] += count
    
    # Calculate pass rates
    module_stats = []
    for module_data in module_dict.values():
        module_data["pass_rate"] = (
            module_data["passed"] / module_data["total"] * 100
        ) if module_data["total"] > 0 else 0
        module_stats.append(schemas.ModuleStats(**module_data))
    
    # Get critical issues (failed/blocked tests)
    critical_issues = []
    critical_tests = db.query(
        models.ReleaseTestCase, models.TestCase
    ).join(
        models.TestCase, models.ReleaseTestCase.test_case_id == models.TestCase.id
    ).filter(
        models.ReleaseTestCase.release_id == release_id,
        models.ReleaseTestCase.execution_status.in_([
            models.ExecutionStatus.FAILED,
            models.ExecutionStatus.BLOCKED
        ])
    ).limit(10).all()
    
    for rtc, test_case in critical_tests:
        critical_issues.append(f"{test_case.test_id}: {test_case.title} [{rtc.execution_status.value}]")
    
    # Get issue statistics for this release
    issues_query = db.query(models.Issue).filter(models.Issue.release_id == release_id)
    total_issues = issues_query.count()
    
    issue_stats = None
    if total_issues > 0:
        # Count by status
        open_count = issues_query.filter(func.lower(models.Issue.status) == 'open').count()
        in_progress_count = issues_query.filter(func.lower(models.Issue.status) == 'in progress').count()
        resolved_count = issues_query.filter(func.lower(models.Issue.status) == 'resolved').count()
        closed_count = issues_query.filter(func.lower(models.Issue.status) == 'closed').count()
        
        # Count by priority
        priority_counts = db.query(
            func.lower(models.Issue.priority),
            func.count(models.Issue.id)
        ).filter(
            models.Issue.release_id == release_id
        ).group_by(
            func.lower(models.Issue.priority)
        ).all()
        
        by_priority = {priority: count for priority, count in priority_counts if priority}
        
        # Count by module
        module_issue_counts = db.query(
            models.Module.name,
            func.count(models.Issue.id)
        ).join(
            models.Issue, models.Module.id == models.Issue.module_id
        ).filter(
            models.Issue.release_id == release_id
        ).group_by(
            models.Module.name
        ).all()
        
        by_module = [{"module_name": name, "count": count} for name, count in module_issue_counts]
        
        issue_stats = schemas.IssueStats(
            total_issues=total_issues,
            open=open_count,
            in_progress=in_progress_count,
            resolved=resolved_count,
            closed=closed_count,
            by_priority=by_priority,
            by_module=by_module
        )
    
    return schemas.ReleaseDashboard(
        release_id=release_id,
        release_version=release.version,
        release_name=release.name,
        environment=release.environment,
        overall_status=release.overall_status,
        total_test_cases=total_test_cases,
        passed=passed,
        failed=failed,
        blocked=blocked,
        not_started=not_started,
        in_progress=in_progress,
        skipped=skipped,
        pass_rate=round(pass_rate, 2),
        module_stats=module_stats,
        critical_issues=critical_issues,
        issue_stats=issue_stats,
        last_updated=datetime.utcnow()
    )

# =====================
# Tree View
# =====================

@router.get("/releases/{release_id}/tree", response_model=schemas.ReleaseTreeView)
def get_release_tree_view(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get hierarchical tree view of test cases in a release"""
    # Verify release exists
    release = db.query(models.Release).filter(models.Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Get all test cases for this release with relationships
    release_test_cases = db.query(
        models.ReleaseTestCase,
        models.TestCase,
        models.Module,
        models.SubModule,
        models.Feature,
        models.User
    ).join(
        models.TestCase, models.ReleaseTestCase.test_case_id == models.TestCase.id
    ).join(
        models.Module, models.ReleaseTestCase.module_id == models.Module.id
    ).outerjoin(
        models.SubModule, models.ReleaseTestCase.sub_module_id == models.SubModule.id
    ).outerjoin(
        models.Feature, models.ReleaseTestCase.feature_id == models.Feature.id
    ).outerjoin(
        models.User, models.ReleaseTestCase.executed_by_id == models.User.id
    ).filter(
        models.ReleaseTestCase.release_id == release_id
    ).order_by(
        models.Module.name,
        models.SubModule.name,
        models.Feature.name,
        models.ReleaseTestCase.display_order
    ).all()
    
    # Build hierarchical structure
    modules_dict: Dict[int, Dict] = {}
    
    for rtc, test_case, module, sub_module, feature, executed_by in release_test_cases:
        # Initialize module
        if module.id not in modules_dict:
            modules_dict[module.id] = {
                "id": module.id,
                "name": module.name,
                "sub_modules": {},
                "stats": {"total": 0, "passed": 0, "failed": 0, "blocked": 0, "not_started": 0, "in_progress": 0, "skipped": 0}
            }
        
        module_data = modules_dict[module.id]
        
        # Initialize sub-module
        sub_module_id = sub_module.id if sub_module else 0
        sub_module_name = sub_module.name if sub_module else "Uncategorized"
        
        if sub_module_id not in module_data["sub_modules"]:
            module_data["sub_modules"][sub_module_id] = {
                "id": sub_module_id,
                "name": sub_module_name,
                "features": {},
                "stats": {"total": 0, "passed": 0, "failed": 0, "blocked": 0, "not_started": 0, "in_progress": 0, "skipped": 0}
            }
        
        sub_module_data = module_data["sub_modules"][sub_module_id]
        
        # Initialize feature
        feature_id = feature.id if feature else 0
        feature_name = feature.name if feature else "No Feature"
        
        if feature_id not in sub_module_data["features"]:
            sub_module_data["features"][feature_id] = {
                "id": feature_id,
                "name": feature_name,
                "test_cases": [],
                "stats": {"total": 0, "passed": 0, "failed": 0, "blocked": 0, "not_started": 0, "in_progress": 0, "skipped": 0}
            }
        
        feature_data = sub_module_data["features"][feature_id]
        
        # Add test case
        test_case_data = schemas.TreeTestCase(
            id=test_case.id,
            test_id=test_case.test_id,
            title=test_case.title,
            execution_status=rtc.execution_status,
            priority=rtc.priority,
            executed_by=executed_by.full_name if executed_by else None,
            execution_date=rtc.execution_date,
            comments=rtc.comments,
            bug_ids=rtc.bug_ids
        )
        feature_data["test_cases"].append(test_case_data)
        
        # Update statistics
        status_key = rtc.execution_status.value
        feature_data["stats"]["total"] += 1
        feature_data["stats"][status_key] += 1
        
        sub_module_data["stats"]["total"] += 1
        sub_module_data["stats"][status_key] += 1
        
        module_data["stats"]["total"] += 1
        module_data["stats"][status_key] += 1
    
    # Convert to schemas
    modules = []
    for module_data in modules_dict.values():
        sub_modules = []
        for sub_module_data in module_data["sub_modules"].values():
            features = []
            for feature_data in sub_module_data["features"].values():
                features.append(schemas.TreeFeature(
                    id=feature_data["id"],
                    name=feature_data["name"],
                    test_cases=feature_data["test_cases"],
                    stats=feature_data["stats"]
                ))
            
            sub_modules.append(schemas.TreeSubModule(
                id=sub_module_data["id"],
                name=sub_module_data["name"],
                features=features,
                stats=sub_module_data["stats"]
            ))
        
        modules.append(schemas.TreeModule(
            id=module_data["id"],
            name=module_data["name"],
            sub_modules=sub_modules,
            stats=module_data["stats"]
        ))
    
    return schemas.ReleaseTreeView(
        release_id=release_id,
        release_version=release.version,
        modules=modules
    )

# =====================
# Release Approvals
# =====================

@router.post("/releases/{release_id}/approvals", response_model=schemas.ReleaseApproval)
def create_approval(
    release_id: int,
    approval_data: schemas.ReleaseApprovalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create an approval request for a release"""
    # Verify release exists
    release = db.query(models.Release).filter(models.Release.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Check if approval already exists for this role
    existing = db.query(models.ReleaseApproval).filter(
        and_(
            models.ReleaseApproval.release_id == release_id,
            models.ReleaseApproval.role == approval_data.role
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Approval already exists for this role")
    
    approval = models.ReleaseApproval(**approval_data.dict())
    db.add(approval)
    
    # Log history
    history = models.ReleaseHistory(
        release_id=release_id,
        user_id=current_user.id,
        action="approval_requested",
        details=json.dumps({"role": approval_data.role.value})
    )
    db.add(history)
    
    db.commit()
    db.refresh(approval)
    
    return approval

@router.get("/releases/{release_id}/approvals", response_model=List[schemas.ReleaseApproval])
def get_release_approvals(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all approvals for a release"""
    return db.query(models.ReleaseApproval).filter(
        models.ReleaseApproval.release_id == release_id
    ).all()

@router.put("/releases/{release_id}/approvals/{approval_id}", response_model=schemas.ReleaseApproval)
def update_approval(
    release_id: int,
    approval_id: int,
    update_data: schemas.ReleaseApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update an approval (approve/reject)"""
    approval = db.query(models.ReleaseApproval).filter(
        and_(
            models.ReleaseApproval.id == approval_id,
            models.ReleaseApproval.release_id == release_id
        )
    ).first()
    
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    # Update fields
    if update_data.approval_status is not None:
        approval.approval_status = update_data.approval_status
        if update_data.approval_status == models.ApprovalStatus.APPROVED:
            approval.approved_at = datetime.utcnow()
    
    if update_data.comments is not None:
        approval.comments = update_data.comments
    
    # Log history
    history = models.ReleaseHistory(
        release_id=release_id,
        user_id=current_user.id,
        action=f"approval_{update_data.approval_status.value if update_data.approval_status else 'updated'}",
        details=json.dumps({
            "approval_id": approval_id,
            "role": approval.role.value,
            "status": update_data.approval_status.value if update_data.approval_status else None
        })
    )
    db.add(history)
    
    db.commit()
    db.refresh(approval)
    
    return approval

# =====================
# Release History
# =====================

@router.get("/releases/{release_id}/history", response_model=List[schemas.ReleaseHistory])
def get_release_history(
    release_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get history of changes for a release"""
    return db.query(models.ReleaseHistory).filter(
        models.ReleaseHistory.release_id == release_id
    ).order_by(
        models.ReleaseHistory.created_at.desc()
    ).limit(limit).all()
