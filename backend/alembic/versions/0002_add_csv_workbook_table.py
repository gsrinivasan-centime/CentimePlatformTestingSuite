"""Add CSV workbook table for approval workflow

Revision ID: 0002_csv_workbook
Revises: 0001_consolidated
Create Date: 2025-01-09

This migration adds the csv_workbooks table to support CSV file uploads
with approval workflow similar to feature files.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_csv_workbook'
down_revision: Union[str, None] = '0001_consolidated'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create csv_workbooks table
    op.create_table('csv_workbooks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('csv_content', sa.Text(), nullable=False, comment='JSON array of test case rows'),
        sa.Column('original_filename', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, default='draft'),
        sa.Column('similarity_results', sa.Text(), nullable=True, comment='JSON string of similarity analysis'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Approval workflow columns
        sa.Column('submitted_for_approval_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('rejected_by', sa.Integer(), nullable=True),
        sa.Column('rejected_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        # Foreign keys
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id'], ),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['rejected_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_csv_workbooks_id'), 'csv_workbooks', ['id'], unique=False)
    op.create_index(op.f('ix_csv_workbooks_status'), 'csv_workbooks', ['status'], unique=False)
    op.create_index(op.f('ix_csv_workbooks_created_by'), 'csv_workbooks', ['created_by'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_csv_workbooks_created_by'), table_name='csv_workbooks')
    op.drop_index(op.f('ix_csv_workbooks_status'), table_name='csv_workbooks')
    op.drop_index(op.f('ix_csv_workbooks_id'), table_name='csv_workbooks')
    op.drop_table('csv_workbooks')
