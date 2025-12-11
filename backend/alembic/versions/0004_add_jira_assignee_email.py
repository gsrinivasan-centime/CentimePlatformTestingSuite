"""add jira_assignee_email to issues

Revision ID: 0004_add_jira_assignee_email
Revises: 0003_jira_oauth
Create Date: 2024-12-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0004_add_jira_assignee_email'
down_revision = '0003_jira_oauth'
branch_labels = None
depends_on = None


def upgrade():
    # Add jira_assignee_email column to issues table
    op.add_column('issues', sa.Column('jira_assignee_email', sa.String(255), nullable=True))


def downgrade():
    # Remove jira_assignee_email column from issues table
    op.drop_column('issues', 'jira_assignee_email')
