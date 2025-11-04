# Additional Tags Feature Implementation

## Overview
Added support for multiple categorization tags (smoke, regression, sanity, integration, e2e, performance) to test cases, in addition to the existing tag field used for test ID generation.

## Changes Made

### 1. Database Schema
**File**: `test_management.db`
- Added `tags` column to `test_cases` table (VARCHAR, nullable)
- Migration executed: `ALTER TABLE test_cases ADD COLUMN tags VARCHAR;`

### 2. Backend Models
**File**: `backend/app/models/models.py`
- Added `tags` column to `TestCase` model:
  ```python
  tags = Column(String, nullable=True)  # e.g., "smoke,regression" or "smoke,sanity"
  ```

### 3. Backend Schemas
**File**: `backend/app/schemas/schemas.py`
- Added `tags` field to `TestCaseBase`:
  ```python
  tags: Optional[str] = None  # NEW: Additional tags like smoke, regression (comma-separated)
  ```
- Added `tags` field to `TestCaseUpdate`:
  ```python
  tags: Optional[str] = None  # NEW
  ```

### 4. Bulk Upload API
**File**: `backend/app/api/test_cases.py`
- Updated bulk upload endpoint to handle tags field:
  ```python
  # Handle tags (additional categorization tags like smoke, regression, etc.)
  tags_value = None
  if row.get('tags') and row['tags'].strip():
      tags_value = row['tags'].strip()
  ```
- Updated CSV format documentation in docstring to include tags column
- Modified TestCaseCreate instantiation to include tags field

### 5. Frontend Form
**File**: `frontend/src/pages/TestCases.js`

#### State Updates:
- Added `tags: []` to formData initial state
- Modified as array for Autocomplete component usage

#### Imports:
- Added `Autocomplete` to Material-UI imports

#### Create/Edit Dialog:
- Added Autocomplete component for tags input:
  - Multiple selection enabled
  - Free-form entry (freeSolo) for custom tags
  - Predefined options: smoke, regression, sanity, integration, e2e, performance
  - Displays selected tags as chips
  - Positioned after "Test Case Tag" field

#### Data Handling:
- `handleOpenDialog`: Converts tags from comma-separated string to array when editing
- `handleSubmit`: Converts tags array back to comma-separated string before API submission
- Both new and edit flows include tags initialization

### 6. Frontend Display
**File**: `frontend/src/pages/TestCases.js`

#### Test Cases Table:
- Added "Tags" column header (180px width)
- Added tags cell displaying chips with color coding:
  - smoke → red (error)
  - regression → blue (primary)
  - sanity → green (success)
  - integration → orange (warning)
  - e2e → light blue (info)
  - others → grey (default)
- Updated table minWidth from 1320px to 1500px

#### View Dialog:
- Added "Additional Tags" section
- Displays tags as colored chips with same color scheme as table
- Only shown if test case has tags

### 7. CSV Template
**File**: `test_cases_bulk_upload_template.csv`
- Updated header to include `tags` column (between `tag` and `module_id`)
- Updated all 9 data rows with varied tags examples:
  - Row 1: "smoke,regression"
  - Row 2: "regression,integration"
  - Row 3: "smoke,e2e"
  - Row 4: "regression"
  - Row 5: "regression,sanity"
  - Row 6: "smoke,sanity"
  - Row 7: "regression"
  - Row 8: "regression,performance"
  - Row 9: "smoke,integration"

#### Template Download:
- Updated `handleDownloadTemplate` to include tags column in header
- Added sample tags value: "smoke,regression"

### 8. Documentation
**File**: `BULK_UPLOAD_GUIDE.md`
- Added `tags` to Optional Columns table with description
- Updated example CSV row to include tags column
- Added new Important Note (#2) explaining difference between `tag` and `tags`:
  - `tag`: singular, required, for test ID generation (ui/api/hybrid)
  - `tags`: plural, optional, for categorization (smoke/regression/etc.)
  - Format: comma-separated values in quotes

## How to Use

### Creating Test Cases with Tags (UI)
1. Open Create/Edit Test Case dialog
2. Select or type tags in the "Additional Tags" field
3. Tags will appear as chips that can be removed
4. Common tags are available in dropdown: smoke, regression, sanity, integration, e2e, performance
5. Custom tags can be typed and added

### Bulk Upload with Tags
1. Add `tags` column to your CSV file (between `tag` and `module_id`)
2. Enter comma-separated tag values (e.g., "smoke,regression")
3. Leave empty if no additional tags needed
4. Upload the CSV file

### Viewing Tags
- **Table View**: Tags displayed as colored chips in dedicated column
- **Detail View**: Tags shown in "Additional Tags" section with colored chips
- **Color Coding**:
  - Red (smoke)
  - Blue (regression)
  - Green (sanity)
  - Orange (integration)
  - Light Blue (e2e)
  - Purple (performance)
  - Grey (custom tags)

## Data Format

### Frontend (Form):
- Stored as array: `['smoke', 'regression']`
- Used by Autocomplete component

### Backend/Database:
- Stored as comma-separated string: `"smoke,regression"`
- Converted during API submission/retrieval

## Backward Compatibility
- Existing test cases without tags will display "-" in the Tags column
- Tags field is optional in both UI and CSV upload
- No breaking changes to existing functionality

## Testing Checklist
- [ ] Create test case with tags via UI
- [ ] Edit test case to add/remove tags via UI
- [ ] Upload CSV with tags column
- [ ] Upload CSV without tags column (should work)
- [ ] View test case with tags in table
- [ ] View test case with tags in detail dialog
- [ ] Verify tags are stored correctly in database
- [ ] Test with empty tags field
- [ ] Test with single tag
- [ ] Test with multiple tags
- [ ] Test with custom tags (not in predefined list)

## Future Enhancements
1. Add filter by tags in test cases list
2. Add tag statistics in dashboard
3. Create tag management page for consistent tag naming
4. Add tag-based test execution filtering
5. Generate reports grouped by tags
