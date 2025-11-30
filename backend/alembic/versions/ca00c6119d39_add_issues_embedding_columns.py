"""add_issues_embedding_columns

Revision ID: ca00c6119d39
Revises: e64b052e93b5
Create Date: 2025-11-30 15:00:23.133408

This migration adds embedding columns to the issues table if they don't exist.
The production database was missing these columns while dev had them.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca00c6119d39'
down_revision: Union[str, None] = 'e64b052e93b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Embedding dimension (all-MiniLM-L6-v2 produces 384-dim vectors)
EMBEDDING_DIM = 384


def upgrade() -> None:
    """Add embedding and embedding_model columns to issues table if they don't exist"""
    
    # Ensure pgvector extension is enabled
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Add embedding column (vector type) and embedding_model column to issues
    # Using DO block to check if columns exist first
    op.execute(f"""
        DO $$
        BEGIN
            -- Add embedding column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'issues' AND column_name = 'embedding'
            ) THEN
                ALTER TABLE issues ADD COLUMN embedding vector({EMBEDDING_DIM});
            END IF;
            
            -- Add embedding_model column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'issues' AND column_name = 'embedding_model'
            ) THEN
                ALTER TABLE issues ADD COLUMN embedding_model VARCHAR(50);
            END IF;
        END $$;
    """)
    
    # Create HNSW index for fast similarity search on issues (if it doesn't exist)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE indexname = 'idx_issues_embedding_hnsw'
            ) THEN
                CREATE INDEX idx_issues_embedding_hnsw 
                ON issues 
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Remove embedding columns from issues table"""
    op.execute("DROP INDEX IF EXISTS idx_issues_embedding_hnsw")
    op.execute("ALTER TABLE issues DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE issues DROP COLUMN IF EXISTS embedding_model")
