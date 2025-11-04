from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    TESTER = "tester"

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

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.TESTER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
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
    
    # Unique constraint: sub-module name must be unique within a module
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )

class Feature(Base):
    __tablename__ = "features"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    sub_module_id = Column(Integer, ForeignKey("sub_modules.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sub_module = relationship("SubModule")
    
    # Unique constraint: feature name must be unique within a sub-module
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )

class Release(Base):
    __tablename__ = "releases"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, unique=True, nullable=False)
    name = Column(String)
    description = Column(Text)
    release_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    test_executions = relationship("TestExecution", back_populates="release")

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
