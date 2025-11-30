"""
Application Settings API

Provides endpoints for managing application-wide settings like similarity threshold
and embedding model selection.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime
import threading

from app.core.database import get_db, SessionLocal
from app.models.models import ApplicationSetting, TestCase, Issue, User, UserRole, Module
from app.api.auth import get_current_user
from app.services.embedding_service import get_embedding_service, SUPPORTED_MODELS, DEFAULT_MODEL

router = APIRouter()

# Global state for tracking embedding population progress
embedding_population_status = {
    "is_running": False,
    "entity_type": None,  # "test_case" or "issue"
    "total": 0,
    "processed": 0,
    "errors": 0,
    "started_at": None,
    "completed_at": None,
    "message": None,
    "used_model": None
}


class SettingsResponse(BaseModel):
    similarity_threshold: int
    embedding_model: str
    supported_models: Dict
    models_status: Dict
    embedding_stats: Dict
    can_edit: bool  # True if current user is super admin
    
    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    similarity_threshold: Optional[int] = None
    embedding_model: Optional[str] = None


class EmbeddingStatsResponse(BaseModel):
    total_test_cases: int
    with_embeddings: int
    without_embeddings: int
    by_model: Dict[str, int]
    mismatched_count: int  # Count of embeddings not matching current model


class PopulateEmbeddingsRequest(BaseModel):
    regenerate_all: bool = False  # If true, regenerate all; if false, only missing/mismatched


class PopulateEmbeddingsResponse(BaseModel):
    status: str  # "started", "already_running", "completed"
    message: str
    total: Optional[int] = None


class EmbeddingPopulationStatusResponse(BaseModel):
    is_running: bool
    entity_type: Optional[str] = None
    total: int = 0
    processed: int = 0
    errors: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    message: Optional[str] = None
    used_model: Optional[str] = None
    progress_percent: float = 0.0


def get_setting(db: Session, key: str, default: str = None) -> str:
    """Get a setting value from the database"""
    setting = db.query(ApplicationSetting).filter(ApplicationSetting.key == key).first()
    return setting.value if setting else default


def set_setting(db: Session, key: str, value: str, description: str = None):
    """Set a setting value in the database"""
    setting = db.query(ApplicationSetting).filter(ApplicationSetting.key == key).first()
    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = ApplicationSetting(key=key, value=value, description=description)
        db.add(setting)
    db.commit()


def get_embedding_stats(db: Session, current_model: str) -> Dict:
    """Get statistics about embeddings in the database"""
    total = db.query(func.count(TestCase.id)).scalar()
    with_embeddings = db.query(func.count(TestCase.id)).filter(TestCase.embedding.isnot(None)).scalar()
    without_embeddings = total - with_embeddings
    
    # Count by model
    by_model = {}
    model_counts = db.query(
        TestCase.embedding_model, 
        func.count(TestCase.id)
    ).filter(
        TestCase.embedding.isnot(None)
    ).group_by(TestCase.embedding_model).all()
    
    for model_name, count in model_counts:
        by_model[model_name or "unknown"] = count
    
    # Count mismatched (embeddings not from current model)
    mismatched = db.query(func.count(TestCase.id)).filter(
        TestCase.embedding.isnot(None),
        TestCase.embedding_model != current_model
    ).scalar()
    
    return {
        "total_test_cases": total,
        "with_embeddings": with_embeddings,
        "without_embeddings": without_embeddings,
        "by_model": by_model,
        "mismatched_count": mismatched
    }


@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all application settings"""
    threshold = int(get_setting(db, "similarity_threshold", "75"))
    model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    
    embedding_service = get_embedding_service()
    models_status = embedding_service.get_model_status()
    stats = get_embedding_stats(db, model)
    
    return {
        "similarity_threshold": threshold,
        "embedding_model": model,
        "supported_models": SUPPORTED_MODELS,
        "models_status": models_status,
        "embedding_stats": stats,
        "can_edit": current_user.is_super_admin
    }


