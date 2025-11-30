"""
Application Settings API

Provides endpoints for managing application-wide settings like similarity threshold
and embedding model selection.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.models import ApplicationSetting, TestCase, User, UserRole
from app.api.auth import get_current_user
from app.services.embedding_service import get_embedding_service, SUPPORTED_MODELS, DEFAULT_MODEL

router = APIRouter()


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
    processed: int
    total: int
    errors: int
    used_model: str
    message: str


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


@router.post("/populate-embeddings", response_model=PopulateEmbeddingsResponse)
async def populate_embeddings(
    request: PopulateEmbeddingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate embeddings for test cases (admin only).
    
    If regenerate_all=True, regenerates all embeddings.
    If regenerate_all=False (default), only generates for test cases without embeddings
    or with embeddings from a different model.
    """
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admin can populate embeddings")
    
    current_model = get_setting(db, "embedding_model", DEFAULT_MODEL)
    embedding_service = get_embedding_service()
    
    # Determine which test cases to process
    if request.regenerate_all:
        test_cases = db.query(TestCase).all()
    else:
        # Only missing or mismatched
        test_cases = db.query(TestCase).filter(
            (TestCase.embedding.is_(None)) | 
            (TestCase.embedding_model != current_model)
        ).all()
    
    total = len(test_cases)
    processed = 0
    errors = 0
    
    # Build module ID to name mapping for embedding text
    from app.models.models import Module
    modules = {m.id: m.name for m in db.query(Module).all()}
    
    # Process in batches for efficiency
    batch_size = 50
    for i in range(0, total, batch_size):
        batch = test_cases[i:i + batch_size]
        texts = []
        valid_indices = []
        
        for idx, tc in enumerate(batch):
            # Include all relevant fields for better semantic search
            module_name = modules.get(tc.module_id) if tc.module_id else None
            text = embedding_service.prepare_text_for_embedding(
                title=tc.title,
                steps=tc.steps_to_reproduce,
                tag=tc.tag,
                test_type=tc.test_type,
                module_name=module_name,
                sub_module=tc.sub_module,
                expected_result=tc.expected_result
            )
            if text:
                texts.append(text)
                valid_indices.append(idx)
        
        if texts:
            try:
                embeddings = embedding_service.generate_embeddings_batch(texts, current_model)
                
                for j, embedding in enumerate(embeddings):
                    tc = batch[valid_indices[j]]
                    tc.embedding = embedding
                    tc.embedding_model = current_model
                    processed += 1
                
                db.commit()
            except Exception as e:
                print(f"Error processing batch: {e}")
                errors += len(texts)
                db.rollback()
    
    return {
        "processed": processed,
        "total": total,
        "errors": errors,
        "used_model": current_model,
        "message": f"Successfully generated embeddings for {processed} test cases using {current_model}"
    }
