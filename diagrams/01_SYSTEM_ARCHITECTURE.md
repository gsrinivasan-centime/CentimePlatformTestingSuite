# System Architecture Diagram

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        User[End User]
    end
    
    subgraph "Frontend Layer - React SPA"
        ReactApp[React Application]
        
        subgraph "Pages"
            Dashboard[Dashboard]
            TestCases[Test Cases]
            TestStudio[Test Design Studio]
            ReleaseMgmt[Release Management]
            Reports[Reports & Analytics]
            JiraStories[JIRA Stories]
        end
        
        subgraph "Components"
            Monaco[Monaco Editor]
            Charts[Recharts]
            DataTables[Material-UI Tables]
            Forms[Material-UI Forms]
        end
        
        subgraph "Services"
            APIClient[API Client Service]
            AuthService[Auth Service]
        end
    end
    
    subgraph "Backend Layer - FastAPI"
        FastAPI[FastAPI Server]
        
        subgraph "API Endpoints"
            AuthAPI[Auth API]
            TestCaseAPI[Test Cases API]
            ModulesAPI[Modules API]
            StepCatalogAPI[Step Catalog API]
            ReleaseAPI[Releases API]
            JiraAPI[JIRA Stories API]
            ReportsAPI[Reports API]
            BugsAPI[Bugs API]
        end
        
        subgraph "Services Layer"
            JiraService[JIRA Integration Service]
            GherkinParser[Gherkin Parser]
            PDFGenerator[PDF Report Generator]
        end
        
        subgraph "Core"
            Security[JWT Security]
            Database[DB Connection Pool]
            Config[Configuration]
        end
    end
    
    subgraph "Data Layer"
        SQLite[(SQLite Database)]
        
        subgraph "Tables"
            Users[users]
            TestCasesTable[test_cases]
            Modules[modules]
            SubModules[sub_modules]
            Features[features]
            Releases[releases]
            Stories[jira_stories]
            StepCatalog[step_catalog]
            FeatureFiles[feature_files]
            Bugs[bugs]
            Junction[test_case_stories]
        end
    end
    
    subgraph "External Systems"
        JIRA[JIRA/Atlassian]
    end
    
    User --> Browser
    Browser --> ReactApp
    ReactApp --> Dashboard
    ReactApp --> TestCases
    ReactApp --> TestStudio
    ReactApp --> ReleaseMgmt
    ReactApp --> Reports
    ReactApp --> JiraStories
    
    Dashboard --> APIClient
    TestCases --> APIClient
    TestStudio --> Monaco
    TestStudio --> APIClient
    ReleaseMgmt --> APIClient
    Reports --> Charts
    Reports --> APIClient
    JiraStories --> APIClient
    
    APIClient --> AuthService
    APIClient --> FastAPI
    
    FastAPI --> AuthAPI
    FastAPI --> TestCaseAPI
    FastAPI --> ModulesAPI
    FastAPI --> StepCatalogAPI
    FastAPI --> ReleaseAPI
    FastAPI --> JiraAPI
    FastAPI --> ReportsAPI
    FastAPI --> BugsAPI
    
    AuthAPI --> Security
    TestCaseAPI --> Database
    StepCatalogAPI --> GherkinParser
    JiraAPI --> JiraService
    ReportsAPI --> PDFGenerator
    
    JiraService --> JIRA
    
    Database --> SQLite
    
    SQLite --> Users
    SQLite --> TestCasesTable
    SQLite --> Modules
    SQLite --> SubModules
    SQLite --> Features
    SQLite --> Releases
    SQLite --> Stories
    SQLite --> StepCatalog
    SQLite --> FeatureFiles
    SQLite --> Bugs
    SQLite --> Junction
    
    style Browser fill:#e1f5ff
    style ReactApp fill:#bbdefb
    style FastAPI fill:#c8e6c9
    style SQLite fill:#fff9c4
    style JIRA fill:#ffccbc
