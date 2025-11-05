from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.models.models import Release, User, ReleaseTestCase, ExecutionStatus
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
