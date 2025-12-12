from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import User, UserRole, FeatureFile
from app.schemas.schemas import User as UserSchema, UserUpdate, UserCreate
from app.api.auth import get_current_active_user, get_current_admin_or_super_admin, can_edit_users
from app.core.security import get_password_hash
from app.services.email_service import EmailService

router = APIRouter()


@router.get("", response_model=List[UserSchema])
@router.get("/", response_model=List[UserSchema])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)  # All authenticated users can read
):
    """List all users. All authenticated users can view the list."""
    users = db.query(User).offset(skip).limit(limit).all()
    # Add can_edit flag based on current user's role
    return users

@router.get("/{user_id}", response_model=UserSchema)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)  # All authenticated users can read
):
    """Get a specific user. All authenticated users can view."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/permissions/me")
def get_my_permissions(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's permissions for Users and Settings pages."""
    return {
        "can_edit_users": can_edit_users(current_user),
        "can_edit_settings": current_user.is_super_admin,
        "role": current_user.role,
        "is_super_admin": current_user.is_super_admin
    }


@router.post("", response_model=UserSchema, status_code=201)
@router.post("/", response_model=UserSchema, status_code=201)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_super_admin)  # Admin or Super Admin only
):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate email domain
    if not user.email.endswith("@centime.com"):
        raise HTTPException(status_code=400, detail="Email must be from @centime.com domain")
    
    # Convert role to proper enum if needed
    role_value = user.role
    if isinstance(role_value, str):
        role_value = role_value.upper()
    elif hasattr(role_value, 'value'):
        role_value = role_value.value.upper()
    try:
        role_enum = UserRole(role_value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role_value}. Valid roles are: ADMIN, TESTER, DEVELOPER")
    
    # Create new user (unverified by default)
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=role_enum,
        is_email_verified=False  # Require email verification
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send verification email
    try:
        EmailService.send_verification_email(user.email, is_admin_created=True)
        print(f"Verification email sent to {user.email}")
    except Exception as e:
        print(f"Failed to send verification email to {user.email}: {e}")
        # Don't fail user creation if email fails - admin can resend
    
    return db_user

@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_super_admin)  # Admin or Super Admin only
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    
    # If password is being updated, hash it
    if 'password' in update_data and update_data['password']:
        update_data['hashed_password'] = get_password_hash(update_data.pop('password'))
    
    # If role is being updated, ensure it's converted to uppercase UserRole enum
    if 'role' in update_data and update_data['role']:
        role_value = update_data['role']
        # Handle both string and enum inputs
        if isinstance(role_value, str):
            role_value = role_value.upper()
        elif hasattr(role_value, 'value'):
            role_value = role_value.value.upper()
        # Convert to UserRole enum
        try:
            update_data['role'] = UserRole(role_value)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role_value}. Valid roles are: ADMIN, TESTER, DEVELOPER")
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_or_super_admin)  # Admin or Super Admin only
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Delete all feature files belonging to this user (drafts + archived + published)
    db.query(FeatureFile).filter(FeatureFile.created_by == user.id).delete()
    
    db.delete(user)
    db.commit()
    return None
