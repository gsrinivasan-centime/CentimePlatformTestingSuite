"""Consolidated initial schema with all tables and columns

Revision ID: 0001_consolidated
Revises: 
Create Date: 2025-12-09

This is a consolidated migration that creates the complete database schema
for a fresh installation. It includes all tables, columns, and indexes
that were previously spread across multiple migration files.

For fresh deployments, run: alembic upgrade head
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0001_consolidated'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Embedding dimension for vector columns
EMBEDDING_DIM = 384


def upgrade() -> None:
    # Enable required extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # ============================================
    # Core Tables
    # ============================================
    
    # Modules table
    op.create_table('modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_modules_id'), 'modules', ['id'], unique=False)
    
    # Users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('role', sa.Enum('ADMIN', 'TESTER', 'DEVELOPER', name='userrole'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_email_verified', sa.Boolean(), nullable=True),
        sa.Column('is_super_admin', sa.Boolean(), nullable=True, default=False),
        sa.Column('email_verified_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    
    # ============================================
    # Feature Files and Step Catalog
    # ============================================
    
    # Feature files table (with all columns including approval workflow)
    op.create_table('feature_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Approval workflow columns
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('submitted_for_approval_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id'], ),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feature_files_id'), 'feature_files', ['id'], unique=False)
    
    # Step catalog table
    op.create_table('step_catalog',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('step_type', sa.String(length=10), nullable=False),
        sa.Column('step_text', sa.Text(), nullable=False),
        sa.Column('step_pattern', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parameters', sa.Text(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('tags', sa.String(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_step_catalog_id'), 'step_catalog', ['id'], unique=False)
    op.create_index(op.f('ix_step_catalog_step_type'), 'step_catalog', ['step_type'], unique=False)
    
    # ============================================
    # Jira Integration Tables
    # ============================================
    
    # Jira stories table
    op.create_table('jira_stories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('story_id', sa.String(length=50), nullable=False),
        sa.Column('epic_id', sa.String(length=50), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('assignee', sa.String(), nullable=True),
        sa.Column('sprint', sa.String(), nullable=True),
        sa.Column('release', sa.String(length=100), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jira_stories_epic_id'), 'jira_stories', ['epic_id'], unique=False)
    op.create_index(op.f('ix_jira_stories_id'), 'jira_stories', ['id'], unique=False)
    op.create_index(op.f('ix_jira_stories_story_id'), 'jira_stories', ['story_id'], unique=True)
    
    # ============================================
    # Release Management Tables
    # ============================================
    
    # Releases table
    op.create_table('releases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('release_date', sa.DateTime(), nullable=True),
        sa.Column('environment', sa.String(), nullable=True),
        sa.Column('overall_status', sa.String(), nullable=True),
        sa.Column('qa_lead_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['qa_lead_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('version')
    )
    op.create_index(op.f('ix_releases_id'), 'releases', ['id'], unique=False)
    
    # ============================================
    # Module Hierarchy Tables
    # ============================================
    
    # Sub-modules table
    op.create_table('sub_modules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sub_modules_id'), 'sub_modules', ['id'], unique=False)
    
    # Features table
    op.create_table('features',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sub_module_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['sub_module_id'], ['sub_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_features_id'), 'features', ['id'], unique=False)
    
    # ============================================
    # Test Cases Table (with embeddings)
    # ============================================
    
    op.create_table('test_cases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('test_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('test_type', sa.Enum('MANUAL', 'AUTOMATED', name='testtype'), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('sub_module', sa.String(), nullable=True),
        sa.Column('feature_section', sa.String(), nullable=True),
        sa.Column('tag', sa.Enum('ui', 'api', 'hybrid', name='testtag'), nullable=False),
        sa.Column('tags', sa.String(), nullable=True),
        sa.Column('automation_status', sa.Enum('working', 'broken', name='automationstatus'), nullable=True),
        sa.Column('jira_story_id', sa.String(length=50), nullable=True),
        sa.Column('jira_epic_id', sa.String(length=50), nullable=True),
        sa.Column('jira_labels', sa.Text(), nullable=True),
        sa.Column('scenario_examples', sa.Text(), nullable=True),
        sa.Column('steps_to_reproduce', sa.Text(), nullable=True),
        sa.Column('expected_result', sa.Text(), nullable=True),
        sa.Column('preconditions', sa.Text(), nullable=True),
        sa.Column('test_data', sa.Text(), nullable=True),
        sa.Column('automated_script_path', sa.String(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Embedding columns for AI/similarity search
        sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('embedding_model', sa.String(50), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_test_cases_feature_section'), 'test_cases', ['feature_section'], unique=False)
    op.create_index(op.f('ix_test_cases_id'), 'test_cases', ['id'], unique=False)
    op.create_index(op.f('ix_test_cases_jira_epic_id'), 'test_cases', ['jira_epic_id'], unique=False)
    op.create_index(op.f('ix_test_cases_jira_story_id'), 'test_cases', ['jira_story_id'], unique=False)
    op.create_index(op.f('ix_test_cases_sub_module'), 'test_cases', ['sub_module'], unique=False)
    op.create_index(op.f('ix_test_cases_tag'), 'test_cases', ['tag'], unique=False)
    op.create_index(op.f('ix_test_cases_test_id'), 'test_cases', ['test_id'], unique=True)
    
    # ============================================
    # Issues Table (with embeddings)
    # ============================================
    
    op.create_table('issues',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('video_url', sa.String(), nullable=True),
        sa.Column('screenshot_urls', sa.Text(), nullable=True),
        sa.Column('jira_assignee_id', sa.String(length=100), nullable=True),
        sa.Column('jira_assignee_name', sa.String(length=255), nullable=True),
        sa.Column('reporter_name', sa.String(length=100), nullable=True),
        sa.Column('jira_story_id', sa.String(length=50), nullable=True),
        sa.Column('module_id', sa.Integer(), nullable=True),
        sa.Column('release_id', sa.Integer(), nullable=True),
        sa.Column('test_case_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        # Embedding columns for AI/similarity search
        sa.Column('embedding', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('embedding_model', sa.String(50), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id'], ),
        sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ),
        sa.ForeignKeyConstraint(['test_case_id'], ['test_cases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_issues_id'), 'issues', ['id'], unique=False)
    op.create_index(op.f('ix_issues_status'), 'issues', ['status'], unique=False)
    
    # ============================================
    # Release Management - Related Tables
    # ============================================
    
    # Release approvals table
    op.create_table('release_approvals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('release_id', sa.Integer(), nullable=False),
        sa.Column('approver_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.Enum('QA_LEAD', 'DEV_LEAD', 'PRODUCT_MANAGER', 'RELEASE_MANAGER', name='approvalrole'), nullable=False),
        sa.Column('approval_status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', name='approvalstatus'), nullable=True),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['approver_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_release_approvals_id'), 'release_approvals', ['id'], unique=False)
    
    # Release history table
    op.create_table('release_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('release_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_release_history_id'), 'release_history', ['id'], unique=False)
    
    # Release test cases table
    op.create_table('release_test_cases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('release_id', sa.Integer(), nullable=False),
        sa.Column('test_case_id', sa.Integer(), nullable=False),
        sa.Column('module_id', sa.Integer(), nullable=False),
        sa.Column('sub_module_id', sa.Integer(), nullable=True),
        sa.Column('feature_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('execution_status', sa.Enum('not_started', 'passed', 'failed', 'blocked', 'skipped', 'in_progress', name='executionstatus'), nullable=True),
        sa.Column('executed_by_id', sa.Integer(), nullable=True),
        sa.Column('execution_date', sa.DateTime(), nullable=True),
        sa.Column('execution_duration', sa.Integer(), nullable=True),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('bug_ids', sa.String(), nullable=True),
        sa.Column('screenshots', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['executed_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['feature_id'], ['features.id'], ),
        sa.ForeignKeyConstraint(['module_id'], ['modules.id'], ),
        sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ),
        sa.ForeignKeyConstraint(['sub_module_id'], ['sub_modules.id'], ),
        sa.ForeignKeyConstraint(['test_case_id'], ['test_cases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_release_test_cases_id'), 'release_test_cases', ['id'], unique=False)
    
    # ============================================
    # Test Execution Tables
    # ============================================
    
    # Test executions table
    op.create_table('test_executions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('test_case_id', sa.Integer(), nullable=True),
        sa.Column('release_id', sa.Integer(), nullable=True),
        sa.Column('executor_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('PASS', 'FAIL', 'PENDING', 'SKIPPED', name='teststatus'), nullable=False),
        sa.Column('actual_result', sa.Text(), nullable=True),
        sa.Column('execution_time', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('screenshot_path', sa.String(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['executor_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ),
        sa.ForeignKeyConstraint(['test_case_id'], ['test_cases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_test_executions_id'), 'test_executions', ['id'], unique=False)
    
    # Test case stories (linking table)
    op.create_table('test_case_stories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('test_case_id', sa.Integer(), nullable=False),
        sa.Column('story_id', sa.String(length=50), nullable=False),
        sa.Column('linked_at', sa.DateTime(), nullable=True),
        sa.Column('linked_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['linked_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['story_id'], ['jira_stories.story_id'], ),
        sa.ForeignKeyConstraint(['test_case_id'], ['test_cases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_test_case_stories_id'), 'test_case_stories', ['id'], unique=False)
    
    # Jira defects table
    op.create_table('jira_defects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('test_execution_id', sa.Integer(), nullable=True),
        sa.Column('jira_id', sa.String(), nullable=False),
        sa.Column('summary', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['test_execution_id'], ['test_executions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jira_defects_id'), 'jira_defects', ['id'], unique=False)
    
    # ============================================
    # Application Settings & Smart Search Tables
    # ============================================
    
    # Application settings table
    op.create_table('application_settings',
        sa.Column('key', sa.String(100), primary_key=True),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    
    # Insert default settings
    op.execute("""
        INSERT INTO application_settings (key, value, description) VALUES 
        ('similarity_threshold', '75', 'Similarity threshold percentage for duplicate detection (0-100)'),
        ('embedding_model', 'all-MiniLM-L6-v2', 'Model used for generating embeddings')
        ON CONFLICT (key) DO NOTHING
    """)
    
    # Smart search logs table
    op.create_table('smart_search_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('query_type', sa.String(50), nullable=True),
        sa.Column('results_count', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_smart_search_logs_id'), 'smart_search_logs', ['id'], unique=False)
    
    # Navigation registry table
    op.create_table('navigation_registry',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('path', sa.String(500), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('keywords', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_navigation_registry_id'), 'navigation_registry', ['id'], unique=False)
    op.create_index('ix_navigation_registry_entity', 'navigation_registry', ['entity_type', 'entity_id'], unique=True)
    
    # LLM response cache table
    op.create_table('llm_response_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cache_key', sa.String(64), nullable=False, unique=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('hit_count', sa.Integer(), nullable=True, default=0),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_llm_response_cache_id'), 'llm_response_cache', ['id'], unique=False)
    op.create_index('ix_llm_response_cache_key', 'llm_response_cache', ['cache_key'], unique=True)


def downgrade() -> None:
    # Drop all tables in reverse order of creation
    op.drop_table('llm_response_cache')
    op.drop_table('navigation_registry')
    op.drop_table('smart_search_logs')
    op.drop_table('application_settings')
    op.drop_table('jira_defects')
    op.drop_table('test_case_stories')
    op.drop_table('test_executions')
    op.drop_table('release_test_cases')
    op.drop_table('release_history')
    op.drop_table('release_approvals')
    op.drop_table('issues')
    op.drop_table('test_cases')
    op.drop_table('features')
    op.drop_table('sub_modules')
    op.drop_table('releases')
    op.drop_table('jira_stories')
    op.drop_table('step_catalog')
    op.drop_table('feature_files')
    op.drop_table('users')
    op.drop_table('modules')
    
    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS vector')
