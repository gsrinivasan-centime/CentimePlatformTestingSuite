"""
CSV Workbook API endpoints
Handles CSV-based test case workbooks with approval workflow and similarity analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import json
import logging

from app.core.database import get_db
from app.models.models import CsvWorkbook, TestCase, User, UserRole, Module, ApplicationSetting
from app.api.auth import get_current_user, get_current_active_user
from app.services.background_tasks import compute_test_case_embedding, compute_batch_embeddings
from app.api.test_cases import generate_test_id

logger = logging.getLogger(__name__)

router = APIRouter()


def count_test_cases(csv_content: str) -> int:
    """Count only rows with rowType='test_case' (excluding params/data rows)"""
    if not csv_content:
        return 0
    try:
        rows = json.loads(csv_content)
        return sum(1 for row in rows if row.get('rowType', 'test_case') == 'test_case')
    except (json.JSONDecodeError, TypeError):
        return 0


# ============== Workbook CRUD Endpoints ==============

@router.get("")
async def get_workbooks(
    status: Optional[str] = Query(None, description="Filter by status: draft, pending_approval, approved, rejected"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all workbooks for the current user (or all for admin)"""
    query = db.query(CsvWorkbook)
    
    # Filter by creator for non-admin users
    if current_user.role != UserRole.ADMIN:
        query = query.filter(CsvWorkbook.created_by == current_user.id)
    
    if status:
        query = query.filter(CsvWorkbook.status == status)
    
    workbooks = query.order_by(desc(CsvWorkbook.updated_at)).all()
    
    return [{
        "id": wb.id,
        "name": wb.name,
        "description": wb.description,
        "module_id": wb.module_id,
        "module_name": wb.module.name if wb.module else None,
        "status": wb.status,
        "test_case_count": count_test_cases(wb.csv_content),
        "created_by": wb.created_by,
        "creator_name": wb.creator.full_name if wb.creator else None,
        "created_at": wb.created_at.isoformat() if wb.created_at else None,
        "updated_at": wb.updated_at.isoformat() if wb.updated_at else None,
        "submitted_for_approval_at": wb.submitted_for_approval_at.isoformat() if wb.submitted_for_approval_at else None,
        "approved_by": wb.approved_by,
        "approver_name": wb.approver.full_name if wb.approver else None,
        "approved_at": wb.approved_at.isoformat() if wb.approved_at else None,
        "rejection_reason": wb.rejection_reason,
        "has_similarity_results": False,
    } for wb in workbooks]


@router.get("/drafts")
async def get_draft_workbooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's draft and rejected workbooks (editable workbooks)"""
    workbooks = db.query(CsvWorkbook).filter(
        CsvWorkbook.created_by == current_user.id,
        CsvWorkbook.status.in_(["draft", "rejected"])
    ).order_by(desc(CsvWorkbook.updated_at)).all()
    
    return [{
        "id": wb.id,
        "name": wb.name,
        "description": wb.description,
        "module_id": wb.module_id,
        "module_name": wb.module.name if wb.module else None,
        "status": wb.status,
        "rejection_reason": wb.rejection_reason,
        "test_case_count": count_test_cases(wb.csv_content),
        "created_at": wb.created_at.isoformat() if wb.created_at else None,
        "updated_at": wb.updated_at.isoformat() if wb.updated_at else None,
    } for wb in workbooks]


