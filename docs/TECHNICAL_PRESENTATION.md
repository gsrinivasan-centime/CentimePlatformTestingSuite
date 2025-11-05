# Centime Platform Testing Suite - Technical Documentation

**Presentation for Leadership Review**  
**Date:** November 5, 2025  
**Version:** 1.0

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema & Relations](#2-database-schema--relations)
3. [API Controllers & Endpoints](#3-api-controllers--endpoints)
4. [API to Database Mapping](#4-api-to-database-mapping)
5. [Frontend to Backend Architecture](#5-frontend-to-backend-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Key Features](#7-key-features)

---

## 1. System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  React 18.2.0 + Material-UI 5.14.20 (Port: 3000)                │
│  - Test Case Management  - Release Management                    │
│  - Story Management      - Reports & Analytics                   │
│  - Module Organization   - User Authentication                   │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API (JSON)
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                        Backend Layer                             │
│  FastAPI + Python 3.13 (Port: 8000)                             │
│  - JWT Authentication    - CRUD Operations                       │
│  - Business Logic        - Data Validation                       │
│  - JIRA Integration      - Report Generation                     │
└────────────────────┬────────────────────────────────────────────┘
                     │ SQLAlchemy ORM
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                       Database Layer                             │
│  SQLite (test_management.db)                                     │
│  - User & Auth Data      - Test Cases & Executions              │
│  - Modules & Features    - Releases & Approvals                 │
│  - JIRA Stories          - Reports & History                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    External Integration                          │
│  JIRA Cloud REST API v3                                          │
│  - Story Import          - Epic Management                       │
│  - Status Sync           - Release Tracking                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Relations

### Entity Relationship Diagram (ERD)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CORE ENTITIES                                    │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Users     │         │   Modules    │         │  SubModules  │
├─────────────┤         ├──────────────┤         ├──────────────┤
│ PK id       │         │ PK id        │         │ PK id        │
│    email    │         │    name      │◄────────┤ FK module_id │
│    password │         │    desc      │    1:N  │    name      │
│    role     │         └──────┬───────┘         │    desc      │
│    ...      │                │                 └──────┬───────┘
└─────┬───────┘                │                        │
      │                        │                        │
      │                        │                        │
      │                  1:N   │                   1:N  │
      │                        │                        │
      │               ┌────────▼─────────┐      ┌──────▼───────┐
      │               │   Test Cases     │      │   Features   │
      │               ├──────────────────┤      ├──────────────┤
      │               │ PK id            │      │ PK id        │
      │               │    test_id       │      │ FK sub_mod_id│
      │               │ FK module_id     │      │    name      │
      │         ┌─────┤ FK created_by    │      │    desc      │
      │         │     │    title         │      └──────────────┘
      │         │     │    test_type     │
      │         │     │    tag (ui/api)  │
      │         │     │    jira_story_id │──────┐
      │         │     │    jira_epic_id  │      │
      │         │     │    sub_module    │      │
      │         │     │    feature       │      │
      │         │     │    ...           │      │
      │         │     └────────┬─────────┘      │
      │         │              │                │
      │         │              │                │
      │    1:N  │         1:N  │                │
      │         │              │                │
┌─────▼─────────▼──────────────▼────────┐      │    ┌──────────────┐
│        Test Executions                │      │    │ Jira Stories │
├───────────────────────────────────────┤      │    ├──────────────┤
│ PK id                                 │      └───►│ PK id        │
│ FK test_case_id                       │           │    story_id  │
│ FK release_id                         │           │    epic_id   │
│ FK executor_id                        │           │    title     │
│    status                             │           │    status    │
│    actual_result                      │           │    priority  │
│    error_message                      │           │    release   │
│    ...                                │           │    ...       │
└───────────────┬───────────────────────┘           └──────────────┘
                │
                │ 1:N
                │
        ┌───────▼────────┐
        │ Jira Defects   │
        ├────────────────┤
        │ PK id          │
        │ FK test_exec_id│
        │    jira_id     │
        │    summary     │
        │    status      │
        │    priority    │
        └────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                     RELEASE MANAGEMENT ENTITIES                           │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│    Releases      │
├──────────────────┤
│ PK id            │
│    version       │◄────────────┐
│    name          │             │
│    desc          │             │
│    release_date  │             │
│ FK qa_lead_id    │             │
│    ...           │             │
└────┬─────────────┘             │
     │                           │
     │ 1:N                       │
     │                           │
┌────▼────────────────────┐      │
│ Release Test Cases      │      │
├─────────────────────────┤      │
│ PK id                   │      │
│ FK release_id           │──────┘
│ FK test_case_id         │
│ FK module_id            │
│ FK sub_module_id        │
│ FK feature_id           │
│    priority             │
│    execution_status     │
│    executed_by_id       │
│    comments             │
│    bug_ids              │
│    ...                  │
└─────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│ Release Approvals│         │ Release History  │
├──────────────────┤         ├──────────────────┤
│ PK id            │         │ PK id            │
│ FK release_id    │         │ FK release_id    │
│ FK approver_id   │         │ FK user_id       │
│    role          │         │    action        │
│    status        │         │    details       │
│    comments      │         │    created_at    │
└──────────────────┘         └──────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│                            RELATIONSHIPS                                  │
└──────────────────────────────────────────────────────────────────────────┘

Users (1) ──────► (N) Test Cases (created_by)
Users (1) ──────► (N) Test Executions (executor)
Users (1) ──────► (N) Release Approvals (approver)
Users (1) ──────► (N) Release History (user)
Users (1) ──────► (N) Jira Stories (creator)
Users (1) ──────► (N) Releases (qa_lead)

Modules (1) ─────► (N) Test Cases
Modules (1) ─────► (N) SubModules
SubModules (1) ──► (N) Features

Test Cases (1) ──► (N) Test Executions
Test Cases (1) ──► (N) Release Test Cases
Test Cases (N) ──► (1) Jira Stories (via jira_story_id)

Releases (1) ────► (N) Test Executions
Releases (1) ────► (N) Release Test Cases
Releases (1) ────► (N) Release Approvals
Releases (1) ────► (N) Release History

Test Executions (1) ► (N) Jira Defects

Jira Stories ────► Releases (via release version matching)
```

### Database Tables Summary

| Table | Records | Primary Purpose |
|-------|---------|-----------------|
| users | ~10-100 | Authentication & authorization |
| modules | ~5-15 | Top-level test organization |
| sub_modules | ~20-50 | Secondary test categorization |
| features | ~50-200 | Detailed feature organization |
| test_cases | ~500-5000 | Core test case repository |
| test_executions | ~5000-50000 | Execution history & results |
| releases | ~10-100 | Release tracking |
| release_test_cases | ~1000-10000 | Test scope per release |
| release_approvals | ~50-500 | Multi-level approval workflow |
| jira_stories | ~100-1000 | JIRA story integration |
| jira_defects | ~100-1000 | Bug tracking |
| release_history | ~500-5000 | Audit trail |

---

## 3. API Controllers & Endpoints

### 3.1 Authentication & User Management (`auth.py`, `users.py`)

**Base Path:** `/api`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/auth/register` | Register new user | email, password, full_name | User object + token |
| POST | `/auth/login` | User login | email, password | Access token |
| POST | `/auth/verify-email/{token}` | Verify email address | - | Success message |
| GET | `/auth/me` | Get current user | - | User object |
| GET | `/users` | List all users | - | Array of users |
| PUT | `/users/{user_id}` | Update user | User data | Updated user |
| DELETE | `/users/{user_id}` | Delete user | - | Success message |

**Security:** JWT Bearer Token authentication required for protected endpoints

---

### 3.2 Module Management (`modules.py`, `sub_modules.py`, `features.py`)

**Base Path:** `/api`

#### Modules

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/modules` | Get all modules | Authenticated |
| POST | `/modules` | Create module | Authenticated |
| GET | `/modules/{id}` | Get module details | Authenticated |
| PUT | `/modules/{id}` | Update module | Authenticated |
| DELETE | `/modules/{id}` | Delete module | Authenticated |

#### Sub-Modules

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/sub-modules` | Get all sub-modules | Authenticated |
| GET | `/sub-modules?module_id={id}` | Get by module | Authenticated |
| POST | `/sub-modules` | Create sub-module | Authenticated |
| PUT | `/sub-modules/{id}` | Update sub-module | Authenticated |
| DELETE | `/sub-modules/{id}` | Delete sub-module | Authenticated |

#### Features

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/features` | Get all features | Authenticated |
| GET | `/features?sub_module_id={id}` | Get by sub-module | Authenticated |
| POST | `/features` | Create feature | Authenticated |
| PUT | `/features/{id}` | Update feature | Authenticated |
| DELETE | `/features/{id}` | Delete feature | Authenticated |

---

### 3.3 Test Case Management (`test_cases.py`)

**Base Path:** `/api/test-cases`

| Method | Endpoint | Description | Query Params | Request Body |
|--------|----------|-------------|--------------|--------------|
| GET | `/` | List test cases | module_id, tag, test_type, search | - |
| POST | `/` | Create test case | - | TestCase object |
| GET | `/{id}` | Get test case | - | - |
| PUT | `/{id}` | Update test case | - | TestCase object |
| DELETE | `/{id}` | Delete test case | - | - |
| POST | `/bulk-upload` | Bulk upload (CSV) | - | CSV file |
| GET | `/export` | Export to CSV | - | - |
| POST | `/bdd-upload` | Upload BDD features | - | .feature files |

**Key Features:**
- Advanced filtering (module, tag, type)
- Search functionality
- Bulk operations (import/export)
- BDD Gherkin feature file support

---

### 3.4 JIRA Story Management (`jira_stories.py`)

**Base Path:** `/api/jira-stories`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | List all stories | - | Array of stories |
| POST | `/` | Create story | Story object | Created story |
| GET | `/{story_id}` | Get story | - | Story object |
| PUT | `/{story_id}` | Update story | Story object | Updated story |
| DELETE | `/{story_id}` | Delete story | - | Success message |
| POST | `/{story_id}/refetch` | Refetch from JIRA | - | Updated story |
| GET | `/{story_id}/test-cases` | Get linked test cases | - | Array of test cases |
| POST | `/{story_id}/link-test-case/{tc_id}` | Link test case | - | Success message |
| DELETE | `/{story_id}/unlink-test-case/{tc_id}` | Unlink test case | - | Success message |
| POST | `/import-from-jira` | Import from JIRA URL | story_url | Imported story |
| GET | `/jira-config-status` | Check JIRA config | - | Config status |
| GET | `/epic/{epic_id}/stories` | Get stories by epic | - | Array of stories |

**JIRA Integration Features:**
- Import stories from JIRA Cloud
- Auto-sync with JIRA (status, priority, release)
- Link test cases to stories
- Auto-link test cases to releases via story release field
- Epic-based story grouping

---

### 3.5 Release Management (`releases.py`, `release_management.py`)

**Base Path:** `/api/releases`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | List all releases | - | Array of releases |
| POST | `/` | Create release | Release object | Created release |
| GET | `/{id}` | Get release | - | Release object |
| PUT | `/{id}` | Update release | Release object | Updated release |
| DELETE | `/{id}` | Delete release | - | Success message |
| POST | `/{id}/test-cases` | Add test cases | Array of test case IDs | Success |
| DELETE | `/{id}/test-cases/{tc_id}` | Remove test case | - | Success |
| PUT | `/{id}/test-cases/{tc_id}` | Update test case status | Status, comments | Updated |
| GET | `/{id}/stories` | Get linked stories | - | Array of stories |
| POST | `/{id}/sync-story-test-cases` | Sync test cases from stories | - | Sync summary |
| POST | `/{id}/approve` | Approve release | Approver role, comments | Approval record |
| GET | `/{id}/approvals` | Get approval status | - | Array of approvals |
| GET | `/{id}/history` | Get release history | - | Array of history |

**Release Features:**
- Test case scoping per release
- Execution status tracking
- Multi-level approval workflow
- Story-based test case linking
- Audit trail (history)

---

### 3.6 Test Execution (`executions.py`)

**Base Path:** `/api/executions`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | List executions | release_id, test_case_id | Array of executions |
| POST | `/` | Create execution | Execution object | Created execution |
| GET | `/{id}` | Get execution | - | Execution object |
| PUT | `/{id}` | Update execution | Execution object | Updated execution |
| DELETE | `/{id}` | Delete execution | - | Success message |

---

### 3.7 Reports & Analytics (`reports.py`)

**Base Path:** `/api/reports`

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/summary` | Get release summary | release_id, module_id | Summary object |
| GET | `/release/{release_id}` | Get release report | - | Report object |
| GET | `/pdf/{release_id}` | Generate PDF report | - | PDF file download |

**Report Features:**
- Overall test execution summary
- Module-wise breakdown
- Story-wise test coverage
- Sub-module and feature drill-down
- Failed test case details
- Pass/fail percentages
- PDF export with charts

---

## 4. API to Database Mapping

### 4.1 Test Case Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend: Test Cases Page                                       │
│  GET /api/test-cases?module_id=1&tag=ui                         │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend: test_cases.py → get_test_cases()                       │
│  • Applies filters (module, tag, type)                           │
│  • Joins with modules table for module name                      │
│  • Returns paginated results                                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Database Query:                                                  │
│  SELECT tc.*, m.name as module_name                              │
│  FROM test_cases tc                                               │
│  LEFT JOIN modules m ON tc.module_id = m.id                      │
│  WHERE tc.module_id = 1 AND tc.tag = 'ui'                        │
│  ORDER BY tc.created_at DESC                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 JIRA Story Integration Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend: Import Story from JIRA                                │
│  POST /api/jira-stories/import-from-jira                         │
│  Body: { "story_url": "https://jira.../CTP-1234" }              │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend: jira_stories.py → import_story_from_jira()             │
│  1. Parse JIRA URL to extract story ID                           │
│  2. Call JIRA REST API to fetch story details                    │
│  3. Extract: title, status, priority, epic, release              │
│  4. Create JiraStory record in database                          │
│  5. If release exists, auto-link test cases                      │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Database Operations:                                             │
│  1. INSERT INTO jira_stories (story_id, title, release, ...)     │
│  2. If release_version matches:                                  │
│     SELECT * FROM releases WHERE version = story.release         │
│  3. Link test cases:                                             │
│     INSERT INTO release_test_cases (release_id, test_case_id..)  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Release Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend: Add Test Cases to Release                             │
│  POST /api/releases/1/test-cases                                 │
│  Body: { "test_case_ids": [101, 102, 103] }                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend: releases.py → add_test_cases_to_release()              │
│  For each test case:                                             │
│  1. Fetch test case details (module, sub_module, feature)        │
│  2. Look up sub_module_id and feature_id from names              │
│  3. Create ReleaseTestCase record                                │
│  4. Set default execution_status = NOT_STARTED                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Database Queries:                                                │
│  1. SELECT * FROM test_cases WHERE id IN (101, 102, 103)         │
│  2. SELECT id FROM sub_modules WHERE name = tc.sub_module        │
│  3. SELECT id FROM features WHERE name = tc.feature_section      │
│  4. INSERT INTO release_test_cases (                             │
│       release_id, test_case_id, module_id, sub_module_id,        │
│       feature_id, priority, execution_status                     │
│     ) VALUES (...)                                                │
└──────────────────────────────────────────────────────────────────┘
```

### 4.4 Report Generation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend: Generate Report                                        │
│  GET /api/reports/summary?release_id=1                           │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Backend: reports.py → get_release_summary()                     │
│  1. Fetch all release_test_cases for release                     │
│  2. Group by module → sub_module → feature                       │
│  3. Calculate statistics (passed, failed, blocked, etc.)         │
│  4. Fetch JIRA story info for each test case                     │
│  5. Generate story-wise summary                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Database Queries:                                                │
│  1. SELECT * FROM release_test_cases WHERE release_id = 1        │
│     JOIN test_cases, modules, sub_modules, features              │
│  2. SELECT * FROM jira_stories                                   │
│     WHERE story_id IN (test_cases.jira_story_id)                 │
│  3. Aggregate statistics:                                         │
│     - Total tests per module                                     │
│     - Execution status counts                                    │
│     - Pass percentages                                           │
│     - Story-wise test coverage                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Frontend to Backend Architecture

### 5.1 Application Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                     React Frontend (Port 3000)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  App.js (Main Router)                                       │    │
│  │  • Protected Routes                                         │    │
│  │  • Authentication Check                                     │    │
│  │  • Navigation Bar                                           │    │
│  └─────────────────────┬───────────────────────────────────────┘    │
│                        │                                             │
│       ┌────────────────┼────────────────┐                           │
│       │                │                │                           │
│  ┌────▼─────┐   ┌──────▼──────┐  ┌─────▼──────┐                   │
│  │  Pages   │   │ Components  │  │  Services  │                    │
│  ├──────────┤   ├─────────────┤  ├────────────┤                   │
│  │ Login    │   │ NavBar      │  │ api.js     │◄───────────┐      │
│  │ TestCases│   │ TestCaseForm│  │ auth.js    │            │      │
│  │ Modules  │   │ ReleaseDetail│ │            │            │      │
│  │ Stories  │   │ ModuleTree  │  └────────────┘            │      │
│  │ Releases │   │ ReportChart │                            │      │
│  │ Reports  │   │ FileUpload  │                            │      │
│  └──────────┘   └─────────────┘                            │      │
│                                                             │      │
│  ┌──────────────────────────────────────────────────────┐  │      │
│  │  Context API (State Management)                      │  │      │
│  │  • AuthContext: User session, token, login/logout    │  │      │
│  │  • ModuleContext: Module hierarchy cache             │  │      │
│  └──────────────────────────────────────────────────────┘  │      │
│                                                             │      │
└─────────────────────────────────────────────────────────────┼──────┘
                                                              │
                                    HTTP/REST (JSON)          │
                                    JWT Authentication        │
                                                              │
┌─────────────────────────────────────────────────────────────▼──────┐
│                    FastAPI Backend (Port 8000)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  main.py (FastAPI Application)                             │    │
│  │  • CORS Middleware                                         │    │
│  │  • Route Registration                                      │    │
│  │  • Exception Handlers                                      │    │
│  └─────────────────────┬───────────────────────────────────────┘    │
│                        │                                             │
│       ┌────────────────┼────────────────┬──────────────────┐        │
│       │                │                │                  │        │
│  ┌────▼─────┐   ┌──────▼──────┐  ┌─────▼──────┐   ┌──────▼──────┐ │
│  │   API    │   │   Schemas   │  │  Services  │   │    Core     │ │
│  │ Routers  │   │  (Pydantic) │  │            │   │             │ │
│  ├──────────┤   ├─────────────┤  ├────────────┤   ├─────────────┤ │
│  │ auth     │   │ UserSchema  │  │JiraService │   │ database.py │ │
│  │ test_cases│  │TestCaseSchm │  │EmailService│   │ security.py │ │
│  │ modules  │   │ ReleaseSchm │  │            │   │ config.py   │ │
│  │ stories  │   │ StorySchema │  └────────────┘   └─────────────┘ │
│  │ releases │   │ ...         │                                    │
│  │ reports  │   └─────────────┘                                    │
│  └──────┬───┘                                                       │
│         │                                                           │
│         ▼                                                           │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  SQLAlchemy ORM (models.py)                               │    │
│  │  • User, TestCase, Module, Release, JiraStory             │    │
│  │  • Relationships & Constraints                            │    │
│  └────────────────────────────┬──────────────────────────────┘    │
│                               │                                    │
└───────────────────────────────┼────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  SQLite Database      │
                    │  test_management.db   │
                    └───────────────────────┘
```

### 5.2 Request Flow Example: Create Test Case

```
1. Frontend (TestCases.js)
   └─► User fills form → handleSubmit()
       └─► Call: testCasesAPI.create(formData)

2. API Service (api.js)
   └─► axios.post('/api/test-cases', formData, {
         headers: { Authorization: `Bearer ${token}` }
       })

3. Backend Router (test_cases.py)
   └─► @router.post("/")
       └─► def create_test_case(data: TestCaseCreate, ...)
           ├─► Validate schema (Pydantic)
           ├─► Check authentication (JWT)
           ├─► Verify module exists
           └─► Create database record

4. Database Layer (SQLAlchemy)
   └─► test_case = TestCase(**data.dict())
       └─► db.add(test_case)
           └─► db.commit()
               └─► db.refresh(test_case)

5. Response Flow
   └─► Backend: return created test_case
       └─► Frontend: Update state & UI
           └─► Show success message
               └─► Refresh test cases list
```

### 5.3 Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│  1. User Login                                                │
├──────────────────────────────────────────────────────────────┤
│  Frontend → POST /api/auth/login                             │
│    Body: { email, password }                                 │
│                                                               │
│  Backend:                                                     │
│    • Verify credentials                                      │
│    • Generate JWT token                                      │
│    • Return { access_token, user_info }                      │
│                                                               │
│  Frontend:                                                    │
│    • Store token in localStorage                             │
│    • Update AuthContext                                      │
│    • Redirect to dashboard                                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  2. Authenticated Requests                                    │
├──────────────────────────────────────────────────────────────┤
│  Frontend:                                                    │
│    • Retrieve token from localStorage                        │
│    • Add to request headers:                                 │
│      Authorization: Bearer <token>                           │
│                                                               │
│  Backend Middleware:                                          │
│    • Extract token from header                               │
│    • Verify JWT signature                                    │
│    • Decode user info                                        │
│    • Attach user to request                                  │
│    • If invalid: return 401 Unauthorized                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  3. Token Expiration                                          │
├──────────────────────────────────────────────────────────────┤
│  Frontend Interceptor (api.js):                              │
│    • Detects 401 response                                    │
│    • Clear token & user state                                │
│    • Redirect to login page                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Technology Stack

### Frontend Stack
```
┌─────────────────────────────────────────────────────────────┐
│  Core Framework                                              │
├─────────────────────────────────────────────────────────────┤
│  • React 18.2.0         - Component-based UI                │
│  • React Router 6.x     - Client-side routing               │
│  • React Hooks          - State management                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  UI Framework                                                │
├─────────────────────────────────────────────────────────────┤
│  • Material-UI 5.14.20  - Component library                 │
│  • MUI Icons            - Icon set                          │
│  • MUI DataGrid         - Advanced tables                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  HTTP & State                                                │
├─────────────────────────────────────────────────────────────┤
│  • Axios                - HTTP client                       │
│  • Context API          - Global state                      │
└─────────────────────────────────────────────────────────────┘
```

### Backend Stack
```
┌─────────────────────────────────────────────────────────────┐
│  Core Framework                                              │
├─────────────────────────────────────────────────────────────┤
│  • Python 3.13          - Programming language              │
│  • FastAPI              - Web framework                     │
│  • Uvicorn              - ASGI server                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Database & ORM                                              │
├─────────────────────────────────────────────────────────────┤
│  • SQLite               - Database                          │
│  • SQLAlchemy           - ORM                               │
│  • Alembic              - Migrations                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Authentication & Security                                   │
├─────────────────────────────────────────────────────────────┤
│  • JWT (PyJWT)          - Token-based auth                  │
│  • Passlib              - Password hashing                  │
│  • python-multipart     - File uploads                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Integrations                                                │
├─────────────────────────────────────────────────────────────┤
│  • Requests             - JIRA API calls                    │
│  • ReportLab            - PDF generation                    │
│  • Pydantic             - Data validation                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Key Features

### 7.1 Test Case Management
- ✅ Create, Read, Update, Delete operations
- ✅ Hierarchical organization (Module → Sub-Module → Feature)
- ✅ Test type categorization (Manual/Automated)
- ✅ Tag-based classification (UI/API/Hybrid)
- ✅ Additional tags (smoke, regression, sanity)
- ✅ Bulk upload via CSV
- ✅ BDD Gherkin feature file support
- ✅ Export to CSV
- ✅ Advanced search & filtering

### 7.2 JIRA Integration
- ✅ Import stories from JIRA Cloud
- ✅ Link test cases to stories
- ✅ Auto-sync story metadata (status, priority, release)
- ✅ Epic-based story grouping
- ✅ Bi-directional linking (Story ↔ Test Cases)
- ✅ Auto-link test cases to releases via story release field
- ✅ Unlink test cases with release cleanup

### 7.3 Release Management
- ✅ Create and manage releases
- ✅ Scope test cases per release
- ✅ Execution status tracking (6 states)
- ✅ Story-based test case addition
- ✅ Manual test case addition
- ✅ Priority assignment (high/medium/low)
- ✅ Comments & bug tracking
- ✅ Multi-level approval workflow
- ✅ Release history (audit trail)
- ✅ Sync test cases from linked stories

### 7.4 Reporting & Analytics
- ✅ Release summary reports
- ✅ Module-wise breakdown
- ✅ Story-wise test coverage
- ✅ Sub-module and feature drill-down
- ✅ Execution status distribution
- ✅ Pass/fail percentages
- ✅ Failed test case analysis
- ✅ PDF export with visual formatting
- ✅ Real-time statistics

### 7.5 User Management
- ✅ Role-based access (Admin/Tester)
- ✅ Email verification
- ✅ JWT authentication
- ✅ User profile management

### 7.6 UI/UX Features
- ✅ Responsive design
- ✅ Resizable table columns
- ✅ Column filtering
- ✅ Accordion views for hierarchical data
- ✅ Clickable rows
- ✅ Real-time search
- ✅ Confirmation dialogs
- ✅ Toast notifications
- ✅ Loading states

---

## Appendix: Deployment Information

### Development Environment
- **Backend:** `http://localhost:8000`
- **Frontend:** `http://localhost:3000`
- **Database:** `backend/test_management.db`

### Startup Scripts
```bash
# Backend
./start_backend.sh

# Frontend
./start_frontend.sh
```

### Environment Variables
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_BASE_URL`

---

**Document Version:** 1.0  
**Last Updated:** November 5, 2025  
**Prepared By:** Development Team
