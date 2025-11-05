# Database Schema Diagram

This file contains Mermaid diagrams that can be rendered in GitHub, VS Code (with Mermaid extension), or online tools like mermaid.live

---

## Complete Entity Relationship Diagram

```mermaid
erDiagram
    Users ||--o{ TestCases : creates
    Users ||--o{ TestExecutions : executes
    Users ||--o{ ReleaseApprovals : approves
    Users ||--o{ ReleaseHistory : records
    Users ||--o{ JiraStories : creates
    Users ||--o{ Releases : "qa_lead"
    Users ||--o{ ReleaseTestCases : executes
    
    Modules ||--o{ TestCases : contains
    Modules ||--o{ SubModules : contains
    Modules ||--o{ ReleaseTestCases : organizes
    
    SubModules ||--o{ Features : contains
    SubModules ||--o{ ReleaseTestCases : organizes
    
    Features ||--o{ ReleaseTestCases : organizes
    
    TestCases ||--o{ TestExecutions : "executed_in"
    TestCases ||--o{ ReleaseTestCases : "included_in"
    TestCases }o--|| JiraStories : "linked_to"
    
    Releases ||--o{ TestExecutions : tracks
    Releases ||--o{ ReleaseTestCases : contains
    Releases ||--o{ ReleaseApprovals : requires
    Releases ||--o{ ReleaseHistory : records
    
    TestExecutions ||--o{ JiraDefects : reports
    
    Users {
        int id PK
        string email UK
        string hashed_password
        string full_name
        enum role
        boolean is_active
        boolean is_email_verified
        datetime email_verified_at
        datetime created_at
    }
    
    Modules {
        int id PK
        string name UK
        text description
        datetime created_at
    }
    
    SubModules {
        int id PK
        string name
        text description
        int module_id FK
        datetime created_at
    }
    
    Features {
        int id PK
        string name
        text description
        int sub_module_id FK
        datetime created_at
    }
    
    TestCases {
        int id PK
        string test_id UK
        string title
        text description
        enum test_type
        int module_id FK
        string sub_module
        string feature_section
        enum tag
        string tags
        enum automation_status
        string jira_story_id FK
        string jira_epic_id
        text jira_labels
        text scenario_examples
        text steps_to_reproduce
        text expected_result
        text preconditions
        text test_data
        string automated_script_path
        int created_by FK
        datetime created_at
        datetime updated_at
    }
    
    Releases {
        int id PK
        string version UK
        string name
        text description
        datetime release_date
        string environment
        string overall_status
        int qa_lead_id FK
        datetime created_at
    }
    
    TestExecutions {
        int id PK
        int test_case_id FK
        int release_id FK
        int executor_id FK
        enum status
        text actual_result
        int execution_time
        text error_message
        string screenshot_path
        datetime executed_at
    }
    
    JiraDefects {
        int id PK
        int test_execution_id FK
        string jira_id
        string summary
        string status
        string priority
        datetime created_at
    }
    
    ReleaseTestCases {
        int id PK
        int release_id FK
        int test_case_id FK
        int module_id FK
        int sub_module_id FK
        int feature_id FK
        string priority
        enum execution_status
        int executed_by_id FK
        datetime execution_date
        int execution_duration
        text comments
        string bug_ids
        text screenshots
        int display_order
        datetime created_at
        datetime updated_at
    }
    
    ReleaseApprovals {
        int id PK
        int release_id FK
        int approver_id FK
        enum role
        enum approval_status
        text comments
        datetime approved_at
        datetime created_at
    }
    
    ReleaseHistory {
        int id PK
        int release_id FK
        int user_id FK
        string action
        text details
        datetime created_at
    }
    
    JiraStories {
        int id PK
        string story_id UK
        string epic_id
        string title
        text description
        string status
        string priority
        string assignee
        string sprint
        string release
        int created_by FK
        datetime created_at
        datetime updated_at
    }
```

---

## Core Entities Only (Simplified View)

```mermaid
erDiagram
    Users ||--o{ TestCases : creates
    Modules ||--o{ TestCases : contains
    TestCases ||--o{ TestExecutions : "executed_in"
    Releases ||--o{ TestExecutions : tracks
    Users ||--o{ TestExecutions : executes
    
    Users {
        int id PK
        string email
        string role
    }
    
    Modules {
        int id PK
        string name
    }
    
    TestCases {
        int id PK
        string test_id
        string title
        int module_id FK
        int created_by FK
    }
    
    Releases {
        int id PK
        string version
        string name
    }
    
    TestExecutions {
        int id PK
        int test_case_id FK
        int release_id FK
        int executor_id FK
        enum status
    }
```

---

## Test Organization Hierarchy

```mermaid
graph TD
    A[Modules] --> B1[Sub-Modules]
    B1 --> C1[Features]
    C1 --> D1[Test Cases]
    
    A --> B2[Sub-Modules]
    B2 --> C2[Features]
    C2 --> D2[Test Cases]
    
    D1 --> E[Releases]
    D2 --> E
    
    E --> F[Test Executions]
    
    style A fill:#1976d2,color:#fff
    style B1 fill:#42a5f5,color:#fff
    style B2 fill:#42a5f5,color:#fff
    style C1 fill:#64b5f6,color:#fff
    style C2 fill:#64b5f6,color:#fff
    style D1 fill:#90caf9,color:#000
    style D2 fill:#90caf9,color:#000
    style E fill:#4caf50,color:#fff
    style F fill:#66bb6a,color:#fff
```

