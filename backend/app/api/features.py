from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..core.database import get_db
from ..models.models import Feature, SubModule, User
from ..schemas.schemas import Feature as FeatureSchema, FeatureCreate, FeatureUpdate
from .auth import get_current_active_user

router = APIRouter(tags=["features"])

# Helper function to check if user is admin
def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.get("", response_model=List[FeatureSchema])
@router.get("/", response_model=List[FeatureSchema])
def get_features(
    skip: int = 0,
    limit: int = 100,
    sub_module_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all features, optionally filtered by sub-module"""
    query = db.query(Feature)
    
    if sub_module_id:
        query = query.filter(Feature.sub_module_id == sub_module_id)
    
    features = query.offset(skip).limit(limit).all()
    return features

@router.post("", response_model=FeatureSchema, status_code=201)
@router.post("/", response_model=FeatureSchema, status_code=201)
def create_feature(
    feature: FeatureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new feature"""
    # Check if sub-module exists
    sub_module = db.query(SubModule).filter(SubModule.id == feature.sub_module_id).first()
    if not sub_module:
        raise HTTPException(status_code=404, detail="Sub-module not found")
    
    # Check if feature name already exists in this sub-module
    existing_feature = db.query(Feature).filter(
        Feature.name == feature.name,
        Feature.sub_module_id == feature.sub_module_id
    ).first()
    
    if existing_feature:
        raise HTTPException(
            status_code=400, 
            detail=f"Feature '{feature.name}' already exists in this sub-module"
        )
    
    db_feature = Feature(**feature.dict())
    db.add(db_feature)
    db.commit()
    db.refresh(db_feature)
    return db_feature

@router.get("/{feature_id}", response_model=FeatureSchema)
def get_feature(
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific feature by ID"""
    feature = db.query(Feature).filter(Feature.id == feature_id).first()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    return feature

@router.put("/{feature_id}", response_model=FeatureSchema)
def update_feature(
    feature_id: int,
    feature_update: FeatureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a feature"""
    db_feature = db.query(Feature).filter(Feature.id == feature_id).first()
    if not db_feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    # If name is being updated, check for duplicates in the same sub-module
    if feature_update.name:
        existing_feature = db.query(Feature).filter(
            Feature.name == feature_update.name,
            Feature.sub_module_id == db_feature.sub_module_id,
            Feature.id != feature_id
        ).first()
        
        if existing_feature:
            raise HTTPException(
                status_code=400,
                detail=f"Feature '{feature_update.name}' already exists in this sub-module"
            )
    
    # Update fields
    for key, value in feature_update.dict(exclude_unset=True).items():
        setattr(db_feature, key, value)
    
    db.commit()
    db.refresh(db_feature)
    return db_feature

@router.delete("/{feature_id}")
def delete_feature(
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a feature"""
    db_feature = db.query(Feature).filter(Feature.id == feature_id).first()
    if not db_feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    feature_name = db_feature.name
    db.delete(db_feature)
    db.commit()
    
    return {"message": f"Feature '{feature_name}' deleted successfully"}
