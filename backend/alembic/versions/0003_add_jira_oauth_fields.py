"""Add JIRA OAuth fields to users table

Revision ID: 0003_jira_oauth
Revises: 0002_csv_workbook
Create Date: 2024-12-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_jira_oauth'
down_revision: Union[str, None] = '0002_csv_workbook'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add JIRA OAuth fields to users table for per-user JIRA authentication"""
    op.add_column('users', sa.Column('jira_access_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('jira_refresh_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('jira_token_expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('jira_cloud_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('jira_account_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('jira_account_email', sa.String(), nullable=True))
    op.add_column('users', sa.Column('jira_display_name', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove JIRA OAuth fields from users table"""
    op.drop_column('users', 'jira_display_name')
    op.drop_column('users', 'jira_account_email')
    op.drop_column('users', 'jira_account_id')
    op.drop_column('users', 'jira_cloud_id')
    op.drop_column('users', 'jira_token_expires_at')
    op.drop_column('users', 'jira_refresh_token')
    op.drop_column('users', 'jira_access_token')
