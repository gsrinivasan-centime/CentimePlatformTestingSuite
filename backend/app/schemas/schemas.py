from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    TESTER = "tester"
    DEVELOPER = "developer"

class TestType(str, Enum):
    MANUAL = "manual"
    AUTOMATED = "automated"

class TestStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"
    SKIPPED = "skipped"

class AutomationStatus(str, Enum):
    WORKING = "working"
    BROKEN = "broken"

class TestTag(str, Enum):
    UI = "ui"
    API = "api"
    HYBRID = "hybrid"

class ExecutionStatus(str, Enum):
    NOT_STARTED = "not_started"
    PASSED = "passed"
    FAILED = "failed"
    BLOCKED = "blocked"
    SKIPPED = "skipped"
    IN_PROGRESS = "in_progress"

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"

class ApprovalRole(str, Enum):
    QA_LEAD = "qa_lead"
    DEV_LEAD = "dev_lead"
    PRODUCT_MANAGER = "product_manager"
    RELEASE_MANAGER = "release_manager"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.TESTER

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    is_active: bool
    is_email_verified: bool
    email_verified_at: Optional[datetime] = None
    is_super_admin: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# Module Schemas
class ModuleBase(BaseModel):
    name: str
    description: Optional[str] = None

class ModuleCreate(ModuleBase):
    pass

