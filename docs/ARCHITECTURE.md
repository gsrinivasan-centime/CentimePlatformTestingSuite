# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                          [TO BE BUILT]                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Dashboard  │  │Test Cases  │  │ Executions │  │ Reports  │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│         │                │                │             │        │
│         └────────────────┴────────────────┴─────────────┘        │
│                              │                                    │
│                        Axios HTTP Client                          │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ REST API (JSON)
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                              ▼                                    │
│                      FastAPI Backend                              │
│                       [IMPLEMENTED]                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     API Routes                            │   │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │  Auth   │  │  Test   │  │Execution │  │ Reports  │  │   │
│  │  │         │  │  Cases  │  │          │  │          │  │   │
│  │  └─────────┘  └─────────┘  └──────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Business Logic                           │   │
│  │  • Authentication (JWT)                                   │   │
│  │  • Test Case Management                                   │   │
│  │  • Test Execution Engine                                  │   │
│  │  • Report Generation (PDF)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Data Access Layer                       │   │
│  │              SQLAlchemy ORM + Pydantic                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ SQL Queries
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                              ▼                                    │
│                        SQLite Database                            │
│                         [IMPLEMENTED]                             │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌─────────────┐        │
│  │  Users  │  │  Modules │  │ Tests  │  │  Executions │        │
│  └─────────┘  └──────────┘  └────────┘  └─────────────┘        │
│  ┌─────────┐  ┌──────────┐                                       │
│  │Releases │  │  JIRA    │                                       │
│  └─────────┘  └──────────┘                                       │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      Test Execution Layer                         │
│                         [IMPLEMENTED]                             │
│  ┌──────────────────────┐        ┌──────────────────────┐        │
│  │   UI Tests           │        │    API Tests         │        │
│  │   (Selenium)         │        │    (requests)        │        │
│  │                      │        │                      │        │
│  │  • test_login_ui.py  │        │  • test_api.py      │        │
│  │  • Chrome WebDriver  │        │  • REST Client      │        │
│  └──────────────────────┘        └──────────────────────┘        │
│            │                                  │                    │
│            └──────────────┬───────────────────┘                    │
│                           │                                        │
│                    pytest Framework                                │
│                   • Fixtures                                       │
│                   • Markers                                        │
│                   • HTML Reports                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (Planned)
```
React Application
├── Authentication Module
│   ├── Login Page
│   ├── Registration Page
│   └── Auth Context
├── Test Management Module
│   ├── Test Case List
│   ├── Create/Edit Test Case
│   └── Test Case Details
├── Execution Module
│   ├── Execute Tests
│   ├── Execution History
│   └── Real-time Status
├── Reporting Module
│   ├── Dashboard
│   ├── Report Viewer
│   └── PDF Export
└── Admin Module
    ├── User Management
    ├── Module Management
    └── Release Management
```

### Backend (Implemented)
```
FastAPI Application
├── API Layer
│   ├── /api/auth/*          - Authentication
│   ├── /api/users/*         - User management
│   ├── /api/modules/*       - Module management
│   ├── /api/test-cases/*    - Test case CRUD
│   ├── /api/releases/*      - Release management
│   ├── /api/executions/*    - Test execution
│   └── /api/reports/*       - Report generation
├── Business Logic
│   ├── Authentication       - JWT + bcrypt
│   ├── Authorization        - Role-based access
│   ├── Test Execution       - Background tasks
│   └── Report Generation    - ReportLab PDF
├── Data Layer
│   ├── SQLAlchemy Models    - ORM entities
│   └── Pydantic Schemas     - Validation
└── Database
    └── SQLite               - Relational storage
```

### Test Suite (Implemented)
```
pytest Test Suite
├── UI Tests
│   ├── conftest.py          - WebDriver fixtures
│   └── test_login_ui.py     - Sample UI test
├── API Tests
│   ├── conftest.py          - API fixtures
│   └── test_account_payable_api.py - Sample API test
├── Configuration
│   ├── pytest.ini           - pytest config
│   └── .env                 - Test settings
└── Reports
    └── reports/             - HTML reports
```

## Data Flow Diagrams

### Authentication Flow
```
┌────────┐    POST /api/auth/login     ┌──────────┐
│ Client │ ──────────────────────────> │  FastAPI │
└────────┘    email + password          └──────────┘
                                             │
                                             │ 1. Validate credentials
                                             │ 2. Generate JWT token
                                             │
┌────────┐    {"access_token": "..."}  ┌──────────┐
│ Client │ <────────────────────────── │  FastAPI │
└────────┘                              └──────────┘
    │
    │ Store token in localStorage
    │
    ▼
┌────────────────────────────────┐
│  All subsequent requests:      │
│  Authorization: Bearer <token> │
└────────────────────────────────┘
```

### Test Case Creation Flow
```
┌────────┐    POST /api/test-cases   ┌──────────┐
│ Client │ ───────────────────────>  │  FastAPI │
└────────┘    + Auth Token            └──────────┘
             + Test Case Data              │
                                           │ 1. Validate token
                                           │ 2. Validate data
                                           │ 3. Check uniqueness
                                           │
                                      ┌──────────┐
                                      │ Database │
                                      └──────────┘
                                           │
                                           │ Save test case
                                           │
┌────────┐    Created Test Case      ┌──────────┐
│ Client │ <─────────────────────── │  FastAPI │
└────────┘    (201 Created)          └──────────┘
```

