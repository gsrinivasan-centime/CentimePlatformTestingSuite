# Centime QA Portal - Architecture & Features Documentation

**Comprehensive Technical Documentation**  
**Last Updated:** December 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Key Features](#5-key-features)
6. [AI-Powered Features](#6-ai-powered-features)
7. [API Architecture](#7-api-architecture)
8. [External Integrations](#8-external-integrations)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Security](#10-security)

---

## 1. Overview

The **Centime QA Portal** is a comprehensive Test Management System designed for QA teams to manage test cases, track releases, integrate with JIRA, and leverage AI for intelligent test case management.

### Core Capabilities

- **Test Case Management** - Full CRUD operations with hierarchical organization
- **Release Management** - Track releases, execution progress, and approvals
- **BDD/Gherkin Support** - Test Design Studio with Monaco editor
- **AI-Powered Search** - Semantic similarity search and duplicate detection
- **JIRA Integration** - Story import, bug tracking, and sync
- **Confluence Integration** - Feature file storage and publishing

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                    Web Browser (Chrome, Firefox, Safari)             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                       FRONTEND LAYER                                 │
│              React 18 + Material-UI (Port: 3000)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Dashboard  │ │ Test Cases  │ │Test Studio  │ │  Releases   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │JIRA Stories │ │   Issues    │ │  Reports    │ │  Settings   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API (JSON)
                                 │ JWT Authentication
┌────────────────────────────────▼────────────────────────────────────┐
│                       BACKEND LAYER                                  │
│              FastAPI + Python 3.13 (Port: 8000)                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     API ENDPOINTS                            │   │
│  │  /api/auth  /api/test-cases  /api/modules  /api/releases    │   │
│  │  /api/issues  /api/step-catalog  /api/search  /api/settings │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   SERVICES LAYER                             │   │
│  │  • Gherkin Parser       • PDF Generator                      │   │
│  │  • JIRA Integration     • Confluence Storage                 │   │
│  │  • Embedding Service    • Smart Search                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     AI/ML LAYER                              │   │
│  │  • Sentence Transformers (all-MiniLM-L6-v2)                 │   │
│  │  • Vector Embeddings (384 dimensions)                        │   │
│  │  • Cosine Similarity Search                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ SQLAlchemy ORM
┌────────────────────────────────▼────────────────────────────────────┐
│                       DATABASE LAYER                                 │
│                     PostgreSQL + pgvector                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │    users    │ │ test_cases  │ │  releases   │ │   issues    │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   modules   │ │step_catalog │ │feature_files│ │jira_stories │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   JIRA Cloud    │  │   Confluence    │  │  pgvector Ext   │     │
│  │  (REST API v3)  │  │  (Storage API)  │  │ (Vector Search) │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| Material-UI | 5.14.20 | Component Library |
| Monaco Editor | 0.44.0 | Code Editor (Gherkin) |
| Recharts | 2.9.0 | Data Visualization |
| Axios | 1.6.0 | HTTP Client |
| React Router | 6.x | Navigation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.13 | Runtime |
| FastAPI | 0.104.1 | Web Framework |
| SQLAlchemy | 2.0.23 | ORM |
| Alembic | 1.12.1 | Database Migrations |
| Pydantic | 2.5.2 | Data Validation |
| python-jose | 3.3.0 | JWT Tokens |
| sentence-transformers | 2.2.2 | AI Embeddings |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 12+ | Primary Database |
| pgvector | 0.5.0 | Vector Similarity Search |
| Supabase | - | Dev Database (Cloud) |
| AWS RDS | - | Production Database |

---

## 4. Database Schema

### Core Entities

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIPS                          │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │    users     │
                    ├──────────────┤
                    │ id (PK)      │
                    │ email        │
                    │ role         │──────┬──────────────────────┐
                    │ is_super_admin│     │                      │
                    └──────┬───────┘     │                      │
                           │             │                      │
        ┌──────────────────┼─────────────┼──────────────────────┤
        │                  │             │                      │
        ▼                  ▼             ▼                      ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   modules    │  │ test_cases   │  │   releases   │  │feature_files │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ id (PK)      │  │ id (PK)      │  │ id (PK)      │  │ id (PK)      │
│ name         │  │ test_id (UK) │  │ version (UK) │  │ name         │
│ description  │  │ title        │  │ name         │  │ content      │
└──────┬───────┘  │ module_id(FK)│  │ release_date │  │ status       │
       │          │ embedding    │  │ qa_lead_id   │  │ published_at │
       │          │ embedding_model│ └──────┬───────┘  │ approved_by  │
       │          └──────┬───────┘         │          └──────────────┘
       │                 │                 │
       ▼                 │                 ▼
┌──────────────┐         │          ┌──────────────┐
│ sub_modules  │         │          │   issues     │
├──────────────┤         │          ├──────────────┤
│ id (PK)      │         │          │ id (PK)      │
│ name         │         │          │ title        │
│ module_id(FK)│         │          │ release_id   │
└──────┬───────┘         │          │ embedding    │
       │                 │          │ embedding_model│
       ▼                 │          └──────────────┘
┌──────────────┐         │
│   features   │         │
├──────────────┤         │
│ id (PK)      │◄────────┘
│ sub_module_id│
└──────────────┘
```

### Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | email, role, is_super_admin |
| `test_cases` | Test case repository | test_id, title, embedding, module_id |
| `modules` | Top-level categories | name, description |
| `sub_modules` | Second-level categories | name, module_id |
| `features` | Feature groupings | name, sub_module_id |
| `releases` | Release tracking | version, release_date, overall_status |
| `release_test_cases` | Test-Release mapping | execution_status, executed_by |
| `issues` | Bug tracking | title, severity, embedding, release_id |
| `feature_files` | BDD feature files | content, status, published_at |
| `step_catalog` | Reusable BDD steps | step_type, step_text, usage_count |
| `jira_stories` | JIRA integration | story_id, epic_id, status |
| `application_settings` | System configuration | key, value |

### AI/Embedding Columns

The following tables have AI-powered embedding columns:
- `test_cases.embedding` - 384-dimension float array
- `test_cases.embedding_model` - Model used (e.g., "all-MiniLM-L6-v2")
- `issues.embedding` - 384-dimension float array
- `issues.embedding_model` - Model used

---

## 5. Key Features

### 5.1 Test Case Management

- **Hierarchical Organization**: Modules → Sub-Modules → Features → Test Cases
- **Test Types**: Manual, Automated
- **Tags**: UI, API, Hybrid
- **Automation Status**: Working, Broken
- **JIRA Linking**: Associate test cases with stories/epics
- **Bulk Operations**: Import/export via CSV

### 5.2 Test Design Studio

- **Monaco Editor**: Full IDE experience for writing Gherkin
- **Syntax Highlighting**: Color-coded Given/When/Then keywords
- **Step Catalog**: Library of reusable BDD steps
- **Autocomplete**: Smart suggestions from step catalog
- **Feature File Management**: Save, load, export .feature files
- **Approval Workflow**: Draft → Pending Approval → Approved → Published

### 5.3 Release Management

- **Release Dashboard**: Execution progress, pass/fail rates
- **Test Assignment**: Map test cases to releases
- **Execution Tracking**: Track who ran what and when
- **Issue Tracking**: Link bugs to releases
- **Approval Workflow**: Multi-role approval process

### 5.4 JIRA Integration

- **Story Import**: Pull stories from JIRA
- **Epic Management**: Organize by epics
- **Bug Creation**: Create JIRA issues from portal
- **Assignee Search**: Search JIRA users
- **Status Sync**: Keep statuses in sync

### 5.5 Reports & Analytics

- **Test Coverage**: Module-wise coverage charts
- **Execution Reports**: Pass/fail/blocked statistics
- **Trend Analysis**: Historical execution data
- **Export Options**: PDF, Excel reports

---

## 6. AI-Powered Features

### 6.1 Semantic Search

The portal uses **Sentence Transformers** to convert text into vector embeddings, enabling intelligent search capabilities:

```
User Query: "Login test"
    │
    ▼
┌─────────────────────┐
│ Embedding Model     │
│ (all-MiniLM-L6-v2)  │
└──────────┬──────────┘
           │
           ▼
    [0.12, -0.45, 0.78, ...] (384 dimensions)
           │
           ▼
┌─────────────────────┐
│ Cosine Similarity   │
│ Search in Database  │
└──────────┬──────────┘
           │
           ▼
    Ranked Results by Similarity
```

### 6.2 Duplicate Detection

Before creating new test cases, the system checks for duplicates:

1. Generate embedding for new test case
2. Compare against existing embeddings
3. Flag potential duplicates above threshold (default: 75%)
4. Show similarity scores to user

### 6.3 Smart Suggestions

- **Step Autocomplete**: Suggests relevant steps based on context
- **Related Test Cases**: Shows similar test cases
- **Module Recommendations**: Suggests appropriate modules based on content

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `similarity_threshold` | 75 | Percentage threshold for duplicate detection |
| `embedding_model` | all-MiniLM-L6-v2 | Model for generating embeddings |

---

## 7. API Architecture

### Authentication

All API endpoints (except `/api/auth/login`) require JWT authentication:

```
POST /api/auth/login
    Request: { email, password }
    Response: { access_token, refresh_token, token_type }

GET /api/auth/me
    Header: Authorization: Bearer <token>
    Response: { id, email, full_name, role }
```

### Core Endpoints

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `/api/auth/*` | Login, refresh, user info |
| **Test Cases** | `/api/test-cases/*` | CRUD, bulk operations |
| **Modules** | `/api/modules/*` | Module hierarchy |
| **Releases** | `/api/releases/*` | Release management |
| **Issues** | `/api/issues/*` | Bug tracking |
| **Step Catalog** | `/api/step-catalog/*` | BDD step library |
| **Search** | `/api/search/*` | Smart search |
| **Settings** | `/api/settings/*` | Application config |

### API Documentation

When the backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 8. External Integrations

### 8.1 JIRA Cloud

**Configuration** (in `.env`):
```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=YOUR_PROJECT
```

**Features**:
- Import stories and epics
- Create defects from portal
- Search JIRA users
- Sync status updates

### 8.2 Confluence

**Configuration** (in `.env`):
```env
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-api-token
CONFLUENCE_SPACE_KEY=YOUR_SPACE
CONFLUENCE_PARENT_PAGE_ID=123456789
```

**Features**:
- Store feature files as Confluence pages
- Publish approved feature files
- Version control through Confluence

---

## 9. Deployment Architecture

### Development Environment

```
Local Machine
├── Frontend: http://localhost:3000 (npm start)
├── Backend: http://localhost:8000 (uvicorn)
└── Database: Supabase PostgreSQL (Cloud)
```

### Production Environment (AWS)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud                                 │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   EC2        │         │   RDS        │                      │
│  │  Instance    │────────▶│  PostgreSQL  │                      │
│  │              │         │              │                      │
│  │ • Nginx      │         │ • centime-   │                      │
│  │ • Uvicorn    │         │   test-db    │                      │
│  │ • React Build│         │              │                      │
│  └──────┬───────┘         └──────────────┘                      │
│         │                                                        │
│         │ HTTPS                                                  │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │   Route 53   │  qa-portal.ddns.net                          │
│  │   + SSL      │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Commands

```bash
# Development
./deploy_app.sh dev                  # Deploy locally

# Production  
./deploy_app.sh prod                 # Deploy to EC2 (pulls from git)
./deploy_app.sh prod --branch main   # Specify branch
./deploy_app.sh prod --backend-only  # Backend only
./deploy_app.sh prod --migrate       # Run migrations
```

---

## 10. Security

### Authentication

- **JWT Tokens**: Access tokens (30 min) + Refresh tokens (7 days)
- **Password Hashing**: bcrypt with salt
- **Role-Based Access**: ADMIN, TESTER, DEVELOPER roles
- **Super Admin**: Special privileges for system administration

### API Security

- **CORS**: Configured for allowed origins
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Pydantic models
- **SQL Injection Prevention**: SQLAlchemy ORM

### Data Protection

- **Environment Variables**: Secrets stored in `.env` (not in git)
- **SSL/TLS**: HTTPS in production
- **Database Credentials**: Secure connection strings

---

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access, user management, settings |
| **TESTER** | Test cases, executions, issues |
| **DEVELOPER** | Read access, bug viewing |
| **Super Admin** | System-wide administration |

---

## Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@centime.com | Admin123! |
| Tester | tester@centime.com | Tester123! |

---

## Quick Reference

### File Structure

```
CentimePlatformTestingSuite/
├── backend/                    # FastAPI backend
│   ├── alembic/               # Database migrations
│   │   └── versions/          # Migration files
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   ├── core/              # Config, security
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   ├── .env                   # Environment config
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API clients
│   │   └── context/           # React context
│   └── package.json           # Node dependencies
├── docs/                       # Documentation
├── deploy_app.sh              # Deployment script
├── start_backend.sh           # Backend startup
└── start_frontend.sh          # Frontend startup
```

### Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key
JIRA_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

---

*For additional API documentation, visit http://localhost:8000/docs when the backend is running.*
