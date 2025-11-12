from fastapi import APIRouter, Depends, HTTPException, Query
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

@router.get("/feature-files", response_model=List[FeatureFileSchema])
async def get_all_feature_files(
    status: Optional[str] = Query(None, description="Filter by status (draft, published, archived)"),
    module_id: Optional[int] = Query(None, description="Filter by module"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all feature files"""
    query = db.query(FeatureFile)
    
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
    """Get a specific feature file"""
    file = db.query(FeatureFile).filter(FeatureFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    return file


@router.post("/feature-files", response_model=FeatureFileSchema)
async def create_feature_file(
    file: FeatureFileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new feature file"""
    db_file = FeatureFile(
        **file.dict(),
        created_by=current_user.id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@router.put("/feature-files/{file_id}", response_model=FeatureFileSchema)
async def update_feature_file(
    file_id: int,
    file: FeatureFileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing feature file"""
    db_file = db.query(FeatureFile).filter(FeatureFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    update_data = file.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_file, field, value)
    
    db.commit()
    db.refresh(db_file)
    return db_file


@router.delete("/feature-files/{file_id}")
async def delete_feature_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a feature file"""
    db_file = db.query(FeatureFile).filter(FeatureFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    db.delete(db_file)
    db.commit()
    return {"message": "Feature file deleted successfully"}


@router.post("/feature-files/{file_id}/publish")
async def publish_feature_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publish a feature file (change status from draft to published)"""
    db_file = db.query(FeatureFile).filter(FeatureFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="Feature file not found")
    
    db_file.status = "published"
    db.commit()
    db.refresh(db_file)
    return db_file
