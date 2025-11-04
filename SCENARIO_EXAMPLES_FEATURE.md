# Scenario Examples / Parameters Feature

## Overview
The Scenario Examples feature enables **data-driven testing** for test cases. Similar to Gherkin's "Scenario Outline" or "Examples" tables, this allows you to define a single test case that can be executed with multiple sets of parameters.

## Use Cases

### Payment Validation Example
Instead of creating separate test cases for:
- Verify payment with $0 (should fail)
- Verify payment with $10 (should succeed)
- Verify payment with -$10 (should fail)

You create **ONE** test case with scenario examples:

| Amount | Expected Status |
|--------|-----------------|
| $0 | Invalid |
| $10.00 | Valid |
| $-10.00 | Invalid |
| $1000.00 | Valid |

## Implementation

### 1. Database Schema
**Column**: `scenario_examples` (TEXT)
- Stores JSON string
- Format: `{"columns": ["Col1", "Col2"], "rows": [["val1", "val2"], ["val3", "val4"]]}`
- Nullable (optional field)

### 2. Backend (Python/FastAPI)

#### Model
```python
# backend/app/models/models.py
scenario_examples = Column(Text, nullable=True)
```

#### Schema
```python
# backend/app/schemas/schemas.py
scenario_examples: Optional[str] = None
```

#### API - Bulk Upload Validation
```python
# backend/app/api/test_cases.py
if row.get('scenario_examples') and row['scenario_examples'].strip():
    import json
    try:
        json.loads(row['scenario_examples'].strip())
        scenario_examples_value = row['scenario_examples'].strip()
    except json.JSONDecodeError:
        errors.append(f"Row {row_num}: Invalid JSON format in scenario_examples")
        failed_count += 1
        continue
```

### 3. Frontend (React)

#### Component: ScenarioExamplesTable
**File**: `frontend/src/components/ScenarioExamplesTable.js`

Features:
- **Add/Remove Columns**: Dynamic column creation with editable headers
- **Add/Remove Rows**: Dynamic row creation with delete buttons
- **Editable Cells**: All cells are TextField components
- **JSON Serialization**: Converts table data to JSON string for API
- **Clear All**: Reset entire table
- **Empty State**: User-friendly placeholder when no data

Props:
- `value`: JSON string or null
- `onChange`: Callback when data changes

#### Integration in Test Case Form
```javascript
<ScenarioExamplesTable
  value={formData.scenario_examples}
  onChange={(value) => setFormData({ ...formData, scenario_examples: value })}
/>
```

#### Display in View Dialog
```javascript
{selectedTestCase.scenario_examples && (() => {
  try {
    const examples = JSON.parse(selectedTestCase.scenario_examples);
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {examples.columns.map((col, idx) => (
                <TableCell key={idx}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {examples.rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  } catch (e) {
    return null;
  }
})()}
```

### 4. CSV Bulk Upload

#### Format
```csv
...,scenario_examples,...
...,"{""columns"": [""Amount"", ""Status""], ""rows"": [[""$0"", ""Invalid""], [""$10"", ""Valid"]]}",...
```

**Important**:
- Escape quotes with double-double quotes: `""` instead of `"`
- Entire JSON must be wrapped in outer quotes
- Leave empty for test cases without scenarios

#### Example
```json
{
  "columns": ["Amount", "Expected Status"],
  "rows": [
    ["$0", "Invalid"],
    ["$10.00", "Valid"],
    ["$-10.00", "Invalid"],
    ["$1000.00", "Valid"]
  ]
}
```

In CSV:
```csv
"{""columns"": [""Amount"", ""Expected Status""], ""rows"": [[""$0"", ""Invalid""], [""$10.00"", ""Valid""], [""$-10.00"", ""Invalid""], [""$1000.00"", ""Valid""]]}"
```

## User Workflows

### Creating Test Case with Scenarios (UI)

1. **Open Create/Edit Test Case Dialog**
2. **Fill basic fields** (Title, Description, etc.)
3. **Click "Add Column" in Scenario Examples section**
4. **Edit column header** (e.g., "Amount")
5. **Add more columns** as needed (e.g., "Expected Status")
6. **Click "Add Row"**
7. **Enter values** in each cell
8. **Add more rows** for additional scenarios
9. **Submit** - Data is automatically serialized to JSON

### Creating Test Case with Scenarios (CSV)

1. **Download CSV template** from Bulk Upload dialog
2. **Add scenario_examples column** data:
   ```csv
   "{""columns"": [""Amount"", ""Status""], ""rows"": [[""$0"", ""Invalid""], [""$10"", ""Valid""]]}"
   ```
