from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    TESTER = "tester"

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

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

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
    
    class Config:
        from_attributes = True

# Test Case Schemas
class TestCaseBase(BaseModel):
    test_id: str
    title: str
    description: Optional[str] = None
    test_type: TestType
    module_id: int
    sub_module: Optional[str] = None  # NEW: e.g., "Suppliers", "Invoices"
    feature_section: Optional[str] = None  # NEW: e.g., "Supplier Profile", "List View"
    tag: TestTag  # NEW: ui/api/hybrid - used for auto-generating test_id
    tags: Optional[str] = None  # NEW: Additional tags like smoke, regression (comma-separated)
    automation_status: Optional[AutomationStatus] = None  # NEW: working/broken for automated, null for manual
    scenario_examples: Optional[str] = None  # NEW: JSON string for scenario outline examples/parameters
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
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    preconditions: Optional[str] = None
    test_data: Optional[str] = None
    automated_script_path: Optional[str] = None

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
    generated_at: datetime
