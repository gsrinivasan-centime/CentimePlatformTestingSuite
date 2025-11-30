"""convert_embedding_to_vector_type

Revision ID: e64b052e93b5
Revises: g6h7i8j9k0l1
Create Date: 2025-11-30 14:27:12.680457

This migration converts embedding columns from double precision[] (ARRAY)
to vector(384) type to enable pgvector's native similarity operators.

Benefits:
- DB-level similarity filtering using <=> (cosine distance) operator
- Can use HNSW or IVFFlat indexes for fast approximate nearest neighbor search
- No need to load embeddings into Python for comparison
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e64b052e93b5'
down_revision: Union[str, None] = 'g6h7i8j9k0l1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Embedding dimension (all-MiniLM-L6-v2 produces 384-dim vectors)
EMBEDDING_DIM = 384


def upgrade() -> None:
    """Convert embedding columns from double precision[] to vector(384)"""
    
    # Ensure pgvector extension is enabled
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Convert test_cases.embedding from double precision[] to vector(384)
    # Step 1: Add a temporary vector column
    op.execute(f"ALTER TABLE test_cases ADD COLUMN embedding_vec vector({EMBEDDING_DIM})")
    
    # Step 2: Copy data from array to vector (convert array to vector)
    op.execute(f"""
        UPDATE test_cases 
        SET embedding_vec = embedding::vector({EMBEDDING_DIM})
        WHERE embedding IS NOT NULL
    """)
    
    # Step 3: Drop old column
    op.execute("ALTER TABLE test_cases DROP COLUMN embedding")
    
    # Step 4: Rename new column to original name
    op.execute("ALTER TABLE test_cases RENAME COLUMN embedding_vec TO embedding")
    
    # Step 5: Create HNSW index for fast similarity search
    # HNSW is faster than IVFFlat and doesn't require training
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_test_cases_embedding_hnsw 
        ON test_cases 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    
    # Also convert issues.embedding if it exists
    # Check if the column exists first (some DBs might not have it)
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'issues' AND column_name = 'embedding'
            ) THEN
                -- Add temp column
                ALTER TABLE issues ADD COLUMN embedding_vec vector({EMBEDDING_DIM});
                
                -- Copy data
                UPDATE issues 
                SET embedding_vec = embedding::vector({EMBEDDING_DIM})
                WHERE embedding IS NOT NULL;
                
                -- Drop old, rename new
                ALTER TABLE issues DROP COLUMN embedding;
                ALTER TABLE issues RENAME COLUMN embedding_vec TO embedding;
                
                -- Create index
                CREATE INDEX IF NOT EXISTS idx_issues_embedding_hnsw 
                ON issues 
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Convert back from vector(384) to double precision[]"""
    
    # Convert test_cases.embedding back to array
    op.execute(f"ALTER TABLE test_cases ADD COLUMN embedding_arr double precision[]")
    
    op.execute("""
        UPDATE test_cases 
        SET embedding_arr = embedding::float8[]
        WHERE embedding IS NOT NULL
    """)
    
    # Drop index first
    op.execute("DROP INDEX IF EXISTS idx_test_cases_embedding_hnsw")
    
    op.execute("ALTER TABLE test_cases DROP COLUMN embedding")
    op.execute("ALTER TABLE test_cases RENAME COLUMN embedding_arr TO embedding")
    
    # Also revert issues if needed
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'issues' AND column_name = 'embedding'
                AND data_type = 'USER-DEFINED'
            ) THEN
                ALTER TABLE issues ADD COLUMN embedding_arr double precision[];
                
                UPDATE issues 
                SET embedding_arr = embedding::float8[]
                WHERE embedding IS NOT NULL;
                
                DROP INDEX IF EXISTS idx_issues_embedding_hnsw;
                ALTER TABLE issues DROP COLUMN embedding;
                ALTER TABLE issues RENAME COLUMN embedding_arr TO embedding;
            END IF;
        END $$;
    """)
