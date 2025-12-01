### Current Architecture

┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Monolith                          │
│                    (Single Process)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Auth API  │ │ Test Cases  │ │  Releases   │            │
│  │   /auth/*   │ │    API      │ │    API      │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Issues    │ │   Smart     │ │   Step      │            │
│  │    API      │ │  Search API │ │ Catalog API │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  Modules    │ │   Users     │ │  Settings   │            │
│  │    API      │ │    API      │ │    API      │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                    Shared Services                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
│  │ EmbeddingService│ │SmartSearchService│ │ BackgroundTasks│ │
│  └─────────────────┘ └─────────────────┘ └────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Single Database                           │
│              PostgreSQL (AWS RDS + pgvector)                 │
└─────────────────────────────────────────────────────────────┘

# QA Portal - Complete Database Schema & Architecture

## System Architecture Overview
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND (React + MUI)                                       │
│                                    Port: 3000 (dev) / 80 (prod)                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Dashboard│ │  Test   │ │Releases │ │ Issues  │ │ Design  │ │Settings │ │ Reports │          │
│  │         │ │  Cases  │ │         │ │         │ │ Studio  │ │         │ │         │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                             │ HTTPS
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    NGINX (Reverse Proxy)                                        │
│                                    Port: 443 (HTTPS) → 8000                                    │
└────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FastAPI Backend (Uvicorn - 2 Workers)                              │
│                              Port: 8000                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    API LAYER (15 Routers)                                 │  │
│  ├──────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                           │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│  │  │    Auth     │ │ Test Cases  │ │  Releases   │ │   Issues    │ │   Modules   │        │  │
│  │  │  /api/auth  │ │/api/test-   │ │/api/releases│ │ /api/issues │ │ /api/modules│        │  │
│  │  │             │ │   cases     │ │             │ │             │ │             │        │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│  │  │Sub-Modules  │ │  Features   │ │   Users     │ │ Executions  │ │   Reports   │        │  │
│  │  │/api/sub-    │ │/api/features│ │ /api/users  │ │/api/        │ │ /api/reports│        │  │
│  │  │  modules    │ │             │ │             │ │ executions  │ │             │        │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│  │  │JIRA Stories │ │Step Catalog │ │Smart Search │ │  Settings   │ │Release Mgmt │        │  │
│  │  │/api/jira-   │ │/api/step-   │ │/api/search  │ │/api/settings│ │/api/release-│        │  │
│  │  │  stories    │ │  catalog    │ │             │ │             │ │ management  │        │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │  │
│  │                                                                                           │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    SERVICE LAYER                                          │  │
│  ├──────────────────────────────────────────────────────────────────────────────────────────┤  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐                 │  │
│  │  │  EmbeddingService   │ │ SmartSearchService  │ │   AISearchService   │                 │  │
│  │  │  - SentenceTransf.  │ │  - Query Parsing    │ │  - Vertex AI Gemini │                 │  │
│  │  │  - all-MiniLM-L6-v2 │ │  - Intent Detection │ │  - LLM Integration  │                 │  │
│  │  │  - 384 dim vectors  │ │  - L1/L2 Caching    │ │  - Query Analysis   │                 │  │
│  │  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘                 │  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐                 │  │
│  │  │  ConfluenceService  │ │    JiraService      │ │   EmailService      │                 │  │
│  │  │  - File Storage     │ │  - Issue Sync       │ │  - SMTP Integration │                 │  │
│  │  │  - Attachments      │ │  - Story Import     │ │  - Notifications    │                 │  │
│  │  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘                 │  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐                                         │  │
│  │  │  DriveService       │ │ NavigationRegistry  │                                         │  │
│  │  │  - Google Drive     │ │  - Page Registry    │                                         │  │
│  │  │  - File Storage     │ │  - Smart Routing    │                                         │  │
│  │  └─────────────────────┘ └─────────────────────┘                                         │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                 │
└────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL 15 (AWS RDS) + pgvector Extension                           │
│                         Host: centime-test-db.crcyycecwv41.us-east-2.rds.amazonaws.com         │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘


## Complete Entity Relationship Diagram

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     DATABASE SCHEMA - ER DIAGRAM                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│  ┌─────────────────┐                                                                                            │
│  │     users       │                                                                                            │
│  ├─────────────────┤         ┌─────────────────┐                                                               │
│  │ PK id           │         │    modules      │                                                               │
│  │    email (UQ)   │         ├─────────────────┤        ┌─────────────────┐                                    │
│  │    hashed_pass  │         │ PK id           │        │   sub_modules   │                                    │
│  │    full_name    │         │    name (UQ)    │        ├─────────────────┤        ┌─────────────────┐         │
│  │    role (ENUM)  │         │    description  │───┬───▶│ PK id           │        │    features     │         │
│  │    is_active    │         │    created_at   │   │    │ FK module_id    │───────▶├─────────────────┤         │
│  │    is_super_adm │         └─────────────────┘   │    │    name         │        │ PK id           │         │
│  │    created_at   │                │              │    │    description  │        │ FK sub_module_id│         │
│  └────────┬────────┘                │              │    └─────────────────┘        │    name         │         │
│           │                         │              │                               │    description  │         │
│           │ 1:N                     │ 1:N          │                               └─────────────────┘         │
│           │                         ▼              │                                                            │
│           │         ┌───────────────────────────────────────────────────────────────────────────┐              │
│           │         │                          test_cases                                        │              │
│           │         ├───────────────────────────────────────────────────────────────────────────┤              │
│           │         │ PK id                        │ FK module_id                                │              │
│           │         │    test_id (UQ) [UI-0001]    │    sub_module (String)                     │              │
│           │         │    title                     │    feature_section (String)                │              │
│           │         │    description               │    tag (ENUM: ui/api/hybrid)               │              │
│           │         │    test_type (ENUM)          │    tags (String: smoke,regression)         │              │
│           │         │    automation_status         │    jira_story_id                           │              │
│           │         │    steps_to_reproduce        │    jira_epic_id                            │              │
│           │         │    expected_result           │    scenario_examples (JSON)                │              │
│           │         │    preconditions             │    embedding (Vector 384) ◄── pgvector     │              │
│           │         │    test_data                 │    embedding_model                         │              │
│           │         │ FK created_by                │    created_at, updated_at                  │              │
│           │         └───────────────────────────────────────────────────────────────────────────┘              │
│           │                         │                                                                           │
│           │                         │ 1:N                                                                       │
│           ▼                         ▼                                                                           │
│  ┌─────────────────┐   ┌─────────────────────────┐   ┌─────────────────┐                                       │
│  │ test_executions │   │   release_test_cases    │   │    releases     │                                       │
│  ├─────────────────┤   ├─────────────────────────┤   ├─────────────────┤                                       │
│  │ PK id           │   │ PK id                   │   │ PK id           │                                       │
│  │ FK test_case_id │   │ FK release_id           │◀──│    version (UQ) │                                       │
│  │ FK release_id   │──▶│ FK test_case_id         │   │    name         │                                       │
│  │ FK executor_id  │   │ FK module_id            │   │    description  │                                       │
│  │    status       │   │ FK sub_module_id        │   │    release_date │                                       │
│  │    actual_result│   │ FK feature_id           │   │    environment  │                                       │
│  │    executed_at  │   │    execution_status     │   │    overall_stat │                                       │
│  └────────┬────────┘   │    executed_by_id       │   │ FK qa_lead_id   │                                       │
│           │            │    comments, bug_ids    │   └────────┬────────┘                                       │
│           │ 1:N        └─────────────────────────┘            │                                                │
│           ▼                                                   │ 1:N                                            │
│  ┌─────────────────┐                              ┌───────────┴────────────┐                                   │
│  │  jira_defects   │                              │                        │                                   │
│  ├─────────────────┤                              ▼                        ▼                                   │
│  │ PK id           │                   ┌─────────────────┐      ┌─────────────────┐                            │
│  │ FK test_exec_id │                   │release_approvals│      │ release_history │                            │
│  │    jira_id      │                   ├─────────────────┤      ├─────────────────┤                            │
│  │    summary      │                   │ PK id           │      │ PK id           │                            │
│  │    status       │                   │ FK release_id   │      │ FK release_id   │                            │
│  │    priority     │                   │ FK approver_id  │      │ FK user_id      │                            │
│  └─────────────────┘                   │    role (ENUM)  │      │    action       │                            │
│                                        │    status (ENUM)│      │    details      │                            │
│                                        └─────────────────┘      └─────────────────┘                            │
│                                                                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐                   │
│  │   jira_stories  │     │ test_case_stories│     │  feature_files  │     │  step_catalog   │                   │
│  ├─────────────────┤     ├─────────────────┤     ├─────────────────┤     ├─────────────────┤                   │
│  │ PK id           │     │ PK id           │     │ PK id           │     │ PK id           │                   │
│  │    story_id(UQ) │◀────│ FK story_id     │     │    name         │     │    step_type    │                   │
│  │    epic_id      │     │ FK test_case_id │     │    content      │     │    step_text    │                   │
│  │    title        │     │ FK linked_by    │     │    description  │     │    step_pattern │                   │
│  │    description  │     │    linked_at    │     │    status       │     │    parameters   │                   │
│  │    status       │     └─────────────────┘     │ FK module_id    │     │    usage_count  │                   │
│  │    priority     │                             │ FK created_by   │     │ FK module_id    │                   │
│  │    assignee     │                             │ FK approved_by  │     │ FK created_by   │                   │
│  │    sprint       │                             │    approved_at  │     └─────────────────┘                   │
│  │    release      │                             └─────────────────┘                                           │
│  └─────────────────┘                                                                                            │
│                                                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                           ISSUES                                                         │   │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤   │
│  │ PK id              │ FK module_id          │    video_url            │ embedding (Vector 384) ◄pgvector │   │
│  │    title           │ FK release_id         │    screenshot_urls      │ embedding_model                  │   │
│  │    description     │ FK test_case_id       │    jira_assignee_id     │                                  │   │
│  │    status          │ FK created_by         │    jira_assignee_name   │                                  │   │
│  │    priority        │ FK assigned_to        │    reporter_name        │                                  │   │
│  │    severity        │    created_at         │    jira_story_id        │                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                    SYSTEM / AI TABLES                                                      │ │
│  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                                                            │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐       │ │
│  │  │application_settings │  │  smart_search_logs  │  │  llm_response_cache │  │navigation_registry  │       │ │
│  │  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤       │ │
│  │  │ PK key             │  │ PK id               │  │ PK id               │  │ PK page_key         │       │ │
│  │  │    value           │  │ FK user_id          │  │    cache_key (UQ)   │  │    display_name     │       │ │
│  │  │    description     │  │    query            │  │    query            │  │    path             │       │ │
│  │  │    updated_at      │  │    intent           │  │    response_json    │  │    entity_type      │       │ │
│  │  └─────────────────────┘  │    target_page      │  │    input_tokens     │  │    filters (JSONB)  │       │ │
│  │                           │    filters (JSONB)  │  │    output_tokens    │  │    capabilities     │       │ │
│  │  Settings:                │    input_tokens     │  │    hit_count        │  │    example_queries  │       │ │
│  │  - similarity_threshold   │    output_tokens    │  │    expires_at       │  │    is_active        │       │ │
│  │  - embedding_model        │    cached           │  └─────────────────────┘  └─────────────────────┘       │ │
│  │  - hybrid_search_enabled  │    response_time_ms │                                                          │ │
│  │  - semantic_weight        └─────────────────────┘                                                          │ │
│  │                                                                                                            │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘



### 7.1 Service Layer Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          API LAYER (FastAPI)                             │
│  /api/auth      /api/test-cases     /api/search/smart    /api/releases  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER                                    │
├──────────────────────┬────────────────────────┬─────────────────────────┤
│ SmartSearchService   │ EmbeddingService       │ NavigationRegistryService│
│ ├─ classify_query()  │ ├─ generate_embedding()│ ├─ get_navigation_targets│
│ ├─ hybrid_search()   │ ├─ similarity_search() │ ├─ get_modules()         │
│ ├─ get_from_cache()  │ └─ batch_compute()     │ └─ get_current_release() │
│ └─ log_search()      │                        │                          │
└──────────────────────┴────────────────────────┴─────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER (SQLAlchemy)                      │
│                         ORM Models + Raw SQL for pgvector                │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL + pgvector (AWS RDS)                      │
└─────────────────────────────────────────────────────────────────────────┘
```


### 7.2 Embedding Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TEST CASE CREATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

1. User creates test case via UI or API
                │
                ▼
2. POST /api/test-cases
   {
     "title": "Verify ACH payment SEC code assignment",
     "description": "Test that corporate payments use CCD code...",
     "tag": "api",
     "module_id": 1
   }
                │
                ▼
3. Backend saves test case (embedding = NULL initially)
                │
                ▼
4. Background task triggered: compute_test_case_embedding(test_case_id)
                │
                ▼
5. EmbeddingService.generate_embedding():
   - Input: title + description concatenated
   - Model: all-MiniLM-L6-v2 (384 dimensions)
   - Output: [0.023, -0.156, 0.089, ..., 0.012]  # 384 floats
                │
                ▼
6. Update test_cases SET embedding = vector, embedding_model = 'all-MiniLM-L6-v2'
                │
                ▼
7. Test case now searchable via semantic similarity!
```



