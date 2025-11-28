"""Add is_super_admin column to users table

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-11-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_super_admin column with default False
    op.add_column('users', sa.Column('is_super_admin', sa.Boolean(), nullable=True, server_default='false'))
    
    # Update existing column to have proper default
    op.execute("UPDATE users SET is_super_admin = false WHERE is_super_admin IS NULL")
    
    # Make column non-nullable after setting defaults
    op.alter_column('users', 'is_super_admin', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'is_super_admin')