@router.put("")
async def update_settings(
    settings: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update application settings (super admin only)"""
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can update application settings")
    
    current_model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    warnings = []
    
    if settings.similarity_threshold is not None:
        if not 0 <= settings.similarity_threshold <= 100:
            raise HTTPException(status_code=400, detail="Threshold must be between 0 and 100")
        set_setting(db, "similarity_threshold", str(settings.similarity_threshold))
    
    if settings.embedding_model is not None:
        if settings.embedding_model not in SUPPORTED_MODELS:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported model. Choose from: {list(SUPPORTED_MODELS.keys())}"
            )
        
        # Check if model is changing and there are existing embeddings
        if settings.embedding_model != current_model:
            stats = get_embedding_stats(db, settings.embedding_model)
            if stats["with_embeddings"] > 0:
                warnings.append(
                    f"Model changed from '{current_model}' to '{settings.embedding_model}'. "
                    f"{stats['with_embeddings']} existing embeddings were generated with a different model. "
                    f"Click 'Regenerate All Embeddings' for consistent similarity results."
                )
        
        set_setting(db, "embedding_model", settings.embedding_model)
    
    # Get updated values
    new_threshold = int(get_setting(db, "similarity_threshold", "75"))
    new_model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    
    return {
        "message": "Settings updated successfully",
        "similarity_threshold": new_threshold,
        "embedding_model": new_model,
        "warnings": warnings if warnings else None
    }


@router.get("/embedding-stats", response_model=EmbeddingStatsResponse)
async def get_embedding_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed embedding statistics"""
    current_model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    stats = get_embedding_stats(db, current_model)
    return stats


def _run_embedding_population_background(regenerate_all: bool, current_model: str, entity_type: str = "test_case"):
    """
    Background function to populate embeddings.
    Runs in a separate thread to avoid blocking the API.
    Uses pagination to avoid loading all entities into memory at once.
    """
    global embedding_population_status
    
    db = SessionLocal()
    try:
        embedding_service = get_embedding_service()
        
        # Build module ID to name mapping first
        modules = {m.id: m.name for m in db.query(Module).all()}
        
        # Use pagination instead of loading all at once to save memory
        batch_size = 10  # Smaller batches to avoid memory issues on small EC2 instances
        page_size = 50   # Fetch entities in pages
        offset = 0
        processed = 0
        errors = 0
        
        while True:
            # Fetch entities in pages (not all at once)
            if entity_type == "test_case":
                if regenerate_all:
                    query = db.query(TestCase)
                else:
                    query = db.query(TestCase).filter(
                        (TestCase.embedding.is_(None)) | 
                        (TestCase.embedding_model != current_model)
                    )
                entities_page = query.order_by(TestCase.id).offset(offset).limit(page_size).all()
            else:  # issue
                if regenerate_all:
                    query = db.query(Issue)
                else:
                    query = db.query(Issue).filter(
                        (Issue.embedding.is_(None)) | 
                        (Issue.embedding_model != current_model)
                    )
                entities_page = query.order_by(Issue.id).offset(offset).limit(page_size).all()
            
            if not entities_page:
                break  # No more entities to process
            
            # Process this page in smaller batches
            for i in range(0, len(entities_page), batch_size):
                batch = entities_page[i:i + batch_size]
                texts = []
                valid_indices = []
                
                for idx, entity in enumerate(batch):
                    try:
                        module_name = modules.get(entity.module_id) if entity.module_id else None
                        
                        if entity_type == "test_case":
                            text = embedding_service.prepare_text_for_embedding(
                                title=entity.title,
                                steps=entity.steps_to_reproduce,
                                tag=entity.tag,
                                test_type=entity.test_type,
                                module_name=module_name,
                                sub_module=entity.sub_module,
                                expected_result=entity.expected_result
                            )
                        else:  # issue
                            text = embedding_service.prepare_issue_text_for_embedding(
                                title=entity.title,
                                description=entity.description,
                                module_name=module_name,
                                status=entity.status,
                                priority=entity.priority,
                                severity=entity.severity,
                                reporter_name=entity.reporter_name,
                                assignee_name=entity.jira_assignee_name
                            )
                        
                        if text:
                            texts.append(text)
                            valid_indices.append(idx)
                    except Exception as e:
                        print(f"Error preparing text for entity {entity.id}: {e}")
                        errors += 1
                
                if texts:
                    try:
                        embeddings = embedding_service.generate_embeddings_batch(texts, current_model)
                        
                        for j, embedding in enumerate(embeddings):
                            entity = batch[valid_indices[j]]
                            entity.embedding = embedding
                            entity.embedding_model = current_model
                            processed += 1
                        
                        db.commit()
                        
                        # Update progress
                        embedding_population_status["processed"] = processed
                        embedding_population_status["errors"] = errors
                        embedding_population_status["message"] = f"Processing: {processed}/{embedding_population_status['total']}"
                        
                    except Exception as e:
                        print(f"Error processing batch: {e}")
                        errors += len(texts)
                        embedding_population_status["errors"] = errors
                        db.rollback()
                
                # Clear any cached objects to free memory
                db.expire_all()
            
            # Move to next page
            offset += page_size
            
            # Clear references to help garbage collection
            entities_page = None
            import gc
            gc.collect()
        
        # Mark as completed
        embedding_population_status["is_running"] = False
        embedding_population_status["processed"] = processed
        embedding_population_status["errors"] = errors
        embedding_population_status["completed_at"] = datetime.utcnow().isoformat()
        embedding_population_status["message"] = f"Completed: {processed}/{embedding_population_status['total']} embeddings generated"
        
    except Exception as e:
        print(f"Critical error in embedding population: {e}")
        import traceback
        traceback.print_exc()
        embedding_population_status["is_running"] = False
        embedding_population_status["message"] = f"Error: {str(e)}"
        embedding_population_status["completed_at"] = datetime.utcnow().isoformat()
    finally:
        db.close()


@router.post("/populate-embeddings", response_model=PopulateEmbeddingsResponse)
async def populate_embeddings(
    request: PopulateEmbeddingsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate embeddings for test cases (admin only).
    
    This runs as a background task to avoid timeouts.
    Use GET /settings/embedding-population-status to check progress.
    
    If regenerate_all=True, regenerates all embeddings.
    If regenerate_all=False (default), only generates for test cases without embeddings
    or with embeddings from a different model.
    """
    global embedding_population_status
    
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can populate embeddings")
    
    # Check if already running
    if embedding_population_status["is_running"]:
        return {
            "status": "already_running",
            "message": f"Embedding population already in progress: {embedding_population_status['processed']}/{embedding_population_status['total']} completed",
            "total": embedding_population_status["total"]
        }
    
    current_model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    
    # Count how many need processing
    if request.regenerate_all:
        total = db.query(func.count(TestCase.id)).scalar() or 0
    else:
        total = db.query(func.count(TestCase.id)).filter(
            (TestCase.embedding.is_(None)) | 
            (TestCase.embedding_model != current_model)
        ).scalar() or 0
    
    if total == 0:
        return {
            "status": "completed",
            "message": "All test cases already have embeddings with the current model",
            "total": 0
        }
    
    # Reset status and start background task
    embedding_population_status = {
        "is_running": True,
        "entity_type": "test_case",
        "total": total,
        "processed": 0,
        "errors": 0,
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "message": "Starting embedding population...",
        "used_model": current_model
    }
    
    # Start background thread (not BackgroundTasks - we need it to survive the request)
    thread = threading.Thread(
        target=_run_embedding_population_background,
        args=(request.regenerate_all, current_model, "test_case")
    )
    thread.daemon = True
    thread.start()
    
    return {
        "status": "started",
        "message": f"Started embedding population for {total} test cases. Check /settings/embedding-population-status for progress.",
        "total": total
    }


@router.get("/embedding-population-status", response_model=EmbeddingPopulationStatusResponse)
async def get_embedding_population_status(
    current_user: User = Depends(get_current_user)
):
    """Get the current status of embedding population task"""
    global embedding_population_status
    
    progress = 0.0
    if embedding_population_status["total"] > 0:
        progress = (embedding_population_status["processed"] / embedding_population_status["total"]) * 100
    
    return {
        **embedding_population_status,
        "progress_percent": round(progress, 1)
    }


class IssueEmbeddingStatsResponse(BaseModel):
    total_issues: int
    with_embeddings: int
    without_embeddings: int
    by_model: Dict[str, int]
    mismatched_count: int


def get_issue_embedding_stats(db: Session, current_model: str) -> Dict:
    """Get statistics about issue embeddings"""
    total = db.query(func.count(Issue.id)).scalar() or 0
    with_embeddings = db.query(func.count(Issue.id)).filter(
        Issue.embedding.isnot(None)
    ).scalar() or 0
    without_embeddings = total - with_embeddings
    
    # Count by model
    model_counts = db.query(
        Issue.embedding_model,
        func.count(Issue.id)
    ).filter(
        Issue.embedding.isnot(None)
    ).group_by(Issue.embedding_model).all()
    
    by_model = {model: count for model, count in model_counts if model}
    
    # Count mismatched (embeddings from different model than current)
    mismatched = db.query(func.count(Issue.id)).filter(
        Issue.embedding.isnot(None),
        Issue.embedding_model != current_model
    ).scalar() or 0
    
    return {
        "total_issues": total,
        "with_embeddings": with_embeddings,
        "without_embeddings": without_embeddings,
        "by_model": by_model,
        "mismatched_count": mismatched
    }


@router.get("/issue-embedding-stats", response_model=IssueEmbeddingStatsResponse)
async def get_issue_embedding_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed issue embedding statistics"""
    current_model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    stats = get_issue_embedding_stats(db, current_model)
    return stats


@router.post("/populate-issue-embeddings", response_model=PopulateEmbeddingsResponse)
async def populate_issue_embeddings(
    request: PopulateEmbeddingsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate embeddings for issues (admin only).
    
    This runs as a background task to avoid timeouts.
    Use GET /settings/embedding-population-status to check progress.
    
    If regenerate_all=True, regenerates all embeddings.
    If regenerate_all=False (default), only generates for issues without embeddings
    or with embeddings from a different model.
    """
    global embedding_population_status
    
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can populate embeddings")
    
    # Check if already running
    if embedding_population_status["is_running"]:
        return {
            "status": "already_running",
            "message": f"Embedding population already in progress: {embedding_population_status['processed']}/{embedding_population_status['total']} completed",
            "total": embedding_population_status["total"]
        }
    
    current_model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    
    # Count how many need processing
    if request.regenerate_all:
        total = db.query(func.count(Issue.id)).scalar() or 0
    else:
        total = db.query(func.count(Issue.id)).filter(
            (Issue.embedding.is_(None)) | 
            (Issue.embedding_model != current_model)
        ).scalar() or 0
    
    if total == 0:
        return {
            "status": "completed",
            "message": "All issues already have embeddings with the current model",
            "total": 0
        }
    
    # Reset status and start background task
    embedding_population_status = {
        "is_running": True,
        "entity_type": "issue",
        "total": total,
        "processed": 0,
        "errors": 0,
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "message": "Starting issue embedding population...",
        "used_model": current_model
    }
    
    # Start background thread
    thread = threading.Thread(
        target=_run_embedding_population_background,
        args=(request.regenerate_all, current_model, "issue")
    )
    thread.daemon = True
    thread.start()
    
    return {
        "status": "started",
        "message": f"Started embedding population for {total} issues. Check /settings/embedding-population-status for progress.",
        "total": total
    }
