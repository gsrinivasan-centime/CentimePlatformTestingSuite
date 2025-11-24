from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Module, User
from app.schemas.schemas import Module as ModuleSchema, ModuleCreate
from app.api.auth import get_current_active_user

router = APIRouter()

@router.get("", response_model=List[ModuleSchema])
@router.get("/", response_model=List[ModuleSchema])
def list_modules(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    modules = db.query(Module).offset(skip).limit(limit).all()
    return modules

@router.post("/", response_model=ModuleSchema, status_code=201)
def create_module(
    module: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if module already exists
    db_module = db.query(Module).filter(Module.name == module.name).first()
    if db_module:
        raise HTTPException(status_code=400, detail="Module already exists")
    
    db_module = Module(**module.dict())
    db.add(db_module)
    db.commit()
    db.refresh(db_module)
    return db_module

@router.get("/{module_id}", response_model=ModuleSchema)
def get_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    return module

@router.put("/{module_id}", response_model=ModuleSchema)
def update_module(
    module_id: int,
    module_update: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Check if new name conflicts with existing module
    if module_update.name != module.name:
        existing = db.query(Module).filter(Module.name == module_update.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Module name already exists")
    
    for key, value in module_update.dict().items():
        setattr(module, key, value)
    
    db.commit()
    db.refresh(module)
    return module

@router.delete("/{module_id}", status_code=204)
def delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    db.delete(module)
    db.commit()
    return None
