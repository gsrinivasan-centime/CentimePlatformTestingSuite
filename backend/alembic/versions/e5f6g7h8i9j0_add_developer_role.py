"""Add developer role to UserRole enum

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2024-11-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'developer' value to the userrole enum type in PostgreSQL
    # First, we need to add the new value to the enum type
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'developer'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing values from an enum type directly
    # To downgrade, we would need to:
    # 1. Create a new enum type without 'developer'
    # 2. Update all rows with 'developer' to another value (e.g., 'tester')
    # 3. Alter the column to use the new enum
    # 4. Drop the old enum
    
    # Update any users with 'developer' role to 'tester' before removing the enum value
    op.execute("UPDATE users SET role = 'tester' WHERE role = 'developer'")
    
    # Note: Full enum type replacement would require more complex migration
    # For safety, we'll just convert existing developers to testers
    pass