```

## Technology Stack Details

```mermaid
graph LR
    subgraph "Frontend Stack"
        React[React 18]
        MUI[Material-UI v5]
        Monaco[Monaco Editor]
        Recharts[Recharts]
        Axios[Axios]
    end
    
    subgraph "Backend Stack"
        Python[Python 3.13]
        FastAPI[FastAPI]
        SQLAlchemy[SQLAlchemy ORM]
        Uvicorn[Uvicorn Server]
        JWT[JWT Auth]
        Gherkin[Gherkin Parser]
    end
    
    subgraph "Database"
        SQLite[SQLite 3]
    end
    
    subgraph "Testing"
        Pytest[Pytest]
        Selenium[Selenium]
        Requests[Requests]
        PyMySQL[PyMySQL]
    end
    
    React --> MUI
    React --> Monaco
    React --> Recharts
    React --> Axios
    
    Python --> FastAPI
    FastAPI --> SQLAlchemy
    FastAPI --> Uvicorn
    FastAPI --> JWT
    FastAPI --> Gherkin
    
    SQLAlchemy --> SQLite
    
    style React fill:#61dafb
    style FastAPI fill:#009688
    style SQLite fill:#003b57
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DevFE[Frontend Dev Server<br/>Port: 3000]
        DevBE[Backend Dev Server<br/>Port: 8000]
        DevDB[(SQLite DB<br/>test_management.db)]
    end
    
    subgraph "Production Environment"
        ProdFE[React Build<br/>Static Files]
        ProdBE[FastAPI Server<br/>Uvicorn]
        ProdDB[(SQLite DB<br/>with Backups)]
    end
    
    subgraph "CI/CD Pipeline"
        Git[Git Repository]
        Jenkins[Jenkins/GitHub Actions]
        Tests[Automated Tests]
        Build[Build Process]
    end
    
    Git --> Jenkins
    Jenkins --> Tests
    Tests --> Build
    Build --> ProdFE
    Build --> ProdBE
    
    DevFE --> DevBE
    DevBE --> DevDB
    
    ProdFE --> ProdBE
    ProdBE --> ProdDB
    
    style DevFE fill:#e3f2fd
    style DevBE fill:#e8f5e9
    style ProdFE fill:#1976d2
    style ProdBE fill:#388e3c
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API
    participant Service
    participant Database
    participant JIRA
    
    User->>React: Interact with UI
    React->>API: HTTP Request (JWT Token)
    API->>API: Validate JWT
    
    alt JIRA Integration
        API->>Service: Call JIRA Service
        Service->>JIRA: Fetch Story Details
        JIRA-->>Service: Return Story Data
        Service-->>API: Processed Data
    end
    
    API->>Database: Query/Update Data
    Database-->>API: Return Results
    API-->>React: JSON Response
    React-->>User: Update UI
    
    Note over React,Database: All communications use REST API
    Note over API,Database: SQLAlchemy ORM handles DB operations
```

## Security Architecture

```mermaid
graph TB
    subgraph "Authentication Flow"
        Login[User Login]
        Credentials[Username/Password]
        Validation[Validate Credentials]
        TokenGen[Generate JWT Token]
        TokenStore[Store in LocalStorage]
    end
    
    subgraph "Authorization Flow"
        Request[API Request]
        TokenCheck[Extract JWT Token]
        TokenValidate[Validate Token]
        UserContext[Get User Context]
        AccessCheck[Check Permissions]
        Response[API Response]
    end
    
    subgraph "Security Features"
        PasswordHash[Password Hashing<br/>bcrypt]
        JWTSecret[JWT Secret Key]
        TokenExpiry[Token Expiration]
        CORS[CORS Configuration]
    end
    
    Login --> Credentials
    Credentials --> Validation
    Validation --> PasswordHash
    Validation --> TokenGen
    TokenGen --> JWTSecret
    TokenGen --> TokenStore
    
    Request --> TokenCheck
    TokenCheck --> TokenValidate
    TokenValidate --> JWTSecret
    TokenValidate --> TokenExpiry
    TokenValidate --> UserContext
    UserContext --> AccessCheck
    AccessCheck --> Response
    
    style PasswordHash fill:#ffcdd2
    style JWTSecret fill:#ffcdd2
    style TokenExpiry fill:#ffcdd2
    style CORS fill:#ffcdd2
```

## Component Communication

```mermaid
graph LR
    subgraph "Frontend Components"
        TC[Test Cases Page]
        TS[Test Studio]
        RM[Release Management]
        JS[JIRA Stories]
        RP[Reports]
    end
    
    subgraph "Shared Services"
        API[API Client]
        Auth[Auth Context]
        State[Global State]
    end
    
    subgraph "Backend APIs"
        TestAPI[Test Cases API]
        StepAPI[Step Catalog API]
        ReleaseAPI[Release API]
        JiraAPI[JIRA API]
        ReportAPI[Reports API]
    end
    
    TC --> API
    TS --> API
    RM --> API
    JS --> API
    RP --> API
    
    API --> Auth
    API --> State
    
    API --> TestAPI
    API --> StepAPI
    API --> ReleaseAPI
    API --> JiraAPI
    API --> ReportAPI
    
    style API fill:#90caf9
    style Auth fill:#a5d6a7
    style State fill:#ce93d8
```
