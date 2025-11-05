# BDD Feature File Upload Guide

## Overview
The Test Management System now supports uploading BDD (Behavior-Driven Development) feature files written in Gherkin syntax. This allows teams to import test scenarios directly from `.feature` files.

## Supported Features

### ✅ Scenario
Regular scenarios are converted into individual test cases with:
- Auto-generated test IDs
- Steps extracted from Given/When/Then
- Feature name and scenario name captured

### ✅ Scenario Outline with Examples
Scenario Outlines with data tables are converted into test cases with:
- `scenario_examples` field populated with the Examples table
- Same test structure as regular scenarios
- Data-driven testing support

## How to Upload

### Step 1: Prepare Your Feature File
Create a `.feature` file with standard Gherkin syntax:

```gherkin
Feature: User Authentication
  
  Scenario: Successful login
    Given the user is on the login page
    When the user enters valid credentials
    Then the user should be redirected to dashboard

  Scenario Outline: Login with different roles
    Given the user is on the login page
    When the user enters username "<username>"
    Then the user role should be "<role>"

    Examples:
      | username          | role    |
      | admin@test.com    | admin   |
      | user@test.com     | user    |
```

### Step 2: Navigate to Test Cases
1. Go to Test Cases page
2. Click "Bulk Upload" button

### Step 3: Configure Upload
1. Select "BDD Feature File" tab
2. Configure required settings:
   - **Module**: Select the module (required)
   - **Sub-Module**: Optional sub-module name
   - **Test Type**: Manual or Automated (default: Automated)
   - **Tag**: UI, API, or Hybrid (default: UI)

### Step 4: Upload File
1. Click the upload area or drag and drop your `.feature` file
2. Click "Upload" button
3. Wait for processing to complete

## What Happens During Upload

### For Regular Scenarios:
- **Test ID**: Auto-generated (e.g., `TC_UI_1`)
- **Title**: Scenario name
- **Description**: Feature name + Scenario name
- **Steps**: All Given/When/Then steps
- **Tags**: Automatically tagged with "bdd,gherkin"

### For Scenario Outlines:
- **Test ID**: Auto-generated (e.g., `TC_UI_2`)
- **Title**: Scenario Outline name
- **Description**: Feature name + Scenario Outline name
- **Steps**: Parameterized steps with placeholders
- **Scenario Examples**: Data table stored in JSON format
- **Tags**: Automatically tagged with "bdd,gherkin"

## Example Scenario Examples JSON

For a Scenario Outline with this table:
```gherkin
Examples:
  | username          | password   | role    |
  | admin@test.com    | Admin123!  | admin   |
  | user@test.com     | User123!   | user    |
```

The system stores:
```json
{
  "columns": ["username", "password", "role"],
  "rows": [
    ["admin@test.com", "Admin123!", "admin"],
    ["user@test.com", "User123!", "user"]
  ]
}
```

## Tips

1. **Module Selection**: Always select the appropriate module - this is required
2. **Sub-Module**: Use this to organize scenarios within a module
3. **Test Type**: Choose "Automated" for scenarios that will be automated
4. **Tag Selection**: 
   - UI: For user interface tests
   - API: For API/service tests
   - Hybrid: For tests covering both UI and API

## Error Handling

If upload fails, check:
- ✓ File has `.feature` extension
- ✓ File contains valid Gherkin syntax
- ✓ Module is selected
- ✓ Feature has at least one scenario

## Sample Files

Two sample feature files are provided:
1. `sample_test.feature` - User authentication scenarios
2. `sample_shopping_cart.feature` - Shopping cart with multiple scenario outlines

## Backend Requirements

The backend uses the `gherkin-official` library to parse feature files. Install it:
```bash
pip install gherkin-official==4.1.3
```

## Benefits

1. **Quick Import**: Convert existing feature files to test cases instantly
2. **Maintain BDD Format**: Preserve Given/When/Then structure
3. **Data-Driven Testing**: Scenario Outlines with Examples are fully supported
4. **Auto-Generated IDs**: No need to manually create test IDs
5. **Consistent Tagging**: All imported tests are tagged with "bdd,gherkin"