3. **Upload CSV** - Backend validates JSON format
4. **Review results** - Invalid JSON will show error

### Viewing Test Case with Scenarios

1. **Click View icon** on test case
2. **Scroll to "Scenario Examples / Parameters"**
3. **See formatted table** with all parameter sets

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                           User Input                             │
├─────────────────────────────────────────────────────────────────┤
│  UI Form                         CSV Upload                      │
│  ┌───────────────┐              ┌──────────────────────┐        │
│  │ Table Editor  │              │ JSON in CSV cell     │        │
│  │ Add/Edit Rows │              │ {columns:[...], ...} │        │
│  └───────┬───────┘              └──────────┬───────────┘        │
│          │                                 │                     │
│          │ onChange                        │ FormData            │
│          ▼                                 ▼                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         JSON String Serialization                     │       │
│  │  {"columns": ["A", "B"], "rows": [["1", "2"]]}      │       │
│  └──────────────────┬───────────────────────────────────┘       │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      │ API POST/PUT
                      ▼
         ┌────────────────────────────┐
         │  Backend Validation        │
         │  - JSON.parse() check      │
         │  - Store as TEXT           │
         └────────────┬───────────────┘
                      │
                      │ Save to DB
                      ▼
         ┌────────────────────────────┐
         │  Database (SQLite)         │
         │  scenario_examples: TEXT   │
         │  (JSON string)             │
         └────────────┬───────────────┘
                      │
                      │ API GET
                      ▼
         ┌────────────────────────────┐
         │  Frontend Display          │
         │  - JSON.parse()            │
         │  - Render as Table         │
         └────────────────────────────┘
```

## JSON Schema

### Structure
```typescript
interface ScenarioExamples {
  columns: string[];  // Column headers
  rows: string[][];   // 2D array of cell values
}
```

### Validation Rules
1. Must be valid JSON
2. Must have `columns` array (string[])
3. Must have `rows` array (string[][])
4. Each row must have same length as columns
5. Empty columns/rows allowed (will render empty table)

### Examples

#### Valid
```json
{"columns": ["Amount"], "rows": [["$0"], ["$10"]]}
{"columns": ["A", "B", "C"], "rows": [["1", "2", "3"], ["4", "5", "6"]]}
{"columns": [], "rows": []}
```

#### Invalid
```json
{"columns": ["A"]}  // Missing rows
{"rows": [["1"]]}  // Missing columns
{columns: ["A"], rows: []}  // Unquoted keys
{"columns": ["A"], "rows": [["1", "2"]]}  // Row length != column length
```

## Benefits

1. **Reduce Test Case Count**: One test case handles multiple parameter sets
2. **Better Organization**: Related scenarios grouped together
3. **Easier Maintenance**: Update logic in one place
4. **Clear Documentation**: Parameters visible in table format
5. **BDD-Style**: Similar to Gherkin Scenario Outline
6. **Data-Driven Testing**: Supports parameterized test execution

## Future Enhancements

1. **Auto-generate test scripts** using scenario data
2. **Execute each row** as separate test run in execution tracking
3. **Import from Excel** with automatic column detection
4. **Export scenarios** to separate data files
5. **Validate data types** (numeric, email, etc.) per column
6. **Add column types** (dropdown, date picker, etc.)
7. **Link to test data files** instead of inline storage
8. **Support nested JSON** for complex parameter objects

## Technical Notes

### Why JSON in TEXT column?
- SQLite doesn't have native JSON column type
- TEXT allows flexible schema without migrations
- Easy to query and parse in application layer
- Compatible with other databases (MySQL JSON, PostgreSQL JSONB)

### Why not separate tables?
- Scenarios are tightly coupled to test case
- Rarely queried independently
- Simpler data model
- Faster reads (no joins)
- Easier to version control (CSV exports)

### Performance Considerations
- JSON parsing overhead minimal for small datasets
- Consider separate table if scenarios exceed 100+ rows
- Index on test_case_id if querying scenarios directly
- Current implementation optimal for <50 parameter sets per test

## Testing Checklist

- [ ] Create test case with scenarios via UI
- [ ] Edit existing test case to add scenarios
- [ ] Edit existing test case to modify scenarios
- [ ] Delete scenarios from test case
- [ ] Upload CSV with scenarios
- [ ] Upload CSV without scenarios (should work)
- [ ] Upload CSV with invalid JSON (should error)
- [ ] View test case with scenarios
- [ ] Verify JSON format in database
- [ ] Test with empty columns/rows
- [ ] Test with single column
- [ ] Test with 10+ columns
- [ ] Test with 20+ rows
- [ ] Test with special characters in cells
- [ ] Test with very long cell values
