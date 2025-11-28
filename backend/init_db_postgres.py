#!/usr/bin/env python3
"""
Database initialization script for PostgreSQL migration
Uses Alembic for migrations and creates initial data
"""

import sys
import os
import subprocess

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import User, Module, Release, TestCase, UserRole, TestType
from app.core.security import get_password_hash
from datetime import datetime, timedelta

def run_migrations():
    """Run Alembic migrations to create all tables"""
    print("Running database migrations with Alembic...")
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
        print("✓ Database migrations completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Migration failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("✗ Alembic not found. Make sure it's installed: pip install alembic")
        return False

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
        is_active=True,
        is_email_verified=True,
        email_verified_at=datetime.utcnow()
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
    
    existing_tester = db.query(User).filter(User.email == "tester@centime.com").first()
    if existing_tester:
        print("⚠ Test user already exists")
        return existing_tester
    
    tester = User(
        email="tester@centime.com",
        hashed_password=get_password_hash("Tester123!"),
        full_name="Test User",
        role=UserRole.TESTER,
        is_active=True,
        is_email_verified=True,
        email_verified_at=datetime.utcnow()
    )
    db.add(tester)
    db.commit()
    db.refresh(tester)
    print("✓ Test user created")
    print(f"  Email: tester@centime.com")
    print(f"  Password: Tester123!")
    return tester

def create_modules(db: Session):
    """Create sample modules"""
    print("\nCreating sample modules...")
    
    modules_data = [
        {"name": "Account Payable", "description": "Accounts Payable module"},
        {"name": "Vendor Management", "description": "Vendor Management module"},
        {"name": "Invoice Processing", "description": "Invoice Processing module"},
        {"name": "Payment Processing", "description": "Payment Processing module"},
        {"name": "Analytics & Reporting", "description": "Analytics and Reporting module"}
    ]
    
    created_modules = []
    for module_data in modules_data:
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
        print(f"✓ Created module: {module.name}")
    
    return created_modules

def create_sample_release(db: Session, admin: User):
    """Create a sample release"""
    print("\nCreating sample release...")
    
    existing_release = db.query(Release).filter(Release.version == "v1.0.0").first()
    if existing_release:
        print("⚠ Sample release already exists")
        return existing_release
    
    release = Release(
        version="v1.0.0",
        name="Initial Release",
        description="First release of the test management system",
        release_date=datetime.utcnow() + timedelta(days=30),
        environment="staging",
        overall_status="not_started",
        qa_lead_id=admin.id
    )
    db.add(release)
    db.commit()
    db.refresh(release)
    print(f"✓ Created release: {release.version}")
    return release

def create_sample_test_case(db: Session, module: Module, user: User):
    """Create a sample test case"""
    print("\nCreating sample test case...")
    
    existing_tc = db.query(TestCase).filter(TestCase.test_id == "TC-001").first()
    if existing_tc:
        print("⚠ Sample test case already exists")
        return existing_tc
    
    test_case = TestCase(
        test_id="TC-001",
        title="Sample Login Test",
        description="Verify user can login successfully",
        test_type=TestType.MANUAL,
        module_id=module.id,
        tag="ui",
        steps_to_reproduce="1. Navigate to login page\n2. Enter valid credentials\n3. Click Login",
        expected_result="User should be logged in successfully",
        preconditions="User account exists in the system",
        created_by=user.id
    )
    db.add(test_case)
    db.commit()
    db.refresh(test_case)
    print(f"✓ Created test case: {test_case.test_id}")
    return test_case

def main():
    """Main initialization function"""
    print("=" * 60)
    print("Centime Test Management System - Database Initialization")
    print("=" * 60)
    
    # Run migrations
    if not run_migrations():
        print("\n✗ Database initialization failed. Please check your database connection.")
        print("  Make sure PostgreSQL is running and DATABASE_URL is correct in .env file")
        sys.exit(1)
    
    # Create initial data
    db = SessionLocal()
    try:
        admin = create_admin_user(db)
        tester = create_test_user(db)
        modules = create_modules(db)
        release = create_sample_release(db, admin)
        
        if modules:
            create_sample_test_case(db, modules[0], admin)
        
        print("\n" + "=" * 60)
        print("✓ Database initialization completed successfully!")
        print("=" * 60)
        print("\nYou can now:")
        print("1. Start the backend server: ./start_backend.sh")
        print("2. Access the application at: http://localhost:8000")
        print("3. Login with:")
        print("   - Admin: admin@centime.com / Admin123!")
        print("   - Tester: tester@centime.com / Tester123!")
        print("\nAPI documentation available at: http://localhost:8000/docs")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error during initialization: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
