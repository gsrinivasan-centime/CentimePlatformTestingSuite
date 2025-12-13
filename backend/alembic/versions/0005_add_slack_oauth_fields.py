"""Add Slack OAuth fields to users and application_settings

Revision ID: 0005_slack_oauth
Revises: 0004_add_jira_assignee_email
Create Date: 2025-12-13

This migration adds:
1. Slack OAuth fields to users table for user-level Slack authentication
2. Slack workspace settings to application_settings table (super admin configurable)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_slack_oauth'
down_revision: Union[str, None] = '0004_add_jira_assignee_email'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Slack OAuth fields to users table
    op.add_column('users', sa.Column('slack_user_access_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('slack_user_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('slack_display_name', sa.String(), nullable=True))
    
    # Insert default Slack workspace settings into application_settings
    # These will be configured by super admin
    op.execute("""
        INSERT INTO application_settings (key, value, description, updated_at)
        VALUES 
            ('slack_workspace_id', '', 'Slack Workspace/Team ID for the organization', NOW()),
            ('slack_workspace_name', '', 'Slack Workspace name for display', NOW())
        ON CONFLICT (key) DO NOTHING
    """)


def downgrade() -> None:
    # Remove Slack OAuth fields from users table
    op.drop_column('users', 'slack_display_name')
    op.drop_column('users', 'slack_user_id')
    op.drop_column('users', 'slack_user_access_token')
    
    # Remove Slack workspace settings
    op.execute("""
        DELETE FROM application_settings 
        WHERE key IN ('slack_workspace_id', 'slack_workspace_name')
    """)
