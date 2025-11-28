"""Add embedding columns and application_settings table

Revision ID: a1b2c3d4e5f6
Revises: f621b5e4e51f
Create Date: 2025-11-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f621b5e4e51f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Add embedding columns to test_cases table
    op.add_column('test_cases', sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True))
    op.add_column('test_cases', sa.Column('embedding_model', sa.String(50), nullable=True))
    
    # Create HNSW index for fast similarity search
    # Note: We store as ARRAY and convert to vector for similarity search
    # This avoids issues with pgvector column type in SQLAlchemy
    
    # Create application_settings table
    op.create_table(
        'application_settings',
        sa.Column('key', sa.String(100), primary_key=True),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Insert default settings
    op.execute("""
        INSERT INTO application_settings (key, value, description) VALUES 
        ('similarity_threshold', '75', 'Similarity threshold percentage for duplicate detection (0-100)'),
        ('embedding_model', 'all-MiniLM-L6-v2', 'Model used for generating embeddings (all-MiniLM-L6-v2 or BAAI/bge-small-en-v1.5)')
    """)


def downgrade() -> None:
    # Drop application_settings table
    op.drop_table('application_settings')
    
    # Remove embedding columns from test_cases
    op.drop_column('test_cases', 'embedding_model')
    op.drop_column('test_cases', 'embedding')
    
    # Note: We don't drop the vector extension as it might be used by other tables
