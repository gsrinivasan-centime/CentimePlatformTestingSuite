# Centime QA Portal - Database Schema & API Reference

**Technical Reference Document**  
**Version:** 1.0  
**Last Updated:** November 27, 2025

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [API Endpoints Reference](#3-api-endpoints-reference)
4. [Data Flow Diagrams](#4-data-flow-diagrams)

---

## 1. Database Schema

### Overview

The database is hosted on **Supabase (Cloud PostgreSQL)** with 15 tables organized into the following domains:

| Domain | Tables | Purpose |
|--------|--------|---------|
| **Users & Auth** | users | User management and authentication |
| **Organization** | modules, sub_modules, features | Hierarchical test organization |
| **Test Management** | test_cases, test_executions | Core test case data and executions |
| **Release Management** | releases, release_test_cases, release_approvals, release_history | Release tracking and workflows |
| **JIRA Integration** | jira_stories, jira_defects, test_case_stories | JIRA data and linking |
| **BDD/Gherkin** | step_catalog, feature_files | Step definitions and feature files |
| **Issue Tracking** | issues | Bug/issue management |

---

### 1.1 Users Table

Stores user accounts and authentication data.

```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name       VARCHAR,
    role            user_role DEFAULT 'tester',  -- enum: admin, tester
    is_active       BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| email | VARCHAR | Unique email (must be @centime.com) |
| hashed_password | VARCHAR | bcrypt hashed password |
| full_name | VARCHAR | User's display name |
| role | ENUM | `admin` or `tester` |
| is_active | BOOLEAN | Account active status |
| is_email_verified | BOOLEAN | Email verification status |

---

### 1.2 Modules Table

Top-level organizational unit for test cases.

```sql
CREATE TABLE modules (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

**Example Data:**
| id | name | description |
|----|------|-------------|
| 1 | Account Payable | Invoice and payment processing |
| 2 | Payments | Payment flows and methods |
| 3 | Invoices | Invoice management |

---

### 1.3 Sub-Modules Table

Second-level hierarchy under modules.

```sql
CREATE TABLE sub_modules (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR NOT NULL,
    description TEXT,
    module_id   INTEGER REFERENCES modules(id) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

### 1.4 Features Table

Third-level hierarchy under sub-modules.

```sql
CREATE TABLE features (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR NOT NULL,
    description   TEXT,
    sub_module_id INTEGER REFERENCES sub_modules(id) ON DELETE CASCADE NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

---

### 1.5 Test Cases Table (Core Entity)

Central table storing all test case definitions.

```sql
CREATE TABLE test_cases (
    id                    SERIAL PRIMARY KEY,
    test_id               VARCHAR UNIQUE NOT NULL,  -- e.g., TC_UI_001
    title                 VARCHAR NOT NULL,
    description           TEXT,
    test_type             test_type NOT NULL,       -- enum: manual, automated
    module_id             INTEGER REFERENCES modules(id),
    sub_module            VARCHAR,                  -- e.g., "Suppliers"
    feature_section       VARCHAR,                  -- e.g., "Create Form"
    tag                   test_tag NOT NULL,        -- enum: ui, api, hybrid
    tags                  VARCHAR,                  -- e.g., "smoke,regression"
    automation_status     automation_status,        -- enum: working, broken
    jira_story_id         VARCHAR(50),              -- e.g., "CTP-1234"
    jira_epic_id          VARCHAR(50),              -- e.g., "CTP-100"
    jira_labels           TEXT,                     -- JSON array
    scenario_examples     TEXT,                     -- JSON for data-driven tests
    steps_to_reproduce    TEXT,
    expected_result       TEXT,
    preconditions         TEXT,
    test_data             TEXT,
    automated_script_path VARCHAR,                  -- Path to pytest file
    created_by            INTEGER REFERENCES users(id),
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| test_id | VARCHAR | Auto-generated: TC_UI_001, TC_API_001, TC_HYBRID_001 |
| test_type | ENUM | `manual` or `automated` |
| tag | ENUM | `ui`, `api`, or `hybrid` |
| tags | VARCHAR | Comma-separated: smoke, regression, sanity, prod, e2e, performance |
| automation_status | ENUM | `working` or `broken` (automated tests only) |
| scenario_examples | TEXT | JSON for BDD scenario outline parameters |

**Scenario Examples JSON Format:**
```json
{
  "columns": ["Amount", "Expected Status"],
  "rows": [
    ["$0", "Invalid"],
    ["$100", "Valid"],
    ["$-50", "Invalid"]
  ]
}
```

---

### 1.6 Releases Table

Release/version management.

```sql
CREATE TABLE releases (
    id             SERIAL PRIMARY KEY,
    version        VARCHAR UNIQUE NOT NULL,  -- e.g., "R 2.90"
    name           VARCHAR,
    description    TEXT,
    release_date   TIMESTAMP,
    environment    VARCHAR,                  -- dev, staging, production
    overall_status VARCHAR DEFAULT 'not_started',
    qa_lead_id     INTEGER REFERENCES users(id),
    created_at     TIMESTAMP DEFAULT NOW()
);
```

---

### 1.7 Release Test Cases Table (Junction)

Links test cases to releases with execution tracking.

```sql
CREATE TABLE release_test_cases (
    id               SERIAL PRIMARY KEY,
    release_id       INTEGER REFERENCES releases(id) NOT NULL,
    test_case_id     INTEGER REFERENCES test_cases(id) NOT NULL,
    module_id        INTEGER REFERENCES modules(id) NOT NULL,
    sub_module_id    INTEGER REFERENCES sub_modules(id),
    feature_id       INTEGER REFERENCES features(id),
    priority         VARCHAR,                 -- high, medium, low
    execution_status execution_status DEFAULT 'not_started',
    executed_by_id   INTEGER REFERENCES users(id),
    execution_date   TIMESTAMP,
    execution_duration INTEGER,               -- seconds
    comments         TEXT,
    bug_ids          VARCHAR,                 -- comma-separated JIRA IDs
    screenshots      TEXT,                    -- JSON array of paths
    display_order    INTEGER DEFAULT 0,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);
```

**Execution Status Values:**
- `not_started` - Test not yet run
- `in_progress` - Currently executing
- `passed` - Test passed
- `failed` - Test failed
- `blocked` - Blocked by dependency
- `skipped` - Intentionally skipped

---

### 1.8 Release Approvals Table

Multi-role approval workflow for releases.

```sql
CREATE TABLE release_approvals (
    id              SERIAL PRIMARY KEY,
    release_id      INTEGER REFERENCES releases(id) NOT NULL,
    approver_id     INTEGER REFERENCES users(id) NOT NULL,
    role            approval_role NOT NULL,    -- qa_lead, dev_lead, product_manager
    approval_status approval_status DEFAULT 'pending',
    comments        TEXT,
    approved_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 1.9 Release History Table

Audit trail for release changes.

```sql
CREATE TABLE release_history (
    id         SERIAL PRIMARY KEY,
    release_id INTEGER REFERENCES releases(id) NOT NULL,
    user_id    INTEGER REFERENCES users(id) NOT NULL,
    action     VARCHAR NOT NULL,              -- created, updated, approved, etc.
    details    TEXT,                          -- JSON with change details
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 1.10 Test Executions Table

Historical record of test runs.

```sql
CREATE TABLE test_executions (
    id              SERIAL PRIMARY KEY,
    test_case_id    INTEGER REFERENCES test_cases(id),
    release_id      INTEGER REFERENCES releases(id),
    executor_id     INTEGER REFERENCES users(id),
    status          test_status NOT NULL,     -- pass, fail, pending, skipped
    actual_result   TEXT,
    execution_time  INTEGER,                  -- seconds
    error_message   TEXT,
    screenshot_path VARCHAR,
    executed_at     TIMESTAMP DEFAULT NOW()
);
```

---

### 1.11 JIRA Stories Table

Imported JIRA user stories.

```sql
CREATE TABLE jira_stories (
    id             SERIAL PRIMARY KEY,
    story_id       VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "CTP-1234"
    epic_id        VARCHAR(50),                   -- e.g., "CTP-100"
    title          VARCHAR NOT NULL,
    description    TEXT,
    status         VARCHAR(50),                   -- "To Do", "In Progress", "Done"
    priority       VARCHAR(20),                   -- "High", "Medium", "Low"
    assignee       VARCHAR,
    sprint         VARCHAR,
    release        VARCHAR(100),                  -- Fix Version
    created_by     INTEGER REFERENCES users(id),
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW(),
    last_synced_at TIMESTAMP                      -- Last JIRA sync time
);
```

---

### 1.12 Test Case Stories Table (Junction)

Many-to-many linking between test cases and JIRA stories.

```sql
CREATE TABLE test_case_stories (
    id           SERIAL PRIMARY KEY,
    test_case_id INTEGER REFERENCES test_cases(id) NOT NULL,
    story_id     VARCHAR(50) REFERENCES jira_stories(story_id) NOT NULL,
    linked_at    TIMESTAMP DEFAULT NOW(),
    linked_by    INTEGER REFERENCES users(id)
);
```

---

### 1.13 JIRA Defects Table

Bug tracking from failed test executions.

```sql
CREATE TABLE jira_defects (
    id                SERIAL PRIMARY KEY,
    test_execution_id INTEGER REFERENCES test_executions(id),
    jira_id           VARCHAR NOT NULL,        -- e.g., "BUG-123"
    summary           VARCHAR,
    status            VARCHAR,
    priority          VARCHAR,
    created_at        TIMESTAMP DEFAULT NOW()
);
```

---

### 1.14 Step Catalog Table

Reusable Gherkin step definitions for BDD.

```sql
CREATE TABLE step_catalog (
    id          SERIAL PRIMARY KEY,
    step_type   VARCHAR(10) NOT NULL,          -- Given, When, Then, And, But
    step_text   TEXT NOT NULL,                 -- Exact step text
    step_pattern TEXT,                         -- Parameterized pattern
    description TEXT,
    parameters  TEXT,                          -- JSON of parameter definitions
    usage_count INTEGER DEFAULT 0,
    module_id   INTEGER REFERENCES modules(id),
    tags        VARCHAR,                       -- Comma-separated
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

---

### 1.15 Feature Files Table

BDD/Gherkin feature file storage.

```sql
CREATE TABLE feature_files (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR NOT NULL,
    content     TEXT NOT NULL,                 -- Full Gherkin content
    description TEXT,
    module_id   INTEGER REFERENCES modules(id),
    status      VARCHAR(20) DEFAULT 'draft',   -- draft, published, archived
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

---

### 1.16 Issues Table

Bug/issue tracking with media attachments.

```sql
CREATE TABLE issues (
    id                 SERIAL PRIMARY KEY,
    title              VARCHAR(255) NOT NULL,
    description        TEXT,
    status             VARCHAR(50) DEFAULT 'Open',   -- Open, In Progress, Closed
    priority           VARCHAR(20) DEFAULT 'Medium', -- Critical, High, Medium, Low
    severity           VARCHAR(20) DEFAULT 'Major',  -- Critical, Major, Minor, Trivial
    video_url          VARCHAR,                      -- Cloud storage URL
    screenshot_urls    TEXT,                         -- JSON array
    jira_assignee_id   VARCHAR(100),
    jira_assignee_name VARCHAR(255),
    reporter_name      VARCHAR(100),
    jira_story_id      VARCHAR(50),
    module_id          INTEGER REFERENCES modules(id),
    release_id         INTEGER REFERENCES releases(id),
    test_case_id       INTEGER REFERENCES test_cases(id),
    created_by         INTEGER REFERENCES users(id),
    assigned_to        INTEGER REFERENCES users(id),
    created_at         TIMESTAMP DEFAULT NOW(),
    updated_at         TIMESTAMP DEFAULT NOW(),
    closed_at          TIMESTAMP
);
```

---

## 2. Entity Relationship Diagram

```
                                    ┌─────────────────┐
                                    │     Users       │
                                    ├─────────────────┤
                                    │ id (PK)         │
                                    │ email           │
                                    │ role            │
                                    └────────┬────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            │                                │                                │
            ▼                                ▼                                ▼
┌───────────────────┐            ┌───────────────────┐            ┌───────────────────┐
│     Modules       │            │    Test Cases     │            │     Releases      │
├───────────────────┤            ├───────────────────┤            ├───────────────────┤
│ id (PK)           │◄───────────┤ module_id (FK)    │            │ id (PK)           │
│ name              │            │ id (PK)           │            │ version           │
│ description       │            │ test_id           │            │ qa_lead_id (FK)───┘
└─────────┬─────────┘            │ title             │            └─────────┬─────────┘
          │                      │ test_type         │                      │
          │ 1:N                  │ tag               │                      │ 1:N
          ▼                      │ jira_story_id ────┼──────┐               ▼
┌───────────────────┐            └─────────┬─────────┘      │   ┌───────────────────┐
│   Sub-Modules     │                      │                │   │Release Test Cases │
├───────────────────┤                      │ 1:N            │   ├───────────────────┤
│ id (PK)           │                      ▼                │   │ release_id (FK)   │
│ module_id (FK)    │            ┌───────────────────┐      │   │ test_case_id (FK) │
│ name              │            │  Test Executions  │      │   │ execution_status  │
└─────────┬─────────┘            ├───────────────────┤      │   └───────────────────┘
          │                      │ test_case_id (FK) │      │
          │ 1:N                  │ release_id (FK)   │      │
          ▼                      │ status            │      │
┌───────────────────┐            └───────────────────┘      │
│    Features       │                                       │
├───────────────────┤                                       │
│ id (PK)           │                                       ▼
│ sub_module_id (FK)│            ┌───────────────────┐    ┌───────────────────┐
│ name              │            │   JIRA Stories    │◄───┤Test Case Stories  │
└───────────────────┘            ├───────────────────┤    ├───────────────────┤
                                 │ story_id (PK)     │    │ test_case_id (FK) │
                                 │ epic_id           │    │ story_id (FK)     │
                                 │ title             │    └───────────────────┘
                                 │ status            │
                                 └───────────────────┘
```

---

## 3. API Endpoints Reference

### Base URL
- **Production:** `https://qa-portal.ddns.net/api`
- **Local:** `http://localhost:8000/api`
- **API Docs:** `/docs` (Swagger UI)

---

### 3.1 Authentication APIs (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login and get JWT token |
| POST | `/auth/refresh` | Refresh JWT token |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/verify-email` | Verify email with token |
| POST | `/auth/resend-verification` | Resend verification email |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

**Login Request:**
```json
{
  "username": "user@centime.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

### 3.2 Users APIs (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/users/{id}` | Get user by ID |
| PUT | `/users/{id}` | Update user |
| DELETE | `/users/{id}` | Delete user |

---

### 3.3 Modules APIs (`/api/modules`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/modules` | List all modules |
| POST | `/modules` | Create new module |
| GET | `/modules/{id}` | Get module by ID |
| PUT | `/modules/{id}` | Update module |
| DELETE | `/modules/{id}` | Delete module |

---

### 3.4 Sub-Modules APIs (`/api/sub-modules`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sub-modules` | List sub-modules (filter by module_id) |
| POST | `/sub-modules` | Create sub-module |
| GET | `/sub-modules/{id}` | Get by ID |
| PUT | `/sub-modules/{id}` | Update |
| DELETE | `/sub-modules/{id}` | Delete |

---

### 3.5 Features APIs (`/api/features`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/features` | List features (filter by sub_module_id) |
| POST | `/features` | Create feature |
| GET | `/features/{id}` | Get by ID |
| PUT | `/features/{id}` | Update |
| DELETE | `/features/{id}` | Delete |

---

### 3.6 Test Cases APIs (`/api/test-cases`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/test-cases` | List all test cases |
| POST | `/test-cases` | Create test case |
| GET | `/test-cases/{id}` | Get by ID |
| PUT | `/test-cases/{id}` | Update test case |
| DELETE | `/test-cases/{id}` | Delete test case |
| **PUT** | **`/test-cases/bulk-update`** | **Bulk update multiple test cases** |
| POST | `/test-cases/bulk-upload` | Bulk upload from CSV |
| POST | `/test-cases/bulk-upload-feature` | Bulk upload from BDD feature file |
| GET | `/test-cases/generate-test-id` | Generate next test ID |
| GET | `/test-cases/hierarchy/structure` | Get hierarchy tree |
| GET | `/test-cases/hierarchy/options` | Get dropdown options |
| GET | `/test-cases/by-jira-story` | Get test cases grouped by story |

**Bulk Update Request:**
```json
{
  "test_case_ids": [1, 2, 3, 4, 5],
  "module_id": 2,
  "tags": "smoke,regression",
  "automation_status": "working"
}
```

**Test Case Create/Update:**
```json
{
  "title": "Verify login with valid credentials",
  "description": "Test successful login flow",
  "test_type": "automated",
  "tag": "ui",
  "tags": "smoke,regression",
  "module_id": 1,
  "sub_module": "Authentication",
  "feature_section": "Login",
  "automation_status": "working",
  "jira_story_id": "CTP-1234",
  "preconditions": "User must be registered",
  "steps_to_reproduce": "1. Navigate to login\n2. Enter credentials\n3. Click submit",
  "expected_result": "User is redirected to dashboard"
}
```

---

### 3.7 JIRA Stories APIs (`/api/jira-stories`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jira-stories` | List all stories |
| POST | `/jira-stories` | Create/import story |
| GET | `/jira-stories/{story_id}` | Get story details |
| PUT | `/jira-stories/{story_id}` | Update story |
| DELETE | `/jira-stories/{story_id}` | Delete story |
| POST | `/jira-stories/{story_id}/refetch` | Sync from JIRA |
| GET | `/jira-stories/{story_id}/test-cases` | Get linked test cases |
| POST | `/jira-stories/{story_id}/link-test-case/{tc_id}` | Link test case |
| DELETE | `/jira-stories/{story_id}/unlink-test-case/{tc_id}` | Unlink test case |
| GET | `/jira-stories/epic/{epic_id}/stories` | Get stories by epic |
| POST | `/jira-stories/import-from-jira` | Import from JIRA by ID |
| POST | `/jira-stories/sync-by-release/{version}` | Sync by fix version |
| POST | `/jira-stories/sync-all-stories` | Sync all stories |
| GET | `/jira-stories/jira-config-status` | Check JIRA config |

---

### 3.8 Releases APIs (`/api/releases`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/releases` | List all releases |
| POST | `/releases` | Create release |
| GET | `/releases/{id}` | Get release details |
| PUT | `/releases/{id}` | Update release |
| DELETE | `/releases/{id}` | Delete release |
| GET | `/releases/{id}/stories` | Get stories for release |
| POST | `/releases/{id}/sync-story-test-cases` | Sync test cases from stories |
| PATCH | `/releases/{id}/test-case/{tc_id}/execution-status` | Update execution status |

---

### 3.9 Release Management APIs (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/releases/{id}/test-cases` | Add test cases to release |
| GET | `/releases/{id}/test-cases` | Get release test cases |
| PUT | `/releases/{id}/test-cases/{tc_id}` | Update execution details |
| DELETE | `/releases/{id}/test-cases/{tc_id}` | Remove from release |
| GET | `/releases/{id}/dashboard` | Get dashboard stats |
| GET | `/releases/{id}/tree` | Get tree view data |
| POST | `/releases/{id}/approvals` | Create approval request |
| GET | `/releases/{id}/approvals` | Get approvals |
| PUT | `/releases/{id}/approvals/{apr_id}` | Update approval |
| GET | `/releases/{id}/history` | Get change history |

---

### 3.10 Executions APIs (`/api/executions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/executions` | List executions |
| POST | `/executions` | Create execution record |
| POST | `/executions/execute/{tc_id}` | Execute test case |
| GET | `/executions/{id}` | Get execution details |

---

### 3.11 Reports APIs (`/api/reports`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/release/{id}` | Get release report data |
| GET | `/reports/pdf/{id}` | Generate PDF report |
| GET | `/reports/summary` | Get overall summary stats |

---

### 3.12 Step Catalog & Design Studio APIs (`/api/step-catalog`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/step-catalog/steps` | List all steps |
| GET | `/step-catalog/steps/{id}` | Get step details |
| POST | `/step-catalog/steps` | Create step |
| PUT | `/step-catalog/steps/{id}` | Update step |
| DELETE | `/step-catalog/steps/{id}` | Delete step |
| POST | `/step-catalog/steps/{id}/increment-usage` | Track usage |
| GET | `/step-catalog/steps/stats/summary` | Get stats |
| GET | `/step-catalog/steps/search/suggestions` | Autocomplete |
| GET | `/step-catalog/feature-files` | List feature files |
| GET | `/step-catalog/feature-files/{id}` | Get file content |
| POST | `/step-catalog/feature-files` | Create file |
| PUT | `/step-catalog/feature-files/{id}` | Update file |
| DELETE | `/step-catalog/feature-files/{id}` | Delete file |
| GET | `/step-catalog/feature-files/{id}/preview-scenarios` | Preview scenarios |
| POST | `/step-catalog/feature-files/{id}/publish` | Publish (create test cases) |
| POST | `/step-catalog/feature-files/{id}/restore` | Restore from published |

---

### 3.13 Issues APIs (`/api/issues`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issues` | List all issues |
| POST | `/issues` | Create issue |
| GET | `/issues/{id}` | Get issue details |
| PUT | `/issues/{id}` | Update issue |
| DELETE | `/issues/{id}` | Delete issue |
| GET | `/issues/stats` | Get issue statistics |
| GET | `/issues/jira-users/search` | Search JIRA assignees |
| POST | `/issues/{id}/upload` | Upload media attachments |
| GET | `/issues/{id}/media-proxy` | Proxy media files |

---

## 4. Data Flow Diagrams

### 4.1 Test Case Creation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────►│  Frontend   │────►│   Backend   │────►│  Database   │
│  (Browser)  │     │   (React)   │     │  (FastAPI)  │     │(PostgreSQL) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │                    │
      │  Click "New TC"    │                    │                    │
      │───────────────────►│                    │                    │
      │                    │  GET /modules      │                    │
      │                    │───────────────────►│  SELECT * FROM     │
      │                    │                    │───────────────────►│
      │                    │◄───────────────────│◄───────────────────│
      │                    │  [modules list]    │                    │
      │◄───────────────────│                    │                    │
      │  Show form         │                    │                    │
      │                    │                    │                    │
      │  Fill & Submit     │                    │                    │
      │───────────────────►│  POST /test-cases  │                    │
      │                    │───────────────────►│  INSERT INTO       │
      │                    │                    │───────────────────►│
      │                    │◄───────────────────│◄───────────────────│
      │◄───────────────────│  {test_id: ...}    │                    │
      │  Success toast     │                    │                    │
```

### 4.2 JIRA Story Import Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │   Backend   │     │ JIRA Cloud  │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │                    │
      │  Import "CTP-123"  │                    │                    │
      │───────────────────►│  GET /issue/CTP-123│                    │
      │                    │───────────────────►│                    │
      │                    │◄───────────────────│                    │
      │                    │  {story data}      │                    │
      │                    │                    │                    │
      │                    │  INSERT INTO jira_stories               │
      │                    │───────────────────────────────────────►│
      │                    │◄───────────────────────────────────────│
      │◄───────────────────│                    │                    │
      │  Story imported    │                    │                    │
```

### 4.3 Release Execution Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   QA Tester │     │   Backend   │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │  Update status     │                    │
      │  TC_UI_001 = PASS  │                    │
      │───────────────────►│                    │
      │                    │  UPDATE release_test_cases
      │                    │  SET execution_status = 'passed'
      │                    │───────────────────►│
      │                    │◄───────────────────│
      │                    │                    │
      │                    │  INSERT INTO release_history
      │                    │───────────────────►│
      │                    │◄───────────────────│
      │◄───────────────────│                    │
      │  Status updated    │                    │
```

---

## Appendix: Enum Values Reference

### User Roles
```python
UserRole.ADMIN = "admin"
UserRole.TESTER = "tester"
```

### Test Types
```python
TestType.MANUAL = "manual"
TestType.AUTOMATED = "automated"
```

### Test Tags
```python
TestTag.UI = "ui"
TestTag.API = "api"
TestTag.HYBRID = "hybrid"
```

### Execution Status
```python
ExecutionStatus.NOT_STARTED = "not_started"
ExecutionStatus.IN_PROGRESS = "in_progress"
ExecutionStatus.PASSED = "passed"
ExecutionStatus.FAILED = "failed"
ExecutionStatus.BLOCKED = "blocked"
ExecutionStatus.SKIPPED = "skipped"
```

### Approval Status
```python
ApprovalStatus.PENDING = "pending"
ApprovalStatus.APPROVED = "approved"
ApprovalStatus.REJECTED = "rejected"
ApprovalStatus.CHANGES_REQUESTED = "changes_requested"
```

### Approval Roles
```python
ApprovalRole.QA_LEAD = "qa_lead"
ApprovalRole.DEV_LEAD = "dev_lead"
ApprovalRole.PRODUCT_MANAGER = "product_manager"
ApprovalRole.RELEASE_MANAGER = "release_manager"
```

---

*Document Version: 1.0 | Last Updated: November 27, 2025*