class Module(ModuleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# SubModule Schemas
class SubModuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    module_id: int

class SubModuleCreate(SubModuleBase):
    pass

class SubModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class SubModule(SubModuleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Feature Schemas
class FeatureBase(BaseModel):
    name: str
    description: Optional[str] = None
    sub_module_id: int

class FeatureCreate(FeatureBase):
    pass

class FeatureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Feature(FeatureBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Release Schemas
class ReleaseBase(BaseModel):
    version: str
    name: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None

class ReleaseCreate(ReleaseBase):
    pass

class Release(ReleaseBase):
    id: int
    created_at: datetime
    progress: Optional[int] = 0  # Computed field for test execution progress percentage
    
    class Config:
        from_attributes = True

# Test Case Schemas
class TestCaseBase(BaseModel):
    test_id: str
    title: str
    description: Optional[str] = None
    test_type: TestType
    module_id: Optional[int] = None
    sub_module: Optional[str] = None  # NEW: e.g., "Suppliers", "Invoices"
    feature_section: Optional[str] = None  # NEW: e.g., "Supplier Profile", "List View"
    tag: TestTag  # NEW: ui/api/hybrid - used for auto-generating test_id
    tags: Optional[str] = None  # NEW: Additional tags like smoke, regression (comma-separated)
    automation_status: Optional[AutomationStatus] = None  # NEW: working/broken for automated, null for manual
    scenario_examples: Optional[str] = None  # NEW: JSON string for scenario outline examples/parameters
    jira_story_id: Optional[str] = None  # JIRA story ID (e.g., "CTP-1234")
    jira_epic_id: Optional[str] = None  # JIRA epic ID (e.g., "CTP-100")
    jira_labels: Optional[str] = None  # JIRA labels as JSON array string
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    preconditions: Optional[str] = None
    test_data: Optional[str] = None
    automated_script_path: Optional[str] = None

class TestCaseCreate(TestCaseBase):
    # test_id will be auto-generated based on tag, so we override to make it optional
    test_id: Optional[str] = None

class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    test_type: Optional[TestType] = None
    module_id: Optional[int] = None
    sub_module: Optional[str] = None  # NEW
    feature_section: Optional[str] = None  # NEW
    tag: Optional[TestTag] = None  # NEW
    tags: Optional[str] = None  # NEW
    automation_status: Optional[AutomationStatus] = None  # NEW
    scenario_examples: Optional[str] = None  # NEW
    jira_story_id: Optional[str] = None  # JIRA story ID
    jira_epic_id: Optional[str] = None  # JIRA epic ID
    jira_labels: Optional[str] = None  # JIRA labels
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    preconditions: Optional[str] = None
    test_data: Optional[str] = None
    automated_script_path: Optional[str] = None

# NEW: Bulk update schema
class TestCaseBulkUpdate(BaseModel):
    test_case_ids: List[int]
    module_id: Optional[int] = None
    sub_module: Optional[str] = None
    feature_section: Optional[str] = None
    test_type: Optional[TestType] = None
    tag: Optional[TestTag] = None
    tags: Optional[str] = None
    automation_status: Optional[AutomationStatus] = None

class TestCase(TestCaseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    module: Optional[Module] = None
    
    class Config:
        from_attributes = True

# Test Execution Schemas
class TestExecutionBase(BaseModel):
    test_case_id: int
    release_id: int
    status: TestStatus
    actual_result: Optional[str] = None
    execution_time: Optional[int] = None
    error_message: Optional[str] = None
    screenshot_path: Optional[str] = None

class TestExecutionCreate(TestExecutionBase):
    pass

class TestExecution(TestExecutionBase):
    id: int
    executor_id: int
    executed_at: datetime
    test_case: Optional[TestCase] = None
    executor: Optional[User] = None
    
    class Config:
        from_attributes = True

# JIRA Defect Schemas
class JiraDefectBase(BaseModel):
    jira_id: str
    summary: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None

class JiraDefectCreate(JiraDefectBase):
    test_execution_id: int

class JiraDefect(JiraDefectBase):
    id: int
    test_execution_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Report Schemas
class ModuleTestReport(BaseModel):
    module_name: str
    total_tests: int
    passed: int
    failed: int
    pending: int
    skipped: int
    pass_percentage: float

class IssueStats(BaseModel):
    total_issues: int
    open: int
    in_progress: int
    resolved: int
    closed: int
    by_priority: dict  # {high: int, medium: int, low: int, critical: int}
    by_module: List[dict]  # [{module_name: str, count: int}]

class ReleaseReport(BaseModel):
    release_version: str
    release_name: Optional[str]
    total_modules: int
    modules_tested: int
    modules_not_tested: int
    total_test_cases: int
    executed_test_cases: int
    passed: int
    failed: int
    pending: int
    skipped: int
    pass_percentage: float
    module_reports: List[ModuleTestReport]
    issue_stats: Optional[IssueStats]
    generated_at: datetime

# Release Test Case Schemas
class ReleaseTestCaseBase(BaseModel):
    release_id: int
    test_case_id: int
    module_id: int
    sub_module_id: Optional[int] = None
    feature_id: Optional[int] = None
    priority: Optional[str] = None
    execution_status: ExecutionStatus = ExecutionStatus.NOT_STARTED
    comments: Optional[str] = None
    bug_ids: Optional[str] = None
    screenshots: Optional[str] = None
    display_order: int = 0

class ReleaseTestCaseCreate(ReleaseTestCaseBase):
    pass

class AddTestCasesToRelease(BaseModel):
    test_case_ids: List[int]

class ReleaseTestCaseUpdate(BaseModel):
    execution_status: Optional[ExecutionStatus] = None
    executed_by_id: Optional[int] = None
    execution_date: Optional[datetime] = None
    execution_duration: Optional[int] = None
    comments: Optional[str] = None
    bug_ids: Optional[str] = None
    screenshots: Optional[str] = None
    priority: Optional[str] = None
    display_order: Optional[int] = None

class ReleaseTestCase(ReleaseTestCaseBase):
    id: int
    executed_by_id: Optional[int] = None
    execution_date: Optional[datetime] = None
    execution_duration: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Release Approval Schemas
class ReleaseApprovalBase(BaseModel):
    release_id: int
    approver_id: int
    role: ApprovalRole
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    comments: Optional[str] = None

class ReleaseApprovalCreate(ReleaseApprovalBase):
    pass

class ReleaseApprovalUpdate(BaseModel):
    approval_status: Optional[ApprovalStatus] = None
    comments: Optional[str] = None

class ReleaseApproval(ReleaseApprovalBase):
    id: int
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Release History Schemas
class ReleaseHistoryBase(BaseModel):
    release_id: int
    user_id: int
    action: str
    details: Optional[str] = None

class ReleaseHistoryCreate(ReleaseHistoryBase):
    pass

class ReleaseHistory(ReleaseHistoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Dashboard Statistics Schema
class ModuleStats(BaseModel):
    module_id: int
    module_name: str
    total: int
    passed: int
    failed: int
    blocked: int
    not_started: int
    in_progress: int
    skipped: int
    pass_rate: float

class ReleaseDashboard(BaseModel):
    release_id: int
    release_version: str
    release_name: Optional[str]
    environment: Optional[str]
    overall_status: str
    total_test_cases: int
    passed: int
    failed: int
    blocked: int
    not_started: int
    in_progress: int
    skipped: int
    pass_rate: float
    module_stats: List[ModuleStats]
    critical_issues: List[str]
    issue_stats: Optional[IssueStats]
    last_updated: datetime

# Tree View Schemas
class TreeTestCase(BaseModel):
    id: int
    test_id: str
    title: str
    execution_status: ExecutionStatus
    priority: Optional[str]
    executed_by: Optional[str]
    execution_date: Optional[datetime]
    comments: Optional[str]
    bug_ids: Optional[str]

class TreeFeature(BaseModel):
    id: int
    name: str
    test_cases: List[TreeTestCase]
    stats: dict  # {total, passed, failed, blocked, not_started}

class TreeSubModule(BaseModel):
    id: int
    name: str
    features: List[TreeFeature]
    stats: dict

class TreeModule(BaseModel):
    id: int
    name: str
    sub_modules: List[TreeSubModule]
    stats: dict

# JIRA Story Schemas
class JiraStoryBase(BaseModel):
    story_id: str
    epic_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    sprint: Optional[str] = None
    release: Optional[str] = None

class JiraStoryCreate(JiraStoryBase):
    pass

class JiraStoryUpdate(BaseModel):
    story_id: Optional[str] = None
    epic_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    sprint: Optional[str] = None
    release: Optional[str] = None

class JiraStory(JiraStoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    last_synced_at: Optional[datetime] = None
    test_case_count: int = 0
    
    class Config:
        from_attributes = True

class ReleaseTreeView(BaseModel):
    release_id: int
    release_version: str
    modules: List[TreeModule]

# Step Catalog Schemas
class StepCatalogBase(BaseModel):
    step_type: str
    step_text: str
    step_pattern: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[str] = None
    module_id: Optional[int] = None
    tags: Optional[str] = None

class StepCatalogCreate(StepCatalogBase):
    pass

class StepCatalogUpdate(BaseModel):
    step_type: Optional[str] = None
    step_text: Optional[str] = None
    step_pattern: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[str] = None
    module_id: Optional[int] = None
    tags: Optional[str] = None
    usage_count: Optional[int] = None

class StepCatalog(StepCatalogBase):
    id: int
    usage_count: Optional[int] = 0
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Feature File Schemas
class FeatureFileBase(BaseModel):
    name: str
    content: str
    description: Optional[str] = None
    module_id: Optional[int] = None
    status: Optional[str] = "draft"

class FeatureFileCreate(FeatureFileBase):
    pass

class FeatureFileUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None
    module_id: Optional[int] = None
    status: Optional[str] = None

class FeatureFile(FeatureFileBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Issue Schemas
class IssueBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "Open"
    priority: Optional[str] = "Medium"
    severity: Optional[str] = "Major"
    module_id: Optional[int] = None
    release_id: Optional[int] = None
    test_case_id: Optional[int] = None
    assigned_to: Optional[int] = None
    
    # New fields
    video_url: Optional[str] = None
    screenshot_urls: Optional[str] = None
    jira_assignee_id: Optional[str] = None
    jira_assignee_email: Optional[str] = None
    reporter_name: Optional[str] = None
    jira_story_id: Optional[str] = None

class IssueCreate(IssueBase):
    pass

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    severity: Optional[str] = None
    module_id: Optional[int] = None
    release_id: Optional[int] = None
    test_case_id: Optional[int] = None
    assigned_to: Optional[int] = None
    jira_assignee_id: Optional[str] = None
    jira_assignee_name: Optional[str] = None
    jira_assignee_email: Optional[str] = None
    jira_story_id: Optional[str] = None
    closed_at: Optional[datetime] = None

class Issue(IssueBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    
    # Nested models for display
    module: Optional[Module] = None
    assignee: Optional[User] = None
    creator: Optional[User] = None
    
    class Config:
        from_attributes = True
