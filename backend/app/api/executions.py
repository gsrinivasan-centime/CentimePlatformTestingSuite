from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import TestExecution, TestCase, User, TestStatus
from app.schemas.schemas import (
    TestExecution as TestExecutionSchema,
    TestExecutionCreate
)
from app.api.auth import get_current_active_user
import subprocess
import os

router = APIRouter()

@router.get("", response_model=List[TestExecutionSchema])
@router.get("/", response_model=List[TestExecutionSchema])
def list_executions(
    skip: int = 0,
    limit: int = 100,
    release_id: int = None,
    test_case_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(TestExecution)
    
    if release_id:
        query = query.filter(TestExecution.release_id == release_id)
    if test_case_id:
        query = query.filter(TestExecution.test_case_id == test_case_id)
    
    executions = query.order_by(TestExecution.executed_at.desc()).offset(skip).limit(limit).all()
    return executions

@router.post("/", response_model=TestExecutionSchema, status_code=201)
def create_execution(
    execution: TestExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_execution = TestExecution(**execution.dict(), executor_id=current_user.id)
    db.add(db_execution)
    db.commit()
    db.refresh(db_execution)
    return db_execution

@router.post("/execute/{test_case_id}")
async def execute_test_case(
    test_case_id: int,
    release_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Execute an automated test case"""
    test_case = db.query(TestCase).filter(TestCase.id == test_case_id).first()
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    if test_case.test_type == "manual":
        raise HTTPException(status_code=400, detail="Cannot auto-execute manual test cases")
    
    if not test_case.automated_script_path:
        raise HTTPException(status_code=400, detail="No automated script path defined")
    
    # Create pending execution record
    db_execution = TestExecution(
        test_case_id=test_case_id,
        release_id=release_id,
        executor_id=current_user.id,
        status=TestStatus.PENDING
    )
    db.add(db_execution)
    db.commit()
    db.refresh(db_execution)
    
    # Execute in background
    background_tasks.add_task(run_automated_test, db_execution.id, test_case.automated_script_path)
    
    return {
        "message": "Test execution started",
        "execution_id": db_execution.id,
        "status": "pending"
    }

def run_automated_test(execution_id: int, script_path: str):
    """Background task to run automated test"""
    from app.core.database import SessionLocal
    db = SessionLocal()
    
    try:
        # Run pytest for the specific test
        result = subprocess.run(
            ["pytest", script_path, "-v", "--tb=short"],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        # Update execution record
        execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
        if execution:
            if result.returncode == 0:
                execution.status = TestStatus.PASS
                execution.actual_result = "Test passed successfully"
            else:
                execution.status = TestStatus.FAIL
                execution.actual_result = result.stdout
                execution.error_message = result.stderr
            
            db.commit()
    except subprocess.TimeoutExpired:
        execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
        if execution:
            execution.status = TestStatus.FAIL
            execution.error_message = "Test execution timed out"
            db.commit()
    except Exception as e:
        execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
        if execution:
            execution.status = TestStatus.FAIL
            execution.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.get("/{execution_id}", response_model=TestExecutionSchema)
def get_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    execution = db.query(TestExecution).filter(TestExecution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution
