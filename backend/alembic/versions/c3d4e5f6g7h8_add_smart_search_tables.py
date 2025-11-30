"""Add smart search tables

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2025-11-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c3d4e5f6g7h8'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create smart_search_logs table for tracking usage and tokens
    op.create_table(
        'smart_search_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('intent', sa.String(50), nullable=True),
        sa.Column('target_page', sa.String(100), nullable=True),
        sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('semantic_query', sa.Text(), nullable=True),
        sa.Column('input_tokens', sa.Integer(), default=0),
        sa.Column('output_tokens', sa.Integer(), default=0),
        sa.Column('results_count', sa.Integer(), default=0),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('cached', sa.Boolean(), default=False),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for analytics queries
    op.create_index('idx_smart_search_logs_user_date', 'smart_search_logs', ['user_id', 'created_at'])
    op.create_index('idx_smart_search_logs_date', 'smart_search_logs', ['created_at'])
    op.create_index('idx_smart_search_logs_intent', 'smart_search_logs', ['intent'])
    
    # Create navigation_registry table for dynamic page configuration
    op.create_table(
        'navigation_registry',
        sa.Column('page_key', sa.String(50), nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('path', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('searchable_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('capabilities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('example_queries', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('display_order', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('page_key')
    )
    
    # Add embedding columns to issues table
    op.add_column('issues', sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True))
    op.add_column('issues', sa.Column('embedding_model', sa.String(50), nullable=True))
    
    # Add embedding columns to jira_stories table
    op.add_column('jira_stories', sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True))
    op.add_column('jira_stories', sa.Column('embedding_model', sa.String(50), nullable=True))
    
    # Seed initial navigation registry data
    op.execute("""
        INSERT INTO navigation_registry (page_key, display_name, path, entity_type, filters, searchable_fields, capabilities, example_queries, is_active, display_order)
        VALUES 
        (
            'dashboard',
            'Dashboard',
            '/dashboard',
            NULL,
            '[]'::jsonb,
            '[]'::jsonb,
            '["view_stats", "navigate"]'::jsonb,
            '["show dashboard", "go to home", "show overview"]'::jsonb,
            true,
            1
        ),
        (
            'test_cases',
            'Test Cases',
            '/test-cases',
            'test_case',
            '[{"field": "module_id", "label": "Module", "type": "select"}, {"field": "sub_module", "label": "Sub Module", "type": "text"}, {"field": "tag", "label": "Type", "type": "select", "options": ["ui", "api", "hybrid"]}, {"field": "test_type", "label": "Test Type", "type": "select", "options": ["manual", "automated"]}, {"field": "jira_story_id", "label": "JIRA Story", "type": "text"}]'::jsonb,
            '["title", "description", "steps_to_reproduce", "expected_result", "preconditions"]'::jsonb,
            '["view", "filter", "semantic_search", "navigate"]'::jsonb,
            '["show test cases for ACH", "find payment tests in AP module", "show all UI tests", "test cases for invoice processing"]'::jsonb,
            true,
            2
        ),
        (
            'issues',
            'Issues',
            '/issues',
            'issue',
            '[{"field": "module_id", "label": "Module", "type": "select"}, {"field": "release_id", "label": "Release", "type": "select"}, {"field": "assigned_to", "label": "Assignee", "type": "select"}, {"field": "status", "label": "Status", "type": "select", "options": ["Open", "In Progress", "Resolved", "Closed"]}, {"field": "severity", "label": "Severity", "type": "select", "options": ["Critical", "Major", "Minor", "Trivial"]}, {"field": "priority", "label": "Priority", "type": "select", "options": ["Critical", "High", "Medium", "Low"]}]'::jsonb,
            '["title", "description"]'::jsonb,
            '["view", "filter", "semantic_search", "navigate"]'::jsonb,
            '["show open issues", "issues assigned to me", "critical bugs in current release", "issues related to partial payments"]'::jsonb,
            true,
            3
        ),
        (
            'releases',
            'Releases',
            '/releases',
            'release',
            '[{"field": "status", "label": "Status", "type": "select", "options": ["not_started", "in_progress", "completed"]}]'::jsonb,
            '["version", "name", "description"]'::jsonb,
            '["view", "filter", "navigate"]'::jsonb,
            '["show all releases", "current release", "release 2.4.0"]'::jsonb,
            true,
            4
        ),
        (
            'release_detail',
            'Release Detail',
            '/releases/:id',
            'release',
            '[{"field": "tab", "label": "Tab", "type": "select", "options": ["dashboard", "stories", "modules", "issues"]}]'::jsonb,
            '[]'::jsonb,
            '["view", "navigate_tabs"]'::jsonb,
            '["show current release dashboard", "stories in current release", "issues in release 2.5.0"]'::jsonb,
            true,
            5
        ),
        (
            'stories',
            'Stories',
            '/stories',
            'jira_story',
            '[{"field": "status", "label": "Status", "type": "select", "options": ["To Do", "In Progress", "In Testing", "Done"]}, {"field": "release", "label": "Release", "type": "text"}, {"field": "assignee", "label": "Assignee", "type": "text"}]'::jsonb,
            '["title", "description", "story_id"]'::jsonb,
            '["view", "filter", "navigate"]'::jsonb,
            '["stories in testing", "show all stories for current release", "stories assigned to me"]'::jsonb,
            true,
            6
        ),
        (
            'modules',
            'Modules',
            '/modules',
            'module',
            '[]'::jsonb,
            '["name", "description"]'::jsonb,
            '["view", "navigate"]'::jsonb,
            '["show all modules", "Account Payable module", "AR module"]'::jsonb,
            true,
            7
        ),
        (
            'reports',
            'Reports',
            '/reports',
            NULL,
            '[{"field": "module_id", "label": "Module", "type": "select"}, {"field": "release_id", "label": "Release", "type": "select"}]'::jsonb,
            '[]'::jsonb,
            '["view", "generate", "download"]'::jsonb,
            '["generate report", "show test execution report", "download PDF report"]'::jsonb,
            true,
            8
        ),
        (
            'executions',
            'Execute Tests',
            '/executions',
            'test_execution',
            '[{"field": "release_id", "label": "Release", "type": "select"}, {"field": "status", "label": "Status", "type": "select"}]'::jsonb,
            '[]'::jsonb,
            '["view", "execute", "navigate"]'::jsonb,
            '["execute tests", "run test cases", "show test executions"]'::jsonb,
            true,
            9
        )
        ON CONFLICT (page_key) DO NOTHING;
    """)


def downgrade() -> None:
    # Drop embedding columns from jira_stories
    op.drop_column('jira_stories', 'embedding_model')
    op.drop_column('jira_stories', 'embedding')
    
    # Drop embedding columns from issues
    op.drop_column('issues', 'embedding_model')
    op.drop_column('issues', 'embedding')
    
    # Drop navigation_registry table
    op.drop_table('navigation_registry')
    
    # Drop indexes
    op.drop_index('idx_smart_search_logs_intent', 'smart_search_logs')
    op.drop_index('idx_smart_search_logs_date', 'smart_search_logs')
    op.drop_index('idx_smart_search_logs_user_date', 'smart_search_logs')
    
    # Drop smart_search_logs table
    op.drop_table('smart_search_logs')
