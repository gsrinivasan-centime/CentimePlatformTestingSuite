"""Add LLM response cache table

Revision ID: g6h7i8j9k0l1
Revises: f621b5e4e51f
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'g6h7i8j9k0l1'
down_revision = 'f0a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create llm_response_cache table for persistent caching of LLM responses
    op.create_table(
        'llm_response_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cache_key', sa.String(64), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('response_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('input_tokens', sa.Integer(), default=0),
        sa.Column('output_tokens', sa.Integer(), default=0),
        sa.Column('hit_count', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique index on cache_key for fast lookups
    op.create_index('idx_llm_response_cache_key', 'llm_response_cache', ['cache_key'], unique=True)
    
    # Create index on expires_at for efficient cleanup of expired entries
    op.create_index('idx_llm_response_cache_expires', 'llm_response_cache', ['expires_at'])


def downgrade() -> None:
    op.drop_index('idx_llm_response_cache_expires', table_name='llm_response_cache')
    op.drop_index('idx_llm_response_cache_key', table_name='llm_response_cache')
    op.drop_table('llm_response_cache')
