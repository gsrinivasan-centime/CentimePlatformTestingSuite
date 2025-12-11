"""Fix embedding columns to use proper pgvector type

This migration converts the embedding columns from PostgreSQL ARRAY(Float)
to pgvector's vector(384) type for proper similarity search support.

Revision ID: fix_pgvector_001
Revises: (latest migration)
Create Date: 2025-01-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fix_pgvector_001'
down_revision = None  # Set this to your latest migration if needed
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Convert embedding columns from ARRAY(Float) to vector(384).
    
    This requires:
    1. The pgvector extension to be installed
    2. Dropping and recreating the column (data loss for any existing embeddings)
    """
    # Ensure pgvector extension exists
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Fix test_cases.embedding column
    op.execute('ALTER TABLE test_cases DROP COLUMN IF EXISTS embedding')
    op.execute('ALTER TABLE test_cases ADD COLUMN embedding vector(384)')
    
    # Fix issues.embedding column
    op.execute('ALTER TABLE issues DROP COLUMN IF EXISTS embedding')
    op.execute('ALTER TABLE issues ADD COLUMN embedding vector(384)')
    
    # Create IVFFlat indexes for fast similarity search
    # Note: These indexes work best with at least 100+ rows
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_test_cases_embedding_ivfflat 
        ON test_cases USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
    ''')
    
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_issues_embedding_ivfflat 
        ON issues USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
    ''')


def downgrade() -> None:
    """
    Revert to ARRAY(Float) type (not recommended).
    """
    # Drop indexes
    op.execute('DROP INDEX IF EXISTS idx_test_cases_embedding_ivfflat')
    op.execute('DROP INDEX IF EXISTS idx_issues_embedding_ivfflat')
    
    # Revert test_cases.embedding column
    op.execute('ALTER TABLE test_cases DROP COLUMN IF EXISTS embedding')
    op.execute('ALTER TABLE test_cases ADD COLUMN embedding DOUBLE PRECISION[]')
    
    # Revert issues.embedding column  
    op.execute('ALTER TABLE issues DROP COLUMN IF EXISTS embedding')
    op.execute('ALTER TABLE issues ADD COLUMN embedding DOUBLE PRECISION[]')
