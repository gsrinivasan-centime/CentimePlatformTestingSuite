from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import SubModule as SubModuleModel, User, UserRole
from app.schemas.schemas import SubModule, SubModuleCreate, SubModuleUpdate
from app.api.auth import get_current_user

router = APIRouter()

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """Verify current user is an admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to perform this action"
        )
    return current_user

@router.get("", response_model=List[SubModule])
@router.get("/", response_model=List[SubModule])
def get_sub_modules(
    module_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all sub-modules, optionally filtered by module_id
    """
    query = db.query(SubModuleModel)
    
    if module_id:
        query = query.filter(SubModuleModel.module_id == module_id)
    
    return query.order_by(SubModuleModel.name).all()

@router.post("", response_model=SubModule)
@router.post("/", response_model=SubModule)
def create_sub_module(
    sub_module: SubModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Create a new sub-module
    """
    # Check if sub-module with same name already exists in this module
    existing = db.query(SubModuleModel).filter(
        SubModuleModel.module_id == sub_module.module_id,
        SubModuleModel.name == sub_module.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Sub-module '{sub_module.name}' already exists in this module"
        )
    
    db_sub_module = SubModuleModel(**sub_module.dict())
    db.add(db_sub_module)
    db.commit()
    db.refresh(db_sub_module)
    return db_sub_module

@router.get("/{sub_module_id}", response_model=SubModule)
def get_sub_module(
    sub_module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific sub-module by ID
    """
    sub_module = db.query(SubModuleModel).filter(SubModuleModel.id == sub_module_id).first()
    if not sub_module:
        raise HTTPException(status_code=404, detail="Sub-module not found")
    return sub_module

@router.put("/{sub_module_id}", response_model=SubModule)
def update_sub_module(
    sub_module_id: int,
    sub_module_update: SubModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Update a sub-module
    """
    db_sub_module = db.query(SubModuleModel).filter(SubModuleModel.id == sub_module_id).first()
    if not db_sub_module:
        raise HTTPException(status_code=404, detail="Sub-module not found")
    
    # Check for duplicate name if name is being updated
    if sub_module_update.name and sub_module_update.name != db_sub_module.name:
        existing = db.query(SubModuleModel).filter(
            SubModuleModel.module_id == db_sub_module.module_id,
            SubModuleModel.name == sub_module_update.name,
            SubModuleModel.id != sub_module_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Sub-module '{sub_module_update.name}' already exists in this module"
            )
    
    # Update fields
    update_data = sub_module_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_sub_module, field, value)
    
    db.commit()
    db.refresh(db_sub_module)
    return db_sub_module

@router.delete("/{sub_module_id}")
def delete_sub_module(
    sub_module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Delete a sub-module
    Note: Test cases referencing this sub-module will still have the sub_module field populated
    """
    db_sub_module = db.query(SubModuleModel).filter(SubModuleModel.id == sub_module_id).first()
    if not db_sub_module:
        raise HTTPException(status_code=404, detail="Sub-module not found")
    
    db.delete(db_sub_module)
    db.commit()
    return {"message": "Sub-module deleted successfully"}
