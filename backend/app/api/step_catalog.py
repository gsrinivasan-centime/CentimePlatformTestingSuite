from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import StepCatalog, FeatureFile, User
from app.schemas.schemas import (
    StepCatalog as StepCatalogSchema,
    StepCatalogCreate,
    StepCatalogUpdate,
    FeatureFile as FeatureFileSchema,
    FeatureFileCreate,
    FeatureFileUpdate
)
from app.api.auth import get_current_user
from app.services.confluence_service import confluence_service
import json

router = APIRouter()

# ============== Step Catalog Endpoints ==============

@router.get("/steps", response_model=List[StepCatalogSchema])
async def get_all_steps(
    step_type: Optional[str] = Query(None, description="Filter by step type (Given, When, Then)"),
    search: Optional[str] = Query(None, description="Search in step text"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    module_id: Optional[int] = Query(None, description="Filter by module"),
    sort_by: str = Query("usage_count", description="Sort by: usage_count, created_at, step_type"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    """Get all steps from catalog with optional filters"""
    try:
        query = db.query(StepCatalog)
        
        if step_type:
            query = query.filter(StepCatalog.step_type == step_type)
        
        if search:
            query = query.filter(StepCatalog.step_text.contains(search))
        
        if tags:
            tag_list = tags.split(',')
            for tag in tag_list:
                query = query.filter(StepCatalog.tags.contains(tag.strip()))
        
        if module_id:
            query = query.filter(StepCatalog.module_id == module_id)
        
        # Apply sorting
        if sort_by == "usage_count":
            query = query.order_by(StepCatalog.usage_count.desc() if order == "desc" else StepCatalog.usage_count.asc())
        elif sort_by == "created_at":
            query = query.order_by(StepCatalog.created_at.desc() if order == "desc" else StepCatalog.created_at.asc())
        elif sort_by == "step_type":
            query = query.order_by(StepCatalog.step_type.asc() if order == "asc" else StepCatalog.step_type.desc())
        
        steps = query.all()
        return steps
    except Exception as e:
        print(f"ERROR in get_all_steps: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching steps: {str(e)}")


@router.get("/steps/{step_id}", response_model=StepCatalogSchema)
async def get_step(step_id: int, db: Session = Depends(get_db)):
    """Get a specific step by ID"""
    step = db.query(StepCatalog).filter(StepCatalog.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step


@router.post("/steps", response_model=StepCatalogSchema)
async def create_step(
    step: StepCatalogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new reusable step"""
    db_step = StepCatalog(
        **step.dict(),
        created_by=current_user.id,
        usage_count=0
    )
    db.add(db_step)
    db.commit()
    db.refresh(db_step)
    return db_step


@router.put("/steps/{step_id}", response_model=StepCatalogSchema)
async def update_step(
    step_id: int,
    step: StepCatalogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing step"""
    db_step = db.query(StepCatalog).filter(StepCatalog.id == step_id).first()
    if not db_step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    update_data = step.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_step, field, value)
    
    db.commit()
    db.refresh(db_step)
    return db_step


@router.delete("/steps/{step_id}")
async def delete_step(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a step from catalog"""
    db_step = db.query(StepCatalog).filter(StepCatalog.id == step_id).first()
    if not db_step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    db.delete(db_step)
    db.commit()
    return {"message": "Step deleted successfully"}


@router.post("/steps/{step_id}/increment-usage")
async def increment_step_usage(step_id: int, db: Session = Depends(get_db)):
    """Increment usage count when step is used in a test case"""
    db_step = db.query(StepCatalog).filter(StepCatalog.id == step_id).first()
    if not db_step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    db_step.usage_count += 1
    db.commit()
    db.refresh(db_step)
    return {"message": "Usage count incremented", "new_count": db_step.usage_count}


@router.get("/steps/stats/summary")
async def get_steps_stats(db: Session = Depends(get_db)):
    """Get statistics about steps in catalog"""
    total_steps = db.query(StepCatalog).count()
    given_steps = db.query(StepCatalog).filter(StepCatalog.step_type == "Given").count()
    when_steps = db.query(StepCatalog).filter(StepCatalog.step_type == "When").count()
    then_steps = db.query(StepCatalog).filter(StepCatalog.step_type == "Then").count()
    
    most_used = db.query(StepCatalog).order_by(StepCatalog.usage_count.desc()).limit(10).all()
    
    return {
        "total_steps": total_steps,
        "by_type": {
            "given": given_steps,
            "when": when_steps,
            "then": then_steps
        },
        "most_used": [
            {
                "id": step.id,
                "step_text": step.step_text,
                "step_type": step.step_type,
                "usage_count": step.usage_count
            }
            for step in most_used
        ]
    }


@router.get("/steps/search/suggestions")
async def search_step_suggestions(
    query: str = Query(..., min_length=1, description="Search query"),
    step_type: Optional[str] = Query(None, description="Filter by step type"),
    limit: int = Query(10, le=50, description="Max number of suggestions"),
    db: Session = Depends(get_db)
):
    """Search for step suggestions (for autocomplete)"""
    search_query = db.query(StepCatalog).filter(
        StepCatalog.step_text.contains(query)
    )
    
    if step_type:
        search_query = search_query.filter(StepCatalog.step_type == step_type)
    
    results = search_query.order_by(
        StepCatalog.usage_count.desc()
    ).limit(limit).all()
    
    return [
        {
            "id": step.id,
            "step_type": step.step_type,
            "step_text": step.step_text,
            "step_pattern": step.step_pattern,
            "usage_count": step.usage_count,
            "description": step.description,
            "parameters": json.loads(step.parameters) if step.parameters else None
        }
        for step in results
    ]


# ============== Feature File Endpoints ==============

# Constants for feature file limits
MAX_DRAFT_FILES = 5
MAX_ARCHIVED_FILES = 100

@router.get("/feature-files", response_model=List[FeatureFileSchema])
async def get_all_feature_files(
    status: Optional[str] = Query(None, description="Filter by status (draft, published, archived)"),
    module_id: Optional[int] = Query(None, description="Filter by module"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all feature files for the current user only"""
    # Filter by current user - each user sees only their own files
    query = db.query(FeatureFile).filter(FeatureFile.created_by == current_user.id)
    
    if status:
        query = query.filter(FeatureFile.status == status)
    
    if module_id:
        query = query.filter(FeatureFile.module_id == module_id)
    
    files = query.order_by(FeatureFile.updated_at.desc()).all()
    return files


@router.get("/feature-files/{file_id}", response_model=FeatureFileSchema)
async def get_feature_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific feature file (only if owned by current user)"""
    file = db.query(FeatureFile).filter(
        FeatureFile.id == file_id,
        FeatureFile.created_by == current_user.id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    return file


@router.post("/feature-files", response_model=FeatureFileSchema)
async def create_feature_file(
    file: FeatureFileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new feature file and upload to Confluence
    
    Limits:
    - Maximum 5 draft files per user
    """
    # Check draft limit (max 5)
    draft_count = db.query(FeatureFile).filter(
        FeatureFile.created_by == current_user.id,
        FeatureFile.status == "draft"
    ).count()
    
    if draft_count >= MAX_DRAFT_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_DRAFT_FILES} draft files allowed. Please publish or delete existing drafts."
        )
    
    # Create database entry
    db_file = FeatureFile(
        **file.dict(),
        created_by=current_user.id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    # Upload to Confluence if content is provided
    if db_file.content:
        try:
            confluence_result = confluence_service.upload_feature_file(
                filename=db_file.name,
                content=db_file.content
            )
            
            # Update database record with Confluence metadata
            db_file.confluence_url = confluence_result.get('download_link')
            db_file.confluence_attachment_id = confluence_result.get('confluence_attachment_id')
            db_file.confluence_page_id = confluence_result.get('confluence_page_id')
            db.commit()
            db.refresh(db_file)
            
            print(f"✓ Feature file '{db_file.name}' uploaded to Confluence")
        except Exception as e:
            print(f"⚠️ Failed to upload feature file to Confluence: {e}")
            # Continue even if Confluence upload fails
    
    return db_file


@router.put("/feature-files/{file_id}", response_model=FeatureFileSchema)
async def update_feature_file(
    file_id: int,
    file: FeatureFileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing feature file and sync to Confluence (only if owned by current user)"""
    db_file = db.query(FeatureFile).filter(
        FeatureFile.id == file_id,
        FeatureFile.created_by == current_user.id
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    update_data = file.dict(exclude_unset=True)
    
    # Check if content is being updated
    content_updated = 'content' in update_data and update_data['content']
    
    for field, value in update_data.items():
        setattr(db_file, field, value)
    
    db.commit()
    db.refresh(db_file)
    
    # Upload to Confluence if content was updated
    if content_updated and db_file.content:
        try:
            confluence_result = confluence_service.upload_feature_file(
                filename=db_file.name,
                content=db_file.content
            )
            
            # Update database record with Confluence metadata
            db_file.confluence_url = confluence_result.get('download_link')
            db_file.confluence_attachment_id = confluence_result.get('confluence_attachment_id')
            db_file.confluence_page_id = confluence_result.get('confluence_page_id')
            db.commit()
            db.refresh(db_file)
            
            print(f"✓ Feature file '{db_file.name}' updated in Confluence")
        except Exception as e:
            print(f"⚠️ Failed to upload updated feature file to Confluence: {e}")
            # Continue even if Confluence upload fails
    
    return db_file


@router.get("/feature-files/{file_id}/preview-scenarios")
async def preview_scenarios(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview scenarios in a feature file before publishing - returns list of scenarios that will become test cases"""
    from gherkin.parser import Parser
    from gherkin.token_scanner import TokenScanner
    
    db_file = db.query(FeatureFile).filter(FeatureFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    if not db_file.content:
        raise HTTPException(status_code=400, detail="Feature file has no content")
    
    # Parse the feature file content
    try:
        parser = Parser()
        token_scanner = TokenScanner(db_file.content)
        gherkin_document = parser.parse(token_scanner)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse Gherkin content: {str(e)}"
        )
    
    feature = gherkin_document.get('feature')
    if not feature:
        raise HTTPException(status_code=400, detail="No feature found in file")
    
    feature_name = feature.get('name', db_file.name)
    scenarios = []
    
    # Process each scenario
    for idx, child in enumerate(feature.get('children', [])):
        # Check if child is a Scenario or ScenarioOutline (direct children, not nested)
        child_type = child.get('type', '')
        if child_type not in ['Scenario', 'ScenarioOutline']:
            # Also check for 'scenario' key (older gherkin versions)
            if 'scenario' in child:
                child = child['scenario']
                child_type = child.get('type', 'Scenario')
            else:
                continue
            
        scenario_name = child.get('name', 'Unnamed Scenario')
        scenario_keyword = child.get('keyword', 'Scenario').strip()
        
        # Collect steps
        steps_list = []
        for step in child.get('steps', []):
            keyword = step.get('keyword', '').strip()
            text = step.get('text', '').strip()
            steps_list.append(f"{keyword} {text}")
        
        # Check for examples (Scenario Outline)
        examples = child.get('examples', [])
        has_examples = len(examples) > 0
        
        scenarios.append({
            "index": idx,
            "name": scenario_name,
            "keyword": scenario_keyword,
            "steps": steps_list,
            "has_examples": has_examples,
            "suggested_type": "api"  # Default suggestion
        })
    
    return {
        "file_id": file_id,
        "file_name": db_file.name,
        "feature_name": feature_name,
        "scenario_count": len(scenarios),
        "scenarios": scenarios
    }


@router.delete("/feature-files/{file_id}")
async def delete_feature_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a feature file (only if owned by current user)"""
    db_file = db.query(FeatureFile).filter(
        FeatureFile.id == file_id,
        FeatureFile.created_by == current_user.id
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    db.delete(db_file)
    db.commit()
    return {"message": "Feature file deleted successfully"}


@router.post("/feature-files/{file_id}/publish")
async def publish_feature_file(
    file_id: int,
    body: Optional[dict] = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publish a feature file and create test cases from scenarios
    
    Limits:
    - Maximum 100 archived files per user
    - When 101st file is archived, the oldest archived file (by published_at) is deleted
    
    body: Optional dict with scenario_types: [{"index": 0, "type": "ui"}, {"index": 1, "type": "api"}]
    If not provided, defaults to "api" for all scenarios
    """
    # Extract scenario_types from body if provided
    scenario_types = body.get('scenario_types') if body else None
    
    from gherkin.parser import Parser
    from gherkin.token_scanner import TokenScanner
    from app.models.models import TestCase, Module
    from app.schemas.schemas import TestCaseCreate
    from datetime import datetime
    
    db_file = db.query(FeatureFile).filter(
        FeatureFile.id == file_id,
        FeatureFile.created_by == current_user.id
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    # Check if already published
    if db_file.status == "published":
        return {
            "message": "File is already published",
            "file": db_file,
            "test_cases_created": 0
        }
    
    # Build type map from scenario_types
    type_map = {}
    if scenario_types:
        for st in scenario_types:
            type_map[st.get('index', -1)] = st.get('type', 'api')
    
    # Get module info if available
    module = None
    if db_file.module_id:
        module = db.query(Module).filter(Module.id == db_file.module_id).first()
    
    # Parse the feature file content
    try:
        parser = Parser()
        token_scanner = TokenScanner(db_file.content)
        gherkin_document = parser.parse(token_scanner)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse Gherkin content: {str(e)}"
        )
    
    feature = gherkin_document.get('feature')
    if not feature:
        raise HTTPException(status_code=400, detail="No feature found in file")
    
    feature_name = feature.get('name', db_file.name)
    created_count = 0
    errors = []
    
    # Helper function to generate test ID
    def generate_test_id(tag: str, db: Session) -> str:
        prefix_map = {
            'ui': 'UI',
            'api': 'API',
            'hybrid': 'HYB',
            'integration': 'INT'
        }
        prefix = prefix_map.get(tag.lower(), 'TC')
        
        last_test = db.query(TestCase).filter(
            TestCase.test_id.like(f"{prefix}%")
        ).order_by(TestCase.id.desc()).first()
        
        if last_test:
            try:
                last_number = int(last_test.test_id.replace(prefix, ''))
                new_number = last_number + 1
            except ValueError:
                new_number = 1
        else:
            new_number = 1
        
        return f"{prefix}{new_number:04d}"
    
    # Process each scenario
    scenario_index = 0
    for child in feature.get('children', []):
        try:
            # Check if child is a Scenario or ScenarioOutline (direct children, not nested)
            child_type = child.get('type', '')
            if child_type not in ['Scenario', 'ScenarioOutline']:
                # Also check for 'scenario' key (older gherkin versions)
                if 'scenario' in child:
                    scenario = child['scenario']
                else:
                    continue
            else:
                scenario = child
            
            # Get type for this scenario from the type_map, default to 'api'
            tag = type_map.get(scenario_index, 'api')
            test_type = "manual"  # Default to manual
            
            scenario_name = scenario.get('name', 'Unnamed Scenario')
            scenario_keyword = scenario.get('keyword', 'Scenario').strip()
            
            # Collect steps
            steps_list = []
            for step in scenario.get('steps', []):
                keyword = step.get('keyword', '').strip()
                text = step.get('text', '').strip()
                steps_list.append(f"{keyword} {text}")
            
            steps_text = '\n'.join(steps_list)
            
            # Check for examples (Scenario Outline)
            examples = scenario.get('examples', [])
            
            if examples and len(examples) > 0:
                # Scenario Outline - create test case with examples
                for example_set in examples:
                    table_header = example_set.get('tableHeader')
                    table_body = example_set.get('tableBody', [])
                    
                    if not table_header or not table_body:
                        continue
                    
                    columns = [cell.get('value', '') for cell in table_header.get('cells', [])]
                    rows = []
                    for table_row in table_body:
                        row_values = [cell.get('value', '') for cell in table_row.get('cells', [])]
                        rows.append(row_values)
                    
                    scenario_examples_json = {
                        "columns": columns,
                        "rows": rows
                    }
                    
                    test_id = generate_test_id(tag, db)
                    
                    db_test_case = TestCase(
                        test_id=test_id,
                        title=scenario_name,
                        description=f"Feature: {feature_name}\n\nScenario Outline: {scenario_name}",
                        test_type=test_type,
                        tag=tag,
                        tags="regression",
                        module_id=db_file.module_id,
                        sub_module=None,
                        feature_section=feature_name,
                        automation_status='working' if test_type == 'automated' else None,
                        scenario_examples=json.dumps(scenario_examples_json),
                        steps_to_reproduce=steps_text,
                        expected_result=None,
                        preconditions=None,
                        test_data=None,
                        automated_script_path=None,
                        created_at=datetime.utcnow()
                    )
                    
                    db.add(db_test_case)
                    db.commit()
                    created_count += 1
            else:
                # Regular Scenario
                test_id = generate_test_id(tag, db)
                
                db_test_case = TestCase(
                    test_id=test_id,
                    title=scenario_name,
                    description=f"Feature: {feature_name}\n\n{scenario_keyword}: {scenario_name}",
                    test_type=test_type,
                    tag=tag,
                    tags="regression",
                    module_id=db_file.module_id,
                    sub_module=None,
                    feature_section=feature_name,
                    automation_status='working' if test_type == 'automated' else None,
                    scenario_examples=None,
                    steps_to_reproduce=steps_text,
                    expected_result=None,
                    preconditions=None,
                    test_data=None,
                    automated_script_path=None,
                    created_at=datetime.utcnow()
                )
                
                db.add(db_test_case)
                db.commit()
                created_count += 1
            
            scenario_index += 1
                
        except Exception as e:
            errors.append(f"Scenario '{scenario.get('name', 'Unknown')}': {str(e)}")
            db.rollback()
            scenario_index += 1
            continue
    
    # Update file status to published and set published_at
    db_file.status = "published"
    from datetime import datetime
    db_file.published_at = datetime.utcnow()
    
    # Check archive limit and handle if this file gets archived later
    # When a file is published, we need to track it for future archiving
    # The archive limit check will happen when status changes to "archived"
    
    # Also upload to Confluence
    confluence_url = None
    try:
        confluence_result = confluence_service.upload_feature_file(
            filename=db_file.name,
            content=db_file.content
        )
        db_file.confluence_url = confluence_result.get('download_link')
        db_file.confluence_attachment_id = confluence_result.get('confluence_attachment_id')
        db_file.confluence_page_id = confluence_result.get('confluence_page_id')
        confluence_url = confluence_result.get('view_link')
    except Exception as e:
        print(f"⚠️ Failed to upload to Confluence: {e}")
        # Continue even if Confluence upload fails
    
    db.commit()
    db.refresh(db_file)
    
    return {
        "message": f"File published successfully. Created {created_count} test case(s).",
        "file": db_file,
        "test_cases_created": created_count,
        "confluence_url": confluence_url,
        "errors": errors if errors else None
    }


@router.post("/feature-files/{file_id}/restore")
async def restore_feature_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restore a published feature file back to draft status (only if owned by current user)"""
    db_file = db.query(FeatureFile).filter(
        FeatureFile.id == file_id,
        FeatureFile.created_by == current_user.id
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    if db_file.status != "published":
        raise HTTPException(
            status_code=400,
            detail="Only published files can be restored to draft"
        )
    
    # Check draft limit before restoring
    draft_count = db.query(FeatureFile).filter(
        FeatureFile.created_by == current_user.id,
        FeatureFile.status == "draft"
    ).count()
    
    if draft_count >= MAX_DRAFT_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_DRAFT_FILES} draft files allowed. Please publish or delete existing drafts before restoring."
        )
    
    # Change status back to draft
    db_file.status = "draft"
    db.commit()
    db.refresh(db_file)
    
    return {
        "message": "File restored to draft successfully",
        "file": db_file
    }


@router.post("/feature-files/{file_id}/archive")
async def archive_feature_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Archive a published feature file
    
    Limits:
    - Maximum 100 archived files per user
    - When 101st file is archived, the oldest archived file (by published_at) is deleted
    """
    from datetime import datetime
    
    db_file = db.query(FeatureFile).filter(
        FeatureFile.id == file_id,
        FeatureFile.created_by == current_user.id
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    if db_file.status != "published":
        raise HTTPException(
            status_code=400,
            detail="Only published files can be archived"
        )
    
    # Check current archived count
    archived_count = db.query(FeatureFile).filter(
        FeatureFile.created_by == current_user.id,
        FeatureFile.status == "archived"
    ).count()
    
    deleted_file_name = None
    
    # If already at max, delete the oldest archived file (by published_at)
    if archived_count >= MAX_ARCHIVED_FILES:
        oldest_archived = db.query(FeatureFile).filter(
            FeatureFile.created_by == current_user.id,
            FeatureFile.status == "archived"
        ).order_by(FeatureFile.published_at.asc().nullsfirst()).first()
        
        if oldest_archived:
            deleted_file_name = oldest_archived.name
            db.delete(oldest_archived)
            db.commit()
    
    # Archive the current file
    db_file.status = "archived"
    db.commit()
    db.refresh(db_file)
    
    response = {
        "message": "File archived successfully",
        "file": db_file
    }
    
    if deleted_file_name:
        response["oldest_deleted"] = deleted_file_name
        response["message"] = f"File archived successfully. Oldest archived file '{deleted_file_name}' was deleted due to {MAX_ARCHIVED_FILES} file limit."
    
    return response