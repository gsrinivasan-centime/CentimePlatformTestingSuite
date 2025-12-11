from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum, Float, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from pgvector.sqlalchemy import Vector
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TESTER = "tester"
    DEVELOPER = "developer"

class TestType(str, enum.Enum):
    MANUAL = "manual"
    AUTOMATED = "automated"

class TestStatus(str, enum.Enum):
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"
    SKIPPED = "skipped"

class AutomationStatus(str, enum.Enum):
    WORKING = "working"
    BROKEN = "broken"

class TestTag(str, enum.Enum):
    UI = "ui"
    API = "api"
    HYBRID = "hybrid"

class ExecutionStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    PASSED = "passed"
    FAILED = "failed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"
    IN_PROGRESS = "in_progress"

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"

class ApprovalRole(str, enum.Enum):
    QA_LEAD = "qa_lead"
    DEV_LEAD = "dev_lead"
    PRODUCT_MANAGER = "product_manager"
    RELEASE_MANAGER = "release_manager"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.TESTER)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime, nullable=True)
    is_super_admin = Column(Boolean, default=False)  # Only super admin can modify application settings
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # JIRA OAuth fields (tokens are encrypted)
    jira_access_token = Column(String, nullable=True)
    jira_refresh_token = Column(String, nullable=True)
    jira_token_expires_at = Column(DateTime, nullable=True)
    jira_cloud_id = Column(String, nullable=True)
    jira_account_id = Column(String, nullable=True)
    jira_account_email = Column(String, nullable=True)
    jira_display_name = Column(String, nullable=True)
    
    # Relationships
    test_executions = relationship("TestExecution", back_populates="executor")

class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    test_cases = relationship("TestCase", back_populates="module")
    sub_modules = relationship("SubModule", back_populates="module", cascade="all, delete-orphan")

class SubModule(Base):
    __tablename__ = "sub_modules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    module = relationship("Module", back_populates="sub_modules")

class Feature(Base):
    __tablename__ = "features"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    sub_module_id = Column(Integer, ForeignKey("sub_modules.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sub_module = relationship("SubModule")

class Release(Base):
    __tablename__ = "releases"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, unique=True, nullable=False)
    name = Column(String)
    description = Column(Text)
    release_date = Column(DateTime)
    environment = Column(String)  # dev, staging, production
    overall_status = Column(String, default="not_started")  # not_started, in_progress, completed
    qa_lead_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    test_executions = relationship("TestExecution", back_populates="release")
    release_test_cases = relationship("ReleaseTestCase", back_populates="release", cascade="all, delete-orphan")
    approvals = relationship("ReleaseApproval", back_populates="release", cascade="all, delete-orphan")
    history = relationship("ReleaseHistory", back_populates="release", cascade="all, delete-orphan")
    qa_lead = relationship("User", foreign_keys=[qa_lead_id])

class TestCase(Base):
    __tablename__ = "test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    test_type = Column(SQLEnum(TestType), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"))
    
    # NEW: Hierarchical organization fields
    sub_module = Column(String, nullable=True, index=True)  # e.g., "Suppliers", "Invoices", "Payments"
    feature_section = Column(String, nullable=True, index=True)  # e.g., "Supplier Profile", "List View", "Create Form"
    
    # Test categorization tag - UI, API, or Hybrid
    tag = Column(SQLEnum(TestTag, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)  # ui/api/hybrid
    
    # Additional tags for test categorization (smoke, regression, etc.) - stored as comma-separated string
    tags = Column(String, nullable=True)  # e.g., "smoke,regression" or "smoke,sanity"
    
    # Automation status - only applicable for automated tests
    automation_status = Column(SQLEnum(AutomationStatus, values_callable=lambda x: [e.value for e in x]), nullable=True)  # working/broken for automated, null for manual
    
    # JIRA Integration fields
    jira_story_id = Column(String(50), nullable=True, index=True)  # e.g., "CTP-1234"
    jira_epic_id = Column(String(50), nullable=True, index=True)  # e.g., "CTP-100"
    jira_labels = Column(Text, nullable=True)  # Stored as JSON array
    
    # Scenario examples/parameters for data-driven testing (stored as JSON)
    # Example: {"columns": ["Amount", "Status"], "rows": [["$0", "Invalid"], ["$10", "Valid"], ["$-10", "Invalid"]]}
    scenario_examples = Column(Text, nullable=True)
    
    steps_to_reproduce = Column(Text)
    expected_result = Column(Text)
    preconditions = Column(Text)
    test_data = Column(Text)
    automated_script_path = Column(String)  # Path to pytest test file
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Similarity analysis - embedding vector (384 dimensions for all-MiniLM-L6-v2)
    # Uses pgvector's Vector type for native similarity operators
    embedding = Column(Vector(384), nullable=True)
    embedding_model = Column(String(50), nullable=True)  # Track which model generated the embedding
    
    # Relationships
    module = relationship("Module", back_populates="test_cases")
    test_executions = relationship("TestExecution", back_populates="test_case")

class TestExecution(Base):
    __tablename__ = "test_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"))
    release_id = Column(Integer, ForeignKey("releases.id"))
    executor_id = Column(Integer, ForeignKey("users.id"))
    status = Column(SQLEnum(TestStatus), nullable=False)
    actual_result = Column(Text)
    execution_time = Column(Integer)  # in seconds
    error_message = Column(Text)
    screenshot_path = Column(String)
    executed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    test_case = relationship("TestCase", back_populates="test_executions")
    release = relationship("Release", back_populates="test_executions")
    executor = relationship("User", back_populates="test_executions")
    jira_defects = relationship("JiraDefect", back_populates="test_execution")

class JiraDefect(Base):
    __tablename__ = "jira_defects"
    
    id = Column(Integer, primary_key=True, index=True)
    test_execution_id = Column(Integer, ForeignKey("test_executions.id"))
    jira_id = Column(String, nullable=False)
    summary = Column(String)
    status = Column(String)
    priority = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    test_execution = relationship("TestExecution", back_populates="jira_defects")

class ReleaseTestCase(Base):
    __tablename__ = "release_test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    release_id = Column(Integer, ForeignKey("releases.id"), nullable=False)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    sub_module_id = Column(Integer, ForeignKey("sub_modules.id"))
    feature_id = Column(Integer, ForeignKey("features.id"))
    priority = Column(String)  # high, medium, low
    execution_status = Column(SQLEnum(ExecutionStatus, values_callable=lambda x: [e.value for e in x]), default=ExecutionStatus.NOT_STARTED)
    executed_by_id = Column(Integer, ForeignKey("users.id"))
    execution_date = Column(DateTime)
    execution_duration = Column(Integer)  # in seconds
    comments = Column(Text)
    bug_ids = Column(String)  # comma-separated bug IDs
    screenshots = Column(Text)  # JSON array of screenshot paths
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    release = relationship("Release", back_populates="release_test_cases")
    test_case = relationship("TestCase")
    module = relationship("Module")
    sub_module = relationship("SubModule")
    feature = relationship("Feature")
    executed_by = relationship("User")

class ReleaseApproval(Base):
    __tablename__ = "release_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    release_id = Column(Integer, ForeignKey("releases.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(ApprovalRole), nullable=False)
    approval_status = Column(SQLEnum(ApprovalStatus), default=ApprovalStatus.PENDING)
    comments = Column(Text)
    approved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    release = relationship("Release", back_populates="approvals")
    approver = relationship("User")

class ReleaseHistory(Base):
    __tablename__ = "release_history"
    
    id = Column(Integer, primary_key=True, index=True)
    release_id = Column(Integer, ForeignKey("releases.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # created, updated, approved, rejected, etc.
    details = Column(Text)  # JSON with details of the change
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    release = relationship("Release", back_populates="history")
    user = relationship("User")

class JiraStory(Base):
    __tablename__ = "jira_stories"
    
    id = Column(Integer, primary_key=True, index=True)
    story_id = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "CTP-1234"
    epic_id = Column(String(50), nullable=True, index=True)  # e.g., "CTP-100"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=True)  # e.g., "To Do", "In Progress", "Done"
    priority = Column(String(20), nullable=True)  # e.g., "High", "Medium", "Low"
    assignee = Column(String, nullable=True)
    sprint = Column(String, nullable=True)
    release = Column(String(100), nullable=True)  # Fix Version from JIRA
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced_at = Column(DateTime, nullable=True)  # Track when story was last synced from JIRA
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])


class StepCatalog(Base):
    __tablename__ = "step_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    step_type = Column(String(10), nullable=False, index=True)  # Given, When, Then, And, But
    step_text = Column(Text, nullable=False)  # Exact step text
    step_pattern = Column(Text, nullable=True)  # Parameterized pattern
    description = Column(Text, nullable=True)
    parameters = Column(Text, nullable=True)  # JSON string of parameter definitions
    usage_count = Column(Integer, default=0)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    tags = Column(String, nullable=True)  # Comma-separated tags
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    module = relationship("Module", foreign_keys=[module_id])
    creator = relationship("User", foreign_keys=[created_by])


class TestCaseStory(Base):
    __tablename__ = "test_case_stories"
    
    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    story_id = Column(String(50), ForeignKey("jira_stories.story_id"), nullable=False)
    linked_at = Column(DateTime, default=datetime.utcnow)
    linked_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    test_case = relationship("TestCase", backref="story_links")
    story = relationship("JiraStory", backref="test_case_links")
    linker = relationship("User", foreign_keys=[linked_by])

class FeatureFile(Base):
    __tablename__ = "feature_files"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # Gherkin feature file content
    description = Column(Text, nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    status = Column(String(20), default="draft")  # draft, pending_approval, published, archived
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)  # Track when file was published for archive ordering
    submitted_for_approval_at = Column(DateTime, nullable=True)  # When tester submitted for approval
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who approved
    approved_at = Column(DateTime, nullable=True)  # When admin approved
    
    # Relationships
    module = relationship("Module", foreign_keys=[module_id])
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])


class CsvWorkbook(Base):
    """CSV-based test case workbook with approval workflow"""
    __tablename__ = "csv_workbooks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    csv_content = Column(Text, nullable=False)  # JSON string of test case rows
    original_filename = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    status = Column(String(20), default="draft")  # draft, pending_approval, approved, rejected
    similarity_results = Column(Text, nullable=True)  # JSON string of similarity analysis
    
    # Approval workflow
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_for_approval_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    module = relationship("Module", foreign_keys=[module_id])
    creator = relationship("User", foreign_keys=[created_by])
    approver = relationship("User", foreign_keys=[approved_by])
    rejector = relationship("User", foreign_keys=[rejected_by])


class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="Open", index=True)  # Open, In Progress, Closed, Resolved
    priority = Column(String(20), default="Medium")  # High, Medium, Low, Critical
    severity = Column(String(20), default="Major")  # Critical, Major, Minor, Trivial
    
    # New fields for refactor
    video_url = Column(String, nullable=True)
    screenshot_urls = Column(Text, nullable=True)  # JSON string or comma-separated
    jira_assignee_id = Column(String(100), nullable=True)
    jira_assignee_name = Column(String(255), nullable=True)
    reporter_name = Column(String(100), nullable=True)
    jira_story_id = Column(String(50), nullable=True)
    
    # Linkages
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    release_id = Column(Integer, ForeignKey("releases.id"), nullable=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=True)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    
    # Similarity analysis - embedding vector (384 dimensions for all-MiniLM-L6-v2)
    # Uses pgvector's Vector type for native similarity operators
    embedding = Column(Vector(384), nullable=True)
    embedding_model = Column(String(50), nullable=True)  # Track which model generated the embedding
    
    # Relationships
    module = relationship("Module", backref="issues")
    release = relationship("Release", backref="issues")
    test_case = relationship("TestCase", backref="issues")
    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to])


class ApplicationSetting(Base):
    """Application-wide settings stored in database"""
    __tablename__ = "application_settings"
    
    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SmartSearchLog(Base):
    """Logs for smart search queries - tracks usage and token consumption"""
    __tablename__ = "smart_search_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    query = Column(Text, nullable=False)
    intent = Column(String(50), nullable=True)
    target_page = Column(String(100), nullable=True)
    filters = Column(postgresql.JSONB, nullable=True)  # Extracted filters as JSON
    semantic_query = Column(Text, nullable=True)  # Semantic search portion
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    results_count = Column(Integer, default=0)
    confidence = Column(Float, nullable=True)
    cached = Column(Boolean, default=False)
    response_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="smart_search_logs")


class LLMResponseCache(Base):
    """Persistent cache for LLM responses to reduce API calls and costs"""
    __tablename__ = "llm_response_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(64), unique=True, index=True, nullable=False)  # MD5 hash of query+context
    query = Column(Text, nullable=False)  # Original query for reference
    response_json = Column(postgresql.JSONB, nullable=False)  # Cached LLM response
    input_tokens = Column(Integer, default=0)  # Token usage when originally generated
    output_tokens = Column(Integer, default=0)
    hit_count = Column(Integer, default=0)  # How many times this cache entry was used
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)  # When this cache entry expires
    last_accessed_at = Column(DateTime, default=datetime.utcnow)


class NavigationRegistry(Base):
    """Registry of available pages/navigation targets for smart search"""
    __tablename__ = "navigation_registry"
    
    page_key = Column(String(50), primary_key=True)
    display_name = Column(String(100), nullable=False)
    path = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)  # test_case, issue, story, release, etc.
    filters = Column(postgresql.JSONB, nullable=True)  # Available filter fields
    searchable_fields = Column(postgresql.JSONB, nullable=True)  # Fields that support semantic search
    capabilities = Column(postgresql.JSONB, nullable=True)  # What this page can do
    example_queries = Column(postgresql.JSONB, nullable=True)  # Example queries for this page
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