---

## JIRA Integration Flow

```mermaid
graph LR
    A[JIRA Cloud] -->|Import Story| B[Jira Stories]
    B -->|Link| C[Test Cases]
    C -->|Auto-Link| D[Releases]
    D -->|Contains| E[Release Test Cases]
    
    B -->|Has| F[Release Version]
    F -->|Matches| D
    
    style A fill:#0052cc,color:#fff
    style B fill:#1976d2,color:#fff
    style C fill:#42a5f5,color:#fff
    style D fill:#4caf50,color:#fff
    style E fill:#66bb6a,color:#fff
    style F fill:#ff9800,color:#fff
```

---

## Release Management Workflow

```mermaid
stateDiagram-v2
    [*] --> NotStarted: Create Release
    NotStarted --> InProgress: Add Test Cases
    InProgress --> InProgress: Execute Tests
    InProgress --> PendingApproval: All Tests Done
    PendingApproval --> Approved: QA Lead Approves
    PendingApproval --> ChangesRequested: Reject with Comments
    ChangesRequested --> InProgress: Fix & Re-test
    Approved --> Completed: Final Approval
    Completed --> [*]
    
    note right of InProgress
        - Add test cases
        - Execute & update status
        - Track bugs
    end note
    
    note right of PendingApproval
        Multi-level approval:
        - QA Lead
        - Dev Lead
        - Product Manager
        - Release Manager
    end note
```

---

## Test Execution States

```mermaid
stateDiagram-v2
    [*] --> NotStarted
    NotStarted --> InProgress: Start Test
    InProgress --> Passed: Test Passed
    InProgress --> Failed: Test Failed
    InProgress --> Blocked: Dependency Block
    InProgress --> Skipped: Skip Test
    Failed --> InProgress: Retry
    Blocked --> InProgress: Unblock
    Passed --> [*]
    Failed --> [*]
    Skipped --> [*]
    Blocked --> [*]
```

---

## Data Flow: Test Case Creation to Execution

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant DB as Database
    
    U->>F: Create Test Case
    F->>A: POST /test-cases
    A->>A: Validate Data
    A->>DB: INSERT test_cases
    DB-->>A: Return ID
    A-->>F: Created (201)
    F-->>U: Show Success
    
    U->>F: Add to Release
    F->>A: POST /releases/{id}/test-cases
    A->>DB: INSERT release_test_cases
    DB-->>A: Success
    A-->>F: Added (200)
    F-->>U: Show in Release
    
    U->>F: Execute Test
    F->>A: PUT /releases/{id}/test-cases/{tc_id}
    A->>DB: UPDATE release_test_cases
    DB-->>A: Updated
    A-->>F: Updated (200)
    F-->>U: Show Status
```

---

## API to Database Mapping

```mermaid
graph TB
    subgraph "API Layer"
        A1[auth.py]
        A2[test_cases.py]
        A3[modules.py]
        A4[releases.py]
        A5[jira_stories.py]
        A6[reports.py]
    end
    
    subgraph "Database Tables"
        D1[(users)]
        D2[(test_cases)]
        D3[(modules)]
        D4[(releases)]
        D5[(jira_stories)]
        D6[(release_test_cases)]
        D7[(test_executions)]
    end
    
    A1 --> D1
    A2 --> D2
    A2 --> D3
    A3 --> D3
    A4 --> D4
    A4 --> D6
    A5 --> D5
    A5 --> D2
    A5 --> D4
    A6 --> D6
    A6 --> D2
    A6 --> D4
    A6 --> D5
    
    style A1 fill:#1976d2,color:#fff
    style A2 fill:#1976d2,color:#fff
    style A3 fill:#1976d2,color:#fff
    style A4 fill:#1976d2,color:#fff
    style A5 fill:#1976d2,color:#fff
    style A6 fill:#1976d2,color:#fff
    
    style D1 fill:#4caf50,color:#fff
    style D2 fill:#4caf50,color:#fff
    style D3 fill:#4caf50,color:#fff
    style D4 fill:#4caf50,color:#fff
    style D5 fill:#4caf50,color:#fff
    style D6 fill:#4caf50,color:#fff
    style D7 fill:#4caf50,color:#fff
```

---

## How to Use These Diagrams

### Option 1: View in GitHub
- Push this file to GitHub
- GitHub automatically renders Mermaid diagrams

### Option 2: VS Code
- Install "Markdown Preview Mermaid Support" extension
- Open this file and preview (Cmd/Ctrl + Shift + V)

### Option 3: Online Tools
- Visit https://mermaid.live/
- Copy diagram code and paste
- Export as PNG/SVG for presentations

### Option 4: Convert to Images
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i DATABASE_SCHEMA_DIAGRAM.md -o schema.png

# Convert to SVG
mmdc -i DATABASE_SCHEMA_DIAGRAM.md -o schema.svg
```
