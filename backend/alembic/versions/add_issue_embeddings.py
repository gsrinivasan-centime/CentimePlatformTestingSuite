"""Add embedding columns to issues table

Revision ID: f0a1b2c3d4e5
Revises: e5f6g7h8i9j0
Create Date: 2025-11-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f0a1b2c3d4e5'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add embedding column (384-dimension float array for sentence-transformers)
    op.add_column('issues', sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True))
    
    # Add embedding_model column to track which model generated the embedding
    op.add_column('issues', sa.Column('embedding_model', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('issues', 'embedding_model')
    op.drop_column('issues', 'embedding')
