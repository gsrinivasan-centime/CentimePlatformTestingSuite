#!/usr/bin/env python3
"""
Initialization script for Centime Test Management System
Creates initial admin user, modules, and sample data
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal
from app.models.models import Base, User, Module, Release, TestCase, UserRole, TestType
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def init_database():
    """Initialize database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")

def create_admin_user(db: Session):
    """Create admin user if not exists"""
    print("\nCreating admin user...")
    
    # Check if admin exists
    existing_admin = db.query(User).filter(User.email == "admin@centime.com").first()
    if existing_admin:
        print("⚠ Admin user already exists")
        return existing_admin
    
    admin = User(
        email="admin@centime.com",
        hashed_password=get_password_hash("Admin123!"),
        full_name="System Administrator",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("✓ Admin user created")
    print(f"  Email: admin@centime.com")
    print(f"  Password: Admin123!")
    return admin

def create_test_user(db: Session):
    """Create test user if not exists"""
    print("\nCreating test user...")
    
    existing_user = db.query(User).filter(User.email == "tester@centime.com").first()
    if existing_user:
        print("⚠ Test user already exists")
        return existing_user
    
    tester = User(
        email="tester@centime.com",
        hashed_password=get_password_hash("Tester123!"),
        full_name="Test Engineer",
        role=UserRole.TESTER,
        is_active=True
    )
    db.add(tester)
    db.commit()
    db.refresh(tester)
    print("✓ Test user created")
    print(f"  Email: tester@centime.com")
    print(f"  Password: Tester123!")
    return tester

def create_modules(db: Session):
    """Create application modules"""
    print("\nCreating modules...")
    
    modules_data = [
        {
            "name": "Account Payable",
            "description": "Invoice management, vendor payments, and approval workflows"
        },
        {
            "name": "Account Receivable",
            "description": "Customer invoicing, payment collection, and aging reports"
        },
        {
            "name": "Cash Flow Forecasting",
            "description": "Cash position analysis, forecasting, and scenario planning"
        },
        {
            "name": "Banking Integrations",
            "description": "Bank account connections, transaction sync, and reconciliation"
        }
    ]
    
    created_modules = []
    for module_data in modules_data:
        # Check if module exists
        existing_module = db.query(Module).filter(Module.name == module_data["name"]).first()
        if existing_module:
            print(f"⚠ Module '{module_data['name']}' already exists")
            created_modules.append(existing_module)
            continue
        
        module = Module(**module_data)
        db.add(module)
        db.commit()
        db.refresh(module)
        created_modules.append(module)
        print(f"✓ Module '{module.name}' created")
    
    return created_modules

def create_sample_release(db: Session):
    """Create sample release"""
    print("\nCreating sample release...")
    
    existing_release = db.query(Release).filter(Release.version == "v1.0.0").first()
    if existing_release:
        print("⚠ Sample release already exists")
        return existing_release
    
    release = Release(
        version="v1.0.0",
        name="Initial Release",
        description="First release of Cash Management System",
        release_date=datetime.utcnow() + timedelta(days=30)
    )
    db.add(release)
    db.commit()
    db.refresh(release)
    print(f"✓ Release '{release.version}' created")
    return release

def create_sample_test_cases(db: Session, modules: list, user: User):
    """Create sample test cases"""
    print("\nCreating sample test cases...")
    
    # Find Account Payable module
    ap_module = next((m for m in modules if m.name == "Account Payable"), None)
    if not ap_module:
        print("⚠ Account Payable module not found")
        return
    
    test_cases_data = [
        {
            "test_id": "TC_UI_001",
            "title": "Verify Login Functionality",
            "description": "Test user login with valid and invalid credentials",
            "test_type": TestType.AUTOMATED,
            "module_id": ap_module.id,
            "steps_to_reproduce": """
1. Navigate to login page
2. Enter valid email address
3. Enter valid password
4. Click login button
5. Verify user is redirected to dashboard
            """,
            "expected_result": "User should be successfully logged in and redirected to dashboard",
            "preconditions": "User account must exist in the system",
            "automated_script_path": "test_suite/ui_tests/test_login_ui.py::TestLoginFunctionality::test_successful_login",
            "created_by": user.id
        },
        {
            "test_id": "TC_API_001",
            "title": "Verify Account Payable Invoice API",
            "description": "Test invoice management API endpoints",
            "test_type": TestType.AUTOMATED,
            "module_id": ap_module.id,
            "steps_to_reproduce": """
1. Send GET request to /api/invoices
2. Verify response status code is 200
3. Create new invoice via POST /api/invoices
4. Verify invoice is created successfully
5. Update invoice status via PATCH
6. Verify invoice is updated
            """,
            "expected_result": "All API operations should work correctly with proper status codes and data",
            "preconditions": "Valid authentication token must be provided",
            "automated_script_path": "test_suite/api_tests/test_account_payable_api.py::TestAccountPayableAPI::test_get_invoices_list",
            "created_by": user.id
        },
        {
            "test_id": "TC_MANUAL_001",
            "title": "Verify Invoice Approval Workflow",
            "description": "Manual test for multi-level invoice approval process",
            "test_type": TestType.MANUAL,
            "module_id": ap_module.id,
            "steps_to_reproduce": """
1. Login as standard user
2. Create a new invoice with amount > $10,000
3. Submit invoice for approval
4. Login as approver
5. Review and approve invoice
6. Verify invoice status changes to 'Approved'
7. Verify email notification sent
            """,
            "expected_result": "Invoice should go through approval workflow and status should update correctly",
            "preconditions": "Test users with different roles must exist",
            "test_data": "Invoice amount: $15,000\nVendor: Test Vendor Inc.",
            "created_by": user.id
        }
    ]
    
    for tc_data in test_cases_data:
        # Check if test case exists
        existing_tc = db.query(TestCase).filter(TestCase.test_id == tc_data["test_id"]).first()
        if existing_tc:
            print(f"⚠ Test case '{tc_data['test_id']}' already exists")
            continue
        
        test_case = TestCase(**tc_data)
        db.add(test_case)
        db.commit()
        db.refresh(test_case)
        print(f"✓ Test case '{test_case.test_id}' - {test_case.title} created")

def main():
    """Main initialization function"""
    print("=" * 60)
    print("Centime Test Management System - Database Initialization")
    print("=" * 60)
    
    # Create database tables
    init_database()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create users
        admin = create_admin_user(db)
        tester = create_test_user(db)
        
        # Create modules
        modules = create_modules(db)
        
        # Create sample release
        release = create_sample_release(db)
        
        # Create sample test cases
        create_sample_test_cases(db, modules, admin)
        
        print("\n" + "=" * 60)
        print("✅ Initialization completed successfully!")
        print("=" * 60)
        print("\nYou can now:")
        print("1. Start the backend server: uvicorn app.main:app --reload")
        print("2. Access API docs: http://localhost:8000/docs")
        print("3. Login with:")
        print("   Admin - admin@centime.com / Admin123!")
        print("   Tester - tester@centime.com / Tester123!")
        print("4. Run tests: cd ../test_suite && pytest -v")
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