### Test Execution Flow
```
┌────────┐  POST /api/executions/execute/{id}  ┌──────────┐
│ Client │ ─────────────────────────────────>  │  FastAPI │
└────────┘                                      └──────────┘
                                                     │
                                                     │ 1. Create execution record
                                                     │ 2. Start background task
                                                     │
                                                ┌──────────┐
                                                │ Database │
                                                └──────────┘
                                                     │
                                                     │ Status: PENDING
                                                     │
┌────────┐  {"execution_id": 123,           ┌──────────┐
│ Client │  "status": "pending"}            │  FastAPI │
└────────┘ <──────────────────────────────  └──────────┘
    │                                             │
    │                                             │ Background Task
    │                                             ▼
    │                                        ┌──────────┐
    │                                        │  pytest  │
    │                                        └──────────┘
    │                                             │
    │                                             │ Run test
    │                                             │
    │                                        ┌──────────┐
    │                                        │ Database │
    │                                        └──────────┘
    │                                             │
    │                                             │ Update: PASS/FAIL
    │                                             │
    │  GET /api/executions/123                   │
    ├────────────────────────────────────────────┤
    │                                             │
    │  {"status": "pass", "actual_result": ...}  │
    │<────────────────────────────────────────────┤
```

### Report Generation Flow
```
┌────────┐  GET /api/reports/pdf/{release_id}  ┌──────────┐
│ Client │ ────────────────────────────────>   │  FastAPI │
└────────┘                                      └──────────┘
                                                     │
                                                     │ 1. Query executions
                                                     │
                                                ┌──────────┐
                                                │ Database │
                                                └──────────┘
                                                     │
                                                     │ Get data
                                                     │
                                                ┌──────────┐
                                                │ReportLab │
                                                └──────────┘
                                                     │
                                                     │ Generate PDF
                                                     │
┌────────┐  PDF file download               ┌──────────┐
│ Client │ <─────────────────────────────── │  FastAPI │
└────────┘                                   └──────────┘
```

## Database Schema

```
┌──────────────┐
│    users     │
├──────────────┤
│ id (PK)      │
│ email        │◄───────────┐
│ password     │            │
│ full_name    │            │ created_by
│ role         │            │
│ is_active    │            │
└──────────────┘            │
       │                    │
       │ executor_id        │
       │                    │
       ▼                    │
┌──────────────┐       ┌────────────┐
│ executions   │       │ test_cases │
├──────────────┤       ├────────────┤
│ id (PK)      │       │ id (PK)    │
│ test_case_id │──────>│ test_id    │
│ release_id   │       │ title      │
│ executor_id  │       │ module_id  │──┐
│ status       │       │ test_type  │  │
│ actual_result│       │ steps      │  │
│ executed_at  │       │ expected   │  │
└──────────────┘       └────────────┘  │
       │                                │
       │                                │
       ▼                                │
┌──────────────┐                        │
│jira_defects  │                        │
├──────────────┤                        │
│ id (PK)      │                        │
│ execution_id │                        │
│ jira_id      │                        │
│ summary      │                        │
│ status       │                        │
└──────────────┘                        │
                                        │
┌──────────────┐                        │
│   releases   │                        │
├──────────────┤                        │
│ id (PK)      │                        │
│ version      │                        │
│ name         │                        │
│ release_date │                        │
└──────────────┘                        │
                                        │
┌──────────────┐                        │
│   modules    │◄───────────────────────┘
├──────────────┤
│ id (PK)      │
│ name         │
│ description  │
└──────────────┘
```

## Technology Stack

### Backend
- **Framework**: FastAPI 0.104+
- **Database**: SQLite 3
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic 2.5
- **Authentication**: python-jose (JWT)
- **Password**: passlib + bcrypt
- **PDF**: ReportLab 4.0

### Testing
- **Framework**: pytest 7.4
- **UI**: Selenium 4.15
- **API**: requests 2.31
- **Reports**: pytest-html 4.1

### Frontend (Planned)
- **Framework**: React 18
- **UI**: Material UI 5
- **HTTP**: Axios
- **Routing**: React Router 6
- **State**: Context API

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. Network Layer                                        │
│     • HTTPS (in production)                              │
│     • CORS configuration                                 │
│                                                           │
│  2. Authentication Layer                                 │
│     • JWT tokens                                         │
│     • Token expiration (30 min)                          │
│     • Secure token storage                               │
│                                                           │
│  3. Authorization Layer                                  │
│     • Role-based access control                          │
│     • Protected routes                                   │
│     • Permission checks                                  │
│                                                           │
│  4. Data Layer                                           │
│     • Password hashing (bcrypt)                          │
│     • Input validation (Pydantic)                        │
│     • SQL injection prevention (SQLAlchemy)              │
│                                                           │
│  5. Application Layer                                    │
│     • Email domain restriction                           │
│     • Input sanitization                                 │
│     • Error handling                                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Future)

```
┌────────────────────────────────────────────────────────┐
│                    Production Setup                     │
├────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐    │
│  │  Users   │ ───> │   CDN    │ ───> │  React   │    │
│  └──────────┘      │ (Static) │      │   App    │    │
│                     └──────────┘      └──────────┘    │
│                                              │          │
│                                              │          │
│                                              ▼          │
│                                       ┌──────────┐     │
│                                       │  Nginx   │     │
│                                       │ (Proxy)  │     │
│                                       └──────────┘     │
│                                              │          │
│                                              │          │
│                                              ▼          │
│                                       ┌──────────┐     │
│                                       │ FastAPI  │     │
│                                       │ (Gunicorn│     │
│                                       └──────────┘     │
│                                              │          │
│                                              │          │
│                                              ▼          │
│                                       ┌──────────┐     │
│                                       │PostgreSQL│     │
│                                       │  (RDS)   │     │
│                                       └──────────┘     │
│                                                          │
└────────────────────────────────────────────────────────┘
```

---

This architecture provides a solid foundation for a scalable, maintainable, and secure test management system!
