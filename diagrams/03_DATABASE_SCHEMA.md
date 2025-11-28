# Database Schema Diagram

## Complete Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ test_cases : creates
    users ||--o{ modules : creates
    users ||--o{ sub_modules : creates
    users ||--o{ features : creates
    users ||--o{ releases : creates
    users ||--o{ jira_stories : creates
    users ||--o{ step_catalog : creates
    users ||--o{ feature_files : creates
    users ||--o{ bugs : reports
    users ||--o{ bugs : "assigned_to"
    users ||--o{ test_case_stories : links
    users ||--o{ release_test_cases : executes
    
    modules ||--o{ sub_modules : contains
    modules ||--o{ test_cases : categorizes
    modules ||--o{ step_catalog : organizes
    modules ||--o{ feature_files : organizes
    
    sub_modules ||--o{ features : contains
    sub_modules ||--o{ test_cases : categorizes
    
    features ||--o{ test_cases : categorizes
    
    releases ||--o{ jira_stories : tracks
    releases ||--o{ release_test_cases : includes
    releases ||--o{ bugs : tracks
    
    test_cases ||--o{ test_case_stories : "linked_to"
    test_cases ||--o{ release_test_cases : "included_in"
    
    jira_stories ||--o{ test_cases : "primary_story"
    jira_stories ||--o{ test_case_stories : "linked_to"
    
    users {
        int id PK
        string username UK
        string email UK
        string password_hash
        string full_name
        string role
        boolean is_active
        boolean is_email_verified
        string verification_token
        datetime created_at
    }
    
    modules {
        int id PK
        string name UK
        text description
        int created_by FK
        datetime created_at
    }
    
    sub_modules {
        int id PK
        string name
        text description
        int module_id FK
        int created_by FK
        datetime created_at
    }
    
    features {
        int id PK
        string name
        text description
        int sub_module_id FK
        int created_by FK
        datetime created_at
    }
    
    test_cases {
        int id PK
        string test_id UK
        string title
        text description
        string test_type
        string tag
        string tags
        int module_id FK
        string sub_module
        string feature_section
        string automation_status
        text scenario_examples
        text steps_to_reproduce
        text expected_result
        text preconditions
        text test_data
        string automated_script_path
        string jira_story_id FK
        string jira_epic_id
        datetime created_at
        datetime updated_at
    }
    
    jira_stories {
        string story_id PK
        string epic_id
        string title
        text description
        string status
        string priority
        string assignee
        string sprint
        string release FK
        int created_by FK
        datetime created_at
        datetime updated_at
    }
    
    test_case_stories {
        int id PK
        int test_case_id FK
        string story_id FK
        datetime linked_at
        int linked_by FK
    }
    
    releases {
        int id PK
        string version UK
        date release_date
        string status
        int created_by FK
        datetime created_at
    }
    
    release_test_cases {
        int id PK
        int release_id FK
        int test_case_id FK
        int module_id FK
        int sub_module_id FK
        int feature_id FK
        string execution_status
        int executed_by FK
        datetime executed_at
        text comments
        string bug_id
        datetime created_at
    }
    
    step_catalog {
        int id PK
        string step_type
        text step_text UK
        text step_pattern
        text description
        text parameters
        string tags
        int usage_count
        int module_id FK
        int created_by FK
        datetime created_at
    }
    
    feature_files {
        int id PK
        string name
        text content
        string status
        int module_id FK
        int created_by FK
        datetime created_at
        datetime updated_at
    }
    
    bugs {
        int id PK
        int release_id FK
        text description
        int assigned_to FK
        string priority
        string status
        text screenshot_url
        text video_url
        int reported_by FK
        datetime created_at
        datetime updated_at
    }
```

## Core Tables Detail

### 1. Users Table
```mermaid
erDiagram
    users {
        int id PK "Primary Key - Auto Increment"
        string username UK "Unique Username"
        string email UK "Unique Email"
        string password_hash "Bcrypt Hashed Password"
        string full_name "Display Name"
        string role "admin/user/viewer"
        boolean is_active "Account Status"
        boolean is_email_verified "Email Verification"
        string verification_token "Token for Email Verification"
        datetime created_at "Account Creation Date"
    }
```

**Purpose**: User authentication and authorization  
**Indexes**: username, email  
**Constraints**: Unique on username and email

### 2. Test Cases Table
```mermaid
erDiagram
    test_cases {
        int id PK "Primary Key"
        string test_id UK "Human-readable ID (UI0001, API0001)"
        string title "Test Case Title"
        text description "Detailed Description"
        string test_type "manual/automated"
        string tag "ui/api/hybrid"
        string tags "Comma-separated tags"
        int module_id FK "Reference to modules"
        string sub_module "Sub-module name (denormalized)"
        string feature_section "Feature name (denormalized)"
        string automation_status "working/broken/not_started"
        text scenario_examples "JSON - Scenario Outline data"
        text steps_to_reproduce "Test steps"
        text expected_result "Expected outcome"
        text preconditions "Prerequisites"
        text test_data "Test data needed"
        string automated_script_path "Path to automation script"
        string jira_story_id FK "Primary JIRA story link"
        string jira_epic_id "JIRA epic reference"
        datetime created_at "Creation timestamp"
        datetime updated_at "Last update timestamp"
    }
```

**Purpose**: Central repository for all test cases  
**Indexes**: test_id, module_id, jira_story_id, tag, test_type  
**Unique**: test_id

### 3. Many-to-Many Junction Table
```mermaid
erDiagram
    test_case_stories {
        int id PK "Primary Key"
        int test_case_id FK "Reference to test_cases"
        string story_id FK "Reference to jira_stories"
        datetime linked_at "When link was created"
        int linked_by FK "User who created link"
    }
    
    test_cases ||--o{ test_case_stories : "can be linked to"
    jira_stories ||--o{ test_case_stories : "can have many"
```

**Purpose**: Many-to-many relationship between test cases and JIRA stories  
**Indexes**: test_case_id, story_id  
**Unique Constraint**: (test_case_id, story_id)

## Module Hierarchy

```mermaid
graph TD
    M[Module] --> SM1[Sub-Module 1]
    M --> SM2[Sub-Module 2]
    M --> SM3[Sub-Module 3]
    
    SM1 --> F1[Feature 1.1]
    SM1 --> F2[Feature 1.2]
    
    SM2 --> F3[Feature 2.1]
    SM2 --> F4[Feature 2.2]
    
    SM3 --> F5[Feature 3.1]
    
    F1 --> TC1[Test Case 1]
    F1 --> TC2[Test Case 2]
    F2 --> TC3[Test Case 3]
    F3 --> TC4[Test Case 4]
    F4 --> TC5[Test Case 5]
    F5 --> TC6[Test Case 6]
    
    style M fill:#4caf50
    style SM1 fill:#2196f3
    style SM2 fill:#2196f3
    style SM3 fill:#2196f3
    style F1 fill:#ff9800
    style F2 fill:#ff9800
    style F3 fill:#ff9800
    style F4 fill:#ff9800
    style F5 fill:#ff9800
    style TC1 fill:#9c27b0
    style TC2 fill:#9c27b0
    style TC3 fill:#9c27b0
    style TC4 fill:#9c27b0
    style TC5 fill:#9c27b0
    style TC6 fill:#9c27b0
```

## Release Management Schema

```mermaid
erDiagram
    releases ||--o{ release_test_cases : contains
    releases ||--o{ jira_stories : tracks
    releases ||--o{ bugs : has
    
    test_cases ||--o{ release_test_cases : "included_in"
    modules ||--o{ release_test_cases : categorizes
    sub_modules ||--o{ release_test_cases : categorizes
    features ||--o{ release_test_cases : categorizes
    users ||--o{ release_test_cases : executes
    
    releases {
        int id PK
        string version UK
        date release_date
        string status
        int created_by FK
        datetime created_at
    }
    
    release_test_cases {
        int id PK
        int release_id FK
        int test_case_id FK
        int module_id FK
        int sub_module_id FK
        int feature_id FK
        string execution_status
        int executed_by FK
        datetime executed_at
        text comments
        string bug_id
        datetime created_at
    }
    
    jira_stories {
        string story_id PK
        string release FK
        string status
        string priority
    }
    
    bugs {
        int id PK
        int release_id FK
        text description
        int assigned_to FK
        string priority
        string status
        int reported_by FK
        datetime created_at
    }
```

## BDD/Gherkin Schema

```mermaid
erDiagram
    step_catalog ||--o{ feature_files : "provides_steps"
    modules ||--o{ step_catalog : organizes
    modules ||--o{ feature_files : organizes
    feature_files ||--o{ test_cases : "generates"
    users ||--o{ step_catalog : creates
    users ||--o{ feature_files : creates
    
    step_catalog {
        int id PK
        string step_type
        text step_text UK
        text step_pattern
        text description
        text parameters
        string tags
        int usage_count
        int module_id FK
        int created_by FK
        datetime created_at
    }
    
    feature_files {
        int id PK
        string name
        text content
        string status
        int module_id FK
        int created_by FK
        datetime created_at
        datetime updated_at
    }
    
    test_cases {
        int id PK
        string test_id UK
        text scenario_examples
        text steps_to_reproduce
        string feature_section
    }
```

## Indexes and Performance

```mermaid
graph TD
    subgraph "Primary Keys"
        PK1[users.id]
        PK2[test_cases.id]
        PK3[modules.id]
        PK4[releases.id]
        PK5[jira_stories.story_id]
    end
    
    subgraph "Unique Indexes"
        UK1[users.username]
        UK2[users.email]
        UK3[test_cases.test_id]
        UK4[modules.name]
        UK5[releases.version]
        UK6[step_catalog.step_text]
    end
    
    subgraph "Foreign Key Indexes"
        FK1[test_cases.module_id]
        FK2[test_cases.jira_story_id]
        FK3[release_test_cases.release_id]
        FK4[release_test_cases.test_case_id]
        FK5[test_case_stories.test_case_id]
        FK6[test_case_stories.story_id]
    end
    
    subgraph "Composite Indexes"
        CI1[test_case_stories - test_case_id, story_id]
        CI2[release_test_cases - release_id, test_case_id]
    end
    
    style PK1 fill:#4caf50
    style PK2 fill:#4caf50
    style PK3 fill:#4caf50
    style PK4 fill:#4caf50
    style PK5 fill:#4caf50
    style UK1 fill:#2196f3
    style UK2 fill:#2196f3
    style UK3 fill:#2196f3
    style UK4 fill:#2196f3
    style UK5 fill:#2196f3
    style UK6 fill:#2196f3
    style FK1 fill:#ff9800
    style FK2 fill:#ff9800
    style FK3 fill:#ff9800
    style FK4 fill:#ff9800
    style FK5 fill:#ff9800
    style FK6 fill:#ff9800
    style CI1 fill:#9c27b0
    style CI2 fill:#9c27b0
```

## Data Relationships Summary

```mermaid
graph LR
    subgraph "Core Entities"
        U[Users]
        TC[Test Cases]
        M[Modules]
        R[Releases]
        JS[JIRA Stories]
    end
    
    subgraph "Junction Tables"
        TCS[test_case_stories]
        RTC[release_test_cases]
    end
    
    subgraph "Supporting Entities"
        SM[Sub-Modules]
        F[Features]
        SC[Step Catalog]
        FF[Feature Files]
        B[Bugs]
    end
    
    U -->|creates| TC
    U -->|creates| M
    U -->|creates| R
    U -->|creates| JS
    
    M -->|contains| SM
    SM -->|contains| F
    
    TC -->|belongs_to| M
    TC -->|linked_via| TCS
    JS -->|linked_via| TCS
    
    R -->|includes_via| RTC
    TC -->|included_via| RTC
    
    R -->|tracks| JS
    R -->|has| B
    
    M -->|organizes| SC
    M -->|organizes| FF
    
    style U fill:#4caf50
    style TC fill:#2196f3
    style M fill:#ff9800
    style R fill:#9c27b0
    style JS fill:#f44336
    style TCS fill:#00bcd4
    style RTC fill:#00bcd4
```

## Migration History

```mermaid
graph TD
    Start[Initial Schema] --> M1[Add Features Table]
    M1 --> M2[Add Sub-Modules Table]
    M2 --> M3[Add Step Catalog]
    M3 --> M4[Add JIRA Stories]
    M4 --> M5[Add Release Management]
    M5 --> M6[Add Email Verification]
    M6 --> M7[Add Automation Status]
    M7 --> M8[Add Hierarchy Fields]
    M8 --> M9[Add JIRA Fields]
    M9 --> M10[Add Last Synced]
    M10 --> M11[Add Tags]
    M11 --> M12[Add Release to Stories]
    M12 --> M13[Add Bugs Table]
    M13 --> M14[Add test_case_stories Junction]
    M14 --> Current[Current Schema]
    
    style Start fill:#4caf50
    style Current fill:#4caf50
    style M13 fill:#ff9800
    style M14 fill:#ff9800
```
