# API Documentation - Centime Platform Testing Suite

**Complete API Reference**  
**Base URL:** `http://localhost:8000/api`  
**Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Authentication APIs](#1-authentication-apis)
2. [User Management APIs](#2-user-management-apis)
3. [Module Management APIs](#3-module-management-apis)
4. [Test Case Management APIs](#4-test-case-management-apis)
5. [JIRA Story Management APIs](#5-jira-story-management-apis)
6. [Release Management APIs](#6-release-management-apis)
7. [Test Execution APIs](#7-test-execution-apis)
8. [Reporting APIs](#8-reporting-apis)

---

## 1. Authentication APIs

### POST `/auth/register`
**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "tester",
  "is_active": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Database Impact:**
- INSERT into `users` table
- Password is hashed using bcrypt
- Default role: "tester"

---

### POST `/auth/login`
**Description:** Login with email and password

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "tester"
  }
}
```

**Database Impact:**
- SELECT from `users` WHERE email
- Verify password hash
- No database writes

---

### POST `/auth/verify-email/{token}`
**Description:** Verify user email address

**Response (200):**
```json
{
  "message": "Email verified successfully"
}
```

**Database Impact:**
- UPDATE `users` SET is_email_verified=true, email_verified_at=NOW()

---

### GET `/auth/me`
**Description:** Get current authenticated user details

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "tester",
  "is_active": true,
  "is_email_verified": true,
  "created_at": "2025-11-01T10:00:00Z"
}
```

**Database Impact:**
- SELECT from `users` WHERE id

---

## 2. User Management APIs

### GET `/users`
**Description:** Get all users (Admin only)

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "full_name": "Admin User",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-11-01T10:00:00Z"
  }
]
```

**Database Impact:**
- SELECT * FROM `users` ORDER BY created_at DESC

---

### PUT `/users/{user_id}`
**Description:** Update user details

**Request Body:**
```json
{
  "full_name": "John Smith",
  "role": "admin"
}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Smith",
  "role": "admin"
}
```

**Database Impact:**
- UPDATE `users` SET ... WHERE id = {user_id}

---

## 3. Module Management APIs

### GET `/modules`
**Description:** Get all modules with sub-modules

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Account Payable",
    "description": "AP module test cases",
    "created_at": "2025-11-01T10:00:00Z",
    "sub_modules": [
      {
        "id": 1,
        "name": "Suppliers",
        "description": "Supplier management",
        "module_id": 1
      }
    ]
  }
]
```

**Database Impact:**
- SELECT * FROM `modules`
- SELECT * FROM `sub_modules` WHERE module_id IN (...)

---

### POST `/modules`
**Description:** Create a new module

**Request Body:**
```json
{
  "name": "Account Payable",
  "description": "AP module test cases"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "Account Payable",
  "description": "AP module test cases",
  "created_at": "2025-11-05T10:00:00Z"
}
```

**Database Impact:**
- INSERT INTO `modules` (name, description, created_at)

---

### GET `/sub-modules?module_id={id}`
**Description:** Get sub-modules for a specific module

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Suppliers",
    "description": "Supplier management",
    "module_id": 1
  }
]
```

**Database Impact:**
- SELECT * FROM `sub_modules` WHERE module_id = {id}

---

### POST `/sub-modules`
**Description:** Create a new sub-module

**Request Body:**
```json
{
  "name": "Suppliers",
  "description": "Supplier management",
  "module_id": 1
}
```

**Database Impact:**
- INSERT INTO `sub_modules`

---

### GET `/features?sub_module_id={id}`
**Description:** Get features for a specific sub-module

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Create Supplier",
    "description": "Supplier creation flow",
    "sub_module_id": 1
  }
]
```

**Database Impact:**
- SELECT * FROM `features` WHERE sub_module_id = {id}

---

## 4. Test Case Management APIs

### GET `/test-cases`
**Description:** Get all test cases with filters

**Query Parameters:**
- `module_id` (optional): Filter by module
- `tag` (optional): ui, api, hybrid
- `test_type` (optional): manual, automated
- `search` (optional): Search in title/description
- `skip` (optional): Pagination offset
- `limit` (optional): Results per page

**Example:**
```
GET /test-cases?module_id=1&tag=ui&limit=50
```

**Response (200):**
```json
[
  {
    "id": 1,
    "test_id": "TC-AP-001",
    "title": "Create new supplier with valid data",
    "description": "Verify supplier creation...",
    "test_type": "manual",
    "tag": "ui",
    "module_id": 1,
    "module_name": "Account Payable",
    "sub_module": "Suppliers",
    "feature_section": "Create Supplier",
    "jira_story_id": "CTP-1234",
    "tags": "smoke,regression",
    "automation_status": null,
    "created_at": "2025-11-01T10:00:00Z"
  }
]
```

**Database Impact:**
```sql
SELECT tc.*, m.name as module_name 
FROM test_cases tc
LEFT JOIN modules m ON tc.module_id = m.id
WHERE tc.module_id = ? AND tc.tag = ?
ORDER BY tc.created_at DESC
LIMIT ? OFFSET ?
```

---

### POST `/test-cases`
**Description:** Create a new test case

**Request Body:**
```json
{
  "test_id": "TC-AP-001",
  "title": "Create new supplier with valid data",
  "description": "Verify supplier creation functionality",
  "test_type": "manual",
  "tag": "ui",
  "module_id": 1,
  "sub_module": "Suppliers",
  "feature_section": "Create Supplier",
  "tags": "smoke,regression",
  "steps_to_reproduce": "1. Login\n2. Go to Suppliers...",
  "expected_result": "Supplier created successfully",
  "preconditions": "User has supplier create permission",
  "test_data": "email: test@example.com",
  "jira_story_id": "CTP-1234"
}
```

**Response (201):**
```json
{
  "id": 1,
  "test_id": "TC-AP-001",
  "title": "Create new supplier with valid data",
  "...": "..."
}
```

**Database Impact:**
- INSERT INTO `test_cases`
- If jira_story_id provided:
  - SELECT * FROM `jira_stories` WHERE story_id = ?
  - If story has release:
    - SELECT * FROM `releases` WHERE version = story.release
    - INSERT INTO `release_test_cases` (auto-link)

---

### PUT `/test-cases/{id}`
**Description:** Update existing test case

**Request Body:** Same as POST

**Database Impact:**
- UPDATE `test_cases` SET ... WHERE id = {id}
- UPDATE updated_at = NOW()

---

### DELETE `/test-cases/{id}`
**Description:** Delete a test case

**Response (200):**
```json
{
  "message": "Test case deleted successfully"
}
```

**Database Impact:**
- DELETE FROM `test_cases` WHERE id = {id}
- CASCADE: Also deletes related `test_executions`, `release_test_cases`

---

### POST `/test-cases/bulk-upload`
**Description:** Bulk upload test cases via CSV

**Request:**
```
Content-Type: multipart/form-data
file: testcases.csv
```

**CSV Format:**
```csv
test_id,title,module,sub_module,feature,test_type,tag,steps,expected_result
TC-001,Test Name,Account Payable,Suppliers,Create,manual,ui,"Step 1...",Expected result
```

**Response (200):**
```json
{
  "message": "Successfully imported 25 test cases",
  "imported_count": 25,
  "errors": []
}
```

**Database Impact:**
- Multiple INSERT INTO `test_cases`
- Transactional: All or nothing

---

### POST `/test-cases/bdd-upload`
**Description:** Upload BDD Gherkin .feature files

**Request:**
```
Content-Type: multipart/form-data
files: [feature1.feature, feature2.feature]
module_id: 1
```

**Database Impact:**
- Parse .feature files
- Extract scenarios as test cases
- INSERT INTO `test_cases`

---

## 5. JIRA Story Management APIs

### GET `/jira-stories`
**Description:** Get all JIRA stories

**Response (200):**
```json
[
  {
    "id": 1,
    "story_id": "CTP-1234",
    "epic_id": "CTP-100",
    "title": "Implement supplier creation",
    "description": "As a user, I want to create suppliers...",
    "status": "In Progress",
    "priority": "High",
    "assignee": "john.doe@example.com",
    "sprint": "Sprint 23",
    "release": "R 2.90",
    "created_at": "2025-11-01T10:00:00Z"
  }
]
```

**Database Impact:**
- SELECT * FROM `jira_stories` ORDER BY created_at DESC

---

### POST `/jira-stories`
**Description:** Manually create a story

**Request Body:**
```json
{
  "story_id": "CTP-1234",
  "epic_id": "CTP-100",
  "title": "Implement supplier creation",
  "status": "To Do",
  "priority": "High",
  "release": "R 2.90"
}
```

**Database Impact:**
- INSERT INTO `jira_stories`

---

### POST `/jira-stories/import-from-jira`
**Description:** Import story from JIRA Cloud

**Request Body:**
```json
{
  "story_url": "https://your-domain.atlassian.net/browse/CTP-1234"
}
```

**Response (200):**
```json
{
  "id": 1,
  "story_id": "CTP-1234",
  "title": "Implement supplier creation",
  "status": "In Progress",
  "priority": "High",
  "release": "R 2.90",
  "message": "Story imported successfully from JIRA"
}
```

**External API Call:**
```
GET https://your-domain.atlassian.net/rest/api/3/issue/CTP-1234
Authorization: Basic {base64(email:api_token)}
```

**Database Impact:**
- INSERT INTO `jira_stories`
- If release matches existing release:
  - Auto-link test cases: INSERT INTO `release_test_cases`

---

### POST `/jira-stories/{story_id}/refetch`
**Description:** Re-fetch story details from JIRA

**Response (200):**
```json
{
  "story_id": "CTP-1234",
  "title": "Updated title from JIRA",
  "status": "Done",
  "message": "Story refetched and updated successfully"
}
```

**External API Call:**
- Same as import

**Database Impact:**
- UPDATE `jira_stories` SET ... WHERE story_id = {story_id}

---

### GET `/jira-stories/{story_id}/test-cases`
**Description:** Get all test cases linked to a story

**Response (200):**
```json
[
  {
    "id": 1,
    "test_id": "TC-AP-001",
    "title": "Create supplier test",
    "module_name": "Account Payable",
    "test_type": "manual",
    "tag": "ui"
  }
]
```

**Database Impact:**
```sql
SELECT tc.*, m.name as module_name
FROM test_cases tc
LEFT JOIN modules m ON tc.module_id = m.id
WHERE tc.jira_story_id = ?
```

---

### POST `/jira-stories/{story_id}/link-test-case/{test_case_id}`
**Description:** Link a test case to a story

**Response (200):**
```json
{
  "message": "Test case TC-AP-001 linked to story CTP-1234",
  "auto_linked_to_release": "R 2.90"
}
```

**Database Impact:**
```sql
-- Update test case
UPDATE test_cases 
SET jira_story_id = ?, jira_epic_id = ?
WHERE id = ?

-- Auto-link to release if story has release
INSERT INTO release_test_cases (release_id, test_case_id, ...)
SELECT r.id, ?, ...
FROM releases r
WHERE r.version = (SELECT release FROM jira_stories WHERE story_id = ?)
```

---

### DELETE `/jira-stories/{story_id}/unlink-test-case/{test_case_id}`
**Description:** Unlink test case from story

**Response (200):**
```json
{
  "message": "Test case unlinked from story and removed from associated releases"
}
```

**Database Impact:**
```sql
-- Remove from releases
DELETE FROM release_test_cases
WHERE test_case_id = ?
AND release_id IN (
  SELECT id FROM releases 
  WHERE version = (SELECT release FROM jira_stories WHERE story_id = ?)
)

-- Unlink from story
UPDATE test_cases
SET jira_story_id = NULL, jira_epic_id = NULL
WHERE id = ?
```

---

### GET `/jira-stories/epic/{epic_id}/stories`
**Description:** Get all stories for an epic

**Response (200):**
```json
[
  {
    "story_id": "CTP-1234",
    "title": "Story 1",
    "status": "Done"
  }
]
```

**Database Impact:**
- SELECT * FROM `jira_stories` WHERE epic_id = {epic_id}

---

## 6. Release Management APIs

### GET `/releases`
**Description:** Get all releases

**Response (200):**
```json
[
  {
    "id": 1,
    "version": "R 2.90",
    "name": "November 2025 Release",
    "description": "Q4 feature release",
    "release_date": "2025-11-30T00:00:00Z",
    "environment": "production",
    "overall_status": "in_progress",
    "qa_lead_id": 1,
    "created_at": "2025-11-01T10:00:00Z"
  }
]
```

**Database Impact:**
- SELECT * FROM `releases` ORDER BY release_date DESC

---

### POST `/releases`
**Description:** Create a new release

**Request Body:**
```json
{
  "version": "R 2.90",
  "name": "November 2025 Release",
  "description": "Q4 feature release",
  "release_date": "2025-11-30",
  "environment": "production",
  "qa_lead_id": 1
}
```

**Database Impact:**
- INSERT INTO `releases`
- INSERT INTO `release_history` (action="created")

---

### POST `/releases/{release_id}/test-cases`
**Description:** Add test cases to a release

**Request Body:**
```json
{
  "test_case_ids": [1, 2, 3, 4, 5],
  "priority": "high"
}
```

**Response (200):**
```json
{
  "message": "Successfully added 5 test cases to release",
  "added_count": 5
}
```

**Database Impact:**
```sql
-- For each test case:
SELECT tc.*, sm.id as sub_module_id, f.id as feature_id
FROM test_cases tc
LEFT JOIN sub_modules sm ON sm.name = tc.sub_module AND sm.module_id = tc.module_id
LEFT JOIN features f ON f.name = tc.feature_section AND f.sub_module_id = sm.id
WHERE tc.id IN (...)

-- Insert into release
INSERT INTO release_test_cases (
  release_id, test_case_id, module_id, sub_module_id, 
  feature_id, priority, execution_status
) VALUES (?, ?, ?, ?, ?, ?, 'not_started')
```

---

### PUT `/releases/{release_id}/test-cases/{test_case_id}`
**Description:** Update test case execution status in release

**Request Body:**
```json
{
  "execution_status": "passed",
  "comments": "All scenarios passed",
  "bug_ids": "",
  "execution_duration": 300
}
```

**Response (200):**
```json
{
  "message": "Test case execution updated successfully"
}
```

**Database Impact:**
```sql
UPDATE release_test_cases
SET 
  execution_status = ?,
  comments = ?,
  bug_ids = ?,
  execution_duration = ?,
  executed_by_id = ?,
  execution_date = NOW(),
  updated_at = NOW()
WHERE release_id = ? AND test_case_id = ?
```

---

### DELETE `/releases/{release_id}/test-cases/{test_case_id}`
**Description:** Remove test case from release

**Database Impact:**
- DELETE FROM `release_test_cases` WHERE release_id = ? AND test_case_id = ?

---

### GET `/releases/{release_id}/stories`
**Description:** Get all stories linked to a release (by version match)

**Response (200):**
```json
[
  {
    "story_id": "CTP-1234",
    "title": "Implement supplier creation",
    "status": "Done",
    "priority": "High",
    "release": "R 2.90"
  }
]
```

**Database Impact:**
```sql
SELECT * FROM jira_stories
WHERE release = (SELECT version FROM releases WHERE id = ?)
ORDER BY story_id
```

---

### POST `/releases/{release_id}/sync-story-test-cases`
**Description:** Sync all test cases from stories to release

**Response (200):**
```json
{
  "message": "Synced test cases from 3 stories to release R 2.90",
  "total_stories": 3,
  "linked_count": 5,
  "skipped_count": 2
}
```

**Database Impact:**
```sql
-- Get release version
SELECT version FROM releases WHERE id = ?

-- Get all stories with matching release
SELECT * FROM jira_stories WHERE release = ?

-- For each story, get linked test cases
SELECT * FROM test_cases WHERE jira_story_id = ?

-- Insert into release_test_cases (skip if already exists)
INSERT OR IGNORE INTO release_test_cases (...)
```

---

### POST `/releases/{release_id}/approve`
**Description:** Approve or reject a release

**Request Body:**
```json
{
  "role": "qa_lead",
  "approval_status": "approved",
  "comments": "All tests passed successfully"
}
```

**Database Impact:**
```sql
INSERT INTO release_approvals (
  release_id, approver_id, role, approval_status, comments, approved_at
) VALUES (?, ?, ?, ?, ?, NOW())

INSERT INTO release_history (
  release_id, user_id, action, details
) VALUES (?, ?, 'approved', ?)
```

---

### GET `/releases/{release_id}/history`
**Description:** Get release history/audit trail

**Response (200):**
```json
[
  {
    "id": 1,
    "action": "created",
    "user": "john.doe@example.com",
    "details": "{\"version\": \"R 2.90\"}",
    "created_at": "2025-11-01T10:00:00Z"
  }
]
```

**Database Impact:**
- SELECT * FROM `release_history` WHERE release_id = ? ORDER BY created_at DESC

---

## 7. Test Execution APIs

### GET `/executions`
**Description:** Get test executions

**Query Parameters:**
- `release_id` (optional)
- `test_case_id` (optional)

**Response (200):**
```json
[
  {
    "id": 1,
    "test_case_id": 1,
    "release_id": 1,
    "executor_id": 1,
    "status": "pass",
    "actual_result": "Test passed successfully",
    "execution_time": 120,
    "executed_at": "2025-11-05T10:00:00Z"
  }
]
```

**Database Impact:**
- SELECT * FROM `test_executions` WHERE ... ORDER BY executed_at DESC

---

### POST `/executions`
**Description:** Create a new test execution

**Request Body:**
```json
{
  "test_case_id": 1,
  "release_id": 1,
  "status": "pass",
  "actual_result": "Test passed successfully",
  "execution_time": 120
}
```

**Database Impact:**
- INSERT INTO `test_executions`

---

## 8. Reporting APIs

### GET `/reports/summary`
**Description:** Get comprehensive release test summary

**Query Parameters:**
- `release_id` (required)
- `module_id` (optional)

**Response (200):**
```json
{
  "release_id": 1,
  "release_version": "R 2.90",
  "release_name": "November 2025 Release",
  "total_tests": 150,
  "passed_tests": 120,
  "failed_tests": 10,
  "blocked_tests": 5,
  "skipped_tests": 5,
  "in_progress_tests": 10,
  "not_started_tests": 0,
  "module_summary": [
    {
      "module_id": 1,
      "module_name": "Account Payable",
      "total": 50,
      "passed": 40,
      "failed": 5,
      "blocked": 2,
      "in_progress": 3,
      "not_started": 0,
      "sub_modules": [
        {
          "name": "Suppliers",
          "total": 20,
          "passed": 18,
          "failed": 2,
          "features": [
            {
              "name": "Create Supplier",
              "test_cases": [
                {
                  "test_id": "TC-AP-001",
                  "title": "Create supplier with valid data",
                  "execution_status": "passed",
                  "jira_story": {
                    "story_id": "CTP-1234",
                    "title": "Implement supplier creation",
                    "status": "Done"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "story_summary": [
    {
      "story_id": "CTP-1234",
      "story_title": "Implement supplier creation",
      "epic_id": "CTP-100",
      "story_status": "Done",
      "total": 5,
      "passed": 5,
      "failed": 0,
      "blocked": 0,
      "in_progress": 0,
      "pass_percentage": 100.0
    }
  ],
  "failed_test_details": [
    {
      "test_case_id": "TC-AP-002",
      "title": "Test with error",
      "module_name": "Account Payable",
      "sub_module": "Suppliers",
      "error_message": "Validation error",
      "bug_ids": "BUG-123",
      "jira_story": {
        "story_id": "CTP-1235",
        "title": "Fix validation"
      }
    }
  ]
}
```

**Database Impact:**
```sql
-- Get all release test cases
SELECT rtc.*, tc.*, m.name as module_name, sm.name as sub_module_name, f.name as feature_name
FROM release_test_cases rtc
JOIN test_cases tc ON rtc.test_case_id = tc.id
JOIN modules m ON rtc.module_id = m.id
LEFT JOIN sub_modules sm ON rtc.sub_module_id = sm.id
LEFT JOIN features f ON rtc.feature_id = f.id
WHERE rtc.release_id = ?

-- Get JIRA story info for each test case
SELECT * FROM jira_stories WHERE story_id IN (...)

-- Aggregate statistics at multiple levels
```

---

### GET `/reports/pdf/{release_id}`
**Description:** Generate and download PDF report

**Response:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="release_R_2.90_report_20251105.pdf"

[Binary PDF data]
```

**Database Impact:**
- Same as `/reports/summary`
- Uses ReportLab library to generate PDF

**PDF Sections:**
1. Release Information
2. Overall Summary (with statistics)
3. Module-wise Test Execution Status
4. Detailed Test Cases (by Module → Sub-Module → Feature)
5. User Story-wise Test Coverage (NEW)
6. Failed Test Cases

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Authentication Flow

1. **Register/Login** → Receive JWT token
2. **Store Token** → localStorage or secure cookie
3. **Include in Requests** → `Authorization: Bearer {token}`
4. **Token Expiration** → Redirect to login on 401
5. **Refresh** → Re-login to get new token

---

## Rate Limiting

Currently no rate limiting implemented. Recommended for production:
- 100 requests/minute per user
- 1000 requests/hour per IP

---

## API Versioning

Current version: v1 (implicit)
Future: `/api/v2/...` for breaking changes

---

**Last Updated:** November 5, 2025