@router.get("/pending-approval")
async def get_pending_approval_workbooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all workbooks pending approval (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    workbooks = db.query(CsvWorkbook).filter(
        CsvWorkbook.status == "pending_approval"
    ).order_by(CsvWorkbook.submitted_for_approval_at).all()
    
    return [{
        "id": wb.id,
        "name": wb.name,
        "description": wb.description,
        "module_id": wb.module_id,
        "module_name": wb.module.name if wb.module else None,
        "test_case_count": count_test_cases(wb.csv_content),
        "created_by": wb.created_by,
        "creator_name": wb.creator.full_name if wb.creator else None,
        "submitted_for_approval_at": wb.submitted_for_approval_at.isoformat() if wb.submitted_for_approval_at else None,
        "has_similarity_results": wb.similarity_results is not None,
    } for wb in workbooks]


@router.get("/{workbook_id}")
async def get_workbook(
    workbook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific workbook by ID"""
    workbook = db.query(CsvWorkbook).filter(CsvWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check access
    if current_user.role != UserRole.ADMIN and workbook.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": workbook.id,
        "name": workbook.name,
        "description": workbook.description,
        "content": json.loads(workbook.csv_content) if workbook.csv_content else [],
        "module_id": workbook.module_id,
        "module_name": workbook.module.name if workbook.module else None,
        "status": workbook.status,
        "similarity_results": json.loads(workbook.similarity_results) if workbook.similarity_results else None,
        "created_by": workbook.created_by,
        "creator_name": workbook.creator.full_name if workbook.creator else None,
        "created_at": workbook.created_at.isoformat() if workbook.created_at else None,
        "updated_at": workbook.updated_at.isoformat() if workbook.updated_at else None,
        "submitted_for_approval_at": workbook.submitted_for_approval_at.isoformat() if workbook.submitted_for_approval_at else None,
        "approved_by": workbook.approved_by,
        "approver_name": workbook.approver.full_name if workbook.approver else None,
        "approved_at": workbook.approved_at.isoformat() if workbook.approved_at else None,
        "rejection_reason": workbook.rejection_reason,
    }


@router.post("")
async def create_workbook(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new workbook (draft status)"""
    name = payload.get("name", "Untitled Workbook")
    description = payload.get("description", "")
    # Accept both 'content' and 'csv_content' for flexibility
    content = payload.get("content") or payload.get("csv_content", [])
    module_id = payload.get("module_id")
    
    # Validate module if provided
    if module_id:
        module = db.query(Module).filter(Module.id == module_id).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
    
    # Handle content - could be list, dict, or already JSON string
    if isinstance(content, str):
        # Already a JSON string, use as-is
        content_str = content
    else:
        # Convert to JSON string
        content_str = json.dumps(content)
    
    workbook = CsvWorkbook(
        name=name,
        description=description,
        csv_content=content_str,
        module_id=module_id,
        status="draft",
        created_by=current_user.id
    )
    
    db.add(workbook)
    db.commit()
    db.refresh(workbook)
    
    return {
        "id": workbook.id,
        "name": workbook.name,
        "status": workbook.status,
        "message": "Workbook created successfully"
    }


@router.put("/{workbook_id}")
async def update_workbook(
    workbook_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing workbook (only draft/rejected status)"""
    workbook = db.query(CsvWorkbook).filter(CsvWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check ownership
    if workbook.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only allow editing draft or rejected workbooks
    if workbook.status not in ["draft", "rejected"]:
        raise HTTPException(status_code=400, detail="Can only edit draft or rejected workbooks")
    
    # Update fields
    if "name" in payload:
        workbook.name = payload["name"]
    if "description" in payload:
        workbook.description = payload["description"]
    if "content" in payload:
        workbook.csv_content = json.dumps(payload["content"])
    if "module_id" in payload:
        workbook.module_id = payload["module_id"]
    
    # Reset to draft if it was rejected
    if workbook.status == "rejected":
        workbook.status = "draft"
        workbook.rejection_reason = None
    
    workbook.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(workbook)
    
    return {
        "id": workbook.id,
        "name": workbook.name,
        "status": workbook.status,
        "message": "Workbook updated successfully"
    }


@router.delete("/{workbook_id}")
async def delete_workbook(
    workbook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a workbook"""
    workbook = db.query(CsvWorkbook).filter(CsvWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check ownership
    if workbook.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(workbook)
    db.commit()
    
    return {"message": "Workbook deleted successfully"}


# ============== Similarity Analysis Endpoints ==============

@router.post("/{workbook_id}/analyze-similarity")
async def analyze_workbook_similarity(
    workbook_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze similarity between workbook test cases and existing test cases
    Returns potential duplicates for each test case in the workbook
    """
    workbook = db.query(CsvWorkbook).filter(CsvWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check access
    if workbook.created_by != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    test_cases = json.loads(workbook.csv_content) if workbook.csv_content else []
    
    # Get threshold from settings
    threshold_setting = db.query(ApplicationSetting).filter(ApplicationSetting.key == "similarity_threshold").first()
    threshold_percent = int(threshold_setting.value) if threshold_setting else 75
    threshold = threshold_percent / 100  # Convert to decimal for comparison
    
    if not test_cases:
        return {"message": "No test cases to analyze", "results": [], "total_test_cases": 0, "potential_duplicates": 0, "threshold": threshold_percent}
    
    similarity_results = []
    
    # Build basic results without similarity check
    # Similarity check using embeddings is optional and may not be available
    for idx, tc in enumerate(test_cases):
        row_type = tc.get("rowType", "test_case")
        if row_type == "test_case":
            similarity_results.append({
                "row_index": idx,
                "row_type": row_type,
                "title": tc.get("title", ""),
                "similar_test_cases": [],
                "has_potential_duplicates": False
            })
        else:
            similarity_results.append({
                "row_index": idx,
                "row_type": row_type,
                "similar_test_cases": []
            })
    
    # Try to do actual similarity analysis if embeddings are available
    try:
        # Check if embedding service is available
        from app.services.embedding_service import EmbeddingService
        embedding_service = EmbeddingService()
        
        # Check if we have any test cases with embeddings using raw SQL to avoid pgvector issues
        from sqlalchemy import text
        result = db.execute(text("SELECT COUNT(*) FROM test_cases WHERE embedding IS NOT NULL"))
        count = result.scalar()
        
        if count and count > 0:
            # Process each test case for similarity
            for idx, tc in enumerate(test_cases):
                row_type = tc.get("rowType", "test_case")
                if row_type != "test_case":
                    continue
                
                # CSV workbook content uses frontend field names.
                # We need to match EXACTLY what the embedding service uses:
                # - tag (ui/api/hybrid) - derived from tags field
                # - test_type (manual/automated) - default to manual
                # - module_name - from module field
                # - sub_module
                # - title
                # - steps
                # - expected_result
                # NOTE: preconditions is NOT included in embeddings!
                
                title = tc.get('title', '')
                steps = tc.get('steps', '') or tc.get('steps_to_reproduce', '')
                expected = tc.get('expectedResult', '') or tc.get('expected_result', '')
                module_name = tc.get('module', '')
                sub_module = tc.get('sub_module', '')
                
                # Derive tag (ui/api/hybrid) from tags field - same logic as approval
                tags_raw = tc.get('tags', '')
                tag = 'ui'  # Default
                if tags_raw:
                    tags_lower = tags_raw.lower()
                    if 'api' in tags_lower:
                        tag = 'api'
                    elif 'hybrid' in tags_lower:
                        tag = 'hybrid'
                
                # Use embedding service to prepare text EXACTLY like background task does
                search_text = embedding_service.prepare_text_for_embedding(
                    title=title,
                    steps=steps,
                    tag=tag,
                    test_type='manual',  # Default for CSV workbooks
                    module_name=module_name,
                    sub_module=sub_module,
                    expected_result=expected
                )
                
                if not search_text or not search_text.strip():
                    continue
                
                try:
                    query_embedding = embedding_service.generate_embedding(search_text)
                    if query_embedding is None:
                        continue
                    
                    # Format embedding as PostgreSQL vector string
                    embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
                    
                    # Use raw SQL for vector similarity - embed the vector directly to avoid parameter binding issues with ::vector cast
                    similar_query = text(f"""
                        SELECT id, test_id, title, 
                               1 - (embedding <=> '{embedding_str}'::vector(384)) as similarity
                        FROM test_cases 
                        WHERE embedding IS NOT NULL
                        ORDER BY embedding <=> '{embedding_str}'::vector(384)
                        LIMIT 5
                    """)
                    
                    similar_cases = db.execute(similar_query).fetchall()
                    
                    matches = []
                    for row in similar_cases:
                        # Include ALL similar test cases so UI can display them
                        # The frontend will highlight those above threshold
                        similarity_pct = round(float(row.similarity) * 100, 1)
                        matches.append({
                            "id": row.id,
                            "test_id": row.test_id,
                            "title": row.title,
                            "similarity": similarity_pct,
                            "module": None
                        })
                    
                    # Update the result for this index
                    # Flag as potential duplicate only if any match is above threshold
                    has_duplicates = any(m["similarity"] >= threshold_percent for m in matches)
                    similarity_results[idx] = {
                        "row_index": idx,
                        "row_type": "test_case",
                        "title": tc.get("title", ""),
                        "similar_test_cases": matches,
                        "has_potential_duplicates": has_duplicates
                    }
                except Exception as inner_e:
                    # Skip this test case on error, keep default empty result
                    db.rollback()
                    pass
                    
    except Exception as e:
        # Similarity check failed, but we already have default results
        db.rollback()
        pass
    
    # Count duplicates
    duplicate_count = sum(1 for r in similarity_results if r.get("has_potential_duplicates", False))
    
    return {
        "message": "Similarity analysis complete",
        "total_test_cases": len([r for r in similarity_results if r.get("row_type") == "test_case"]),
        "potential_duplicates": duplicate_count,
        "threshold": threshold_percent,
        "results": similarity_results
    }


# ============== Approval Workflow Endpoints ==============

@router.post("/{workbook_id}/submit-for-approval")
async def submit_workbook_for_approval(
    workbook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit workbook for admin approval"""
    workbook = db.query(CsvWorkbook).filter(CsvWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    # Check ownership
    if workbook.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can submit for approval")
    
    # Must be in draft or rejected status
    if workbook.status not in ["draft", "rejected"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit workbook with status '{workbook.status}'")
    
    # Update status
    workbook.status = "pending_approval"
    workbook.submitted_for_approval_at = datetime.utcnow()
    workbook.rejection_reason = None
    db.commit()
    
    return {
        "id": workbook.id,
        "status": workbook.status,
        "message": "Workbook submitted for approval"
    }


@router.post("/{workbook_id}/approve")
async def approve_workbook(
    workbook_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve a workbook and create test cases (admin only)
    This actually creates the test cases in the database
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    workbook = db.query(CsvWorkbook).filter(CsvWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if workbook.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Workbook is not pending approval")
    
    test_cases_data = json.loads(workbook.csv_content) if workbook.csv_content else []
    if not test_cases_data:
        raise HTTPException(status_code=400, detail="Workbook has no test cases")
    
    target_module_id = workbook.module_id
    if not target_module_id:
        raise HTTPException(status_code=400, detail="Workbook must have a module assigned")
    
    # Create test cases
    created_test_cases = []
    errors = []
    
    for idx, tc_data in enumerate(test_cases_data):
        # Skip PARAMS and DATA rows - they're part of data-driven tests
        row_type = tc_data.get("rowType", "test_case")
        if row_type in ["params", "data"]:
            continue
        
        try:
            # Determine tag from tags field
            tags = tc_data.get('tags', '')
            tag = 'ui'
            if tags:
                tags_lower = tags.lower()
                if 'api' in tags_lower:
                    tag = 'api'
                elif 'hybrid' in tags_lower:
                    tag = 'hybrid'
            
            # Auto-generate test_id
            test_id = tc_data.get('testId') or tc_data.get('test_id')
            if not test_id:
                test_id = generate_test_id(tag, db)
            else:
                # Check if test_id already exists
                existing = db.query(TestCase).filter(TestCase.test_id == test_id).first()
                if existing:
                    errors.append({
                        "row": idx + 1,
                        "error": f"Test ID '{test_id}' already exists"
                    })
                    continue
            
            # Create test case
            db_test_case = TestCase(
                test_id=test_id,
                title=tc_data.get('title', ''),
                description=tc_data.get('title', ''),
                preconditions=tc_data.get('preconditions', ''),
                steps_to_reproduce=tc_data.get('steps', '') or tc_data.get('steps_to_reproduce', ''),
                expected_result=tc_data.get('expectedResult', '') or tc_data.get('expected_result', ''),
                module_id=target_module_id,
                sub_module=tc_data.get('sub_module', ''),
                feature_section=tc_data.get('feature_section', ''),
                tags=tags,
                tag=tag,
                test_type='manual',
                automation_status=None,
                scenario_examples=tc_data.get('scenario_examples'),
                created_by=workbook.created_by  # Original creator
            )
            
            db.add(db_test_case)
            db.flush()
            
            created_test_cases.append({
                "id": db_test_case.id,
                "test_id": db_test_case.test_id,
                "title": db_test_case.title
            })
            
        except Exception as e:
            db.rollback()
            errors.append({
                "row": idx + 1,
                "title": tc_data.get('title', 'Unknown'),
                "error": str(e)
            })
    
    # Update workbook status
    workbook.status = "approved"
    workbook.approved_by = current_user.id
    workbook.approved_at = datetime.utcnow()
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve workbook: {str(e)}")
    
    # Schedule embedding generation for similarity analysis
    if created_test_cases:
        test_case_ids = [tc["id"] for tc in created_test_cases]
        background_tasks.add_task(compute_batch_embeddings, "test_case", test_case_ids)
    
    return {
        "success": True,
        "message": "Workbook approved and test cases created",
        "created_count": len(created_test_cases),
        "error_count": len(errors),
        "created_test_cases": created_test_cases,
        "errors": errors
    }


@router.post("/{workbook_id}/reject")
async def reject_workbook(
    workbook_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a workbook with reason (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    workbook = db.query(CsvWorkbook).filter(CsvWorkbook.id == workbook_id).first()
    if not workbook:
        raise HTTPException(status_code=404, detail="Workbook not found")
    
    if workbook.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Workbook is not pending approval")
    
    reason = payload.get("reason", "No reason provided")
    
    workbook.status = "rejected"
    workbook.rejection_reason = reason
    workbook.approved_by = current_user.id
    workbook.approved_at = datetime.utcnow()
    db.commit()
    
    return {
        "id": workbook.id,
        "status": workbook.status,
        "message": "Workbook rejected",
        "reason": reason
    }
