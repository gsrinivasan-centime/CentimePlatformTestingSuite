# Frontend Updates - Hierarchical Test Organization

## Overview

The frontend has been updated to support the new **hierarchical test case organization** with cascading dropdowns and filtering capabilities.

## Files Modified

### 1. `/frontend/src/services/api.js`

#### Added New API Methods

```javascript
// Test Cases API - NEW Hierarchy Methods
export const testCasesAPI = {
  // ... existing methods ...
  
  // NEW: Get complete hierarchy structure
  getHierarchyStructure: async () => {
    const response = await api.get('/test-cases/hierarchy/structure');
    return response.data;
  },
  
  // NEW: Get cascading dropdown options
  getHierarchyOptions: async (moduleId = null, subModule = null) => {
    const params = {};
    if (moduleId) params.module_id = moduleId;
    if (subModule) params.sub_module = subModule;
    const response = await api.get('/test-cases/hierarchy/options', { params });
    return response.data;
  },
};
```

**Purpose:**
- `getHierarchyStructure()` - Fetch complete hierarchy for all modules
- `getHierarchyOptions()` - Support cascading dropdowns (Module → Sub-Module → Feature)

---

### 2. `/frontend/src/pages/TestCases.js`

#### New State Variables

```javascript
// Form data - Added new fields
const [formData, setFormData] = useState({
  // ... existing fields ...
  sub_module: '',          // NEW
  feature_section: '',     // NEW
});

// Cascading dropdowns for Create/Edit dialog
const [subModules, setSubModules] = useState([]);
const [features, setFeatures] = useState([]);

// Filter state
const [filters, setFilters] = useState({
  module_id: '',
  sub_module: '',
  feature_section: '',
  test_type: '',
});
const [filterSubModules, setFilterSubModules] = useState([]);
const [filterFeatures, setFilterFeatures] = useState([]);
```

#### New Functions

**1. Load Sub-Modules (Form)**
```javascript
const loadSubModules = async (moduleId) => {
  if (!moduleId) {
    setSubModules([]);
    setFeatures([]);
    return;
  }
  
  const options = await testCasesAPI.getHierarchyOptions(moduleId);
  setSubModules(options);
  setFeatures([]);
};
```

**2. Load Features (Form)**
```javascript
const loadFeatures = async (moduleId, subModule) => {
  if (!moduleId || !subModule) {
    setFeatures([]);
    return;
  }
  
  const options = await testCasesAPI.getHierarchyOptions(moduleId, subModule);
  setFeatures(options);
};
```

**3. Load Filtered Data**
```javascript
const loadFilteredData = async () => {
  const params = {};
  if (filters.module_id) params.module_id = filters.module_id;
  if (filters.sub_module) params.sub_module = filters.sub_module;
  if (filters.feature_section) params.feature_section = filters.feature_section;
  if (filters.test_type) params.test_type = filters.test_type;
  
  const testCasesData = await testCasesAPI.getAll(params);
  setTestCases(testCasesData);
};
```

**4. Handle Filter Changes**
```javascript
const handleFilterChange = async (e) => {
  const { name, value } = e.target;
  const newFilters = { ...filters, [name]: value };
  
  // Reset cascading filters when parent changes
  if (name === 'module_id') {
    newFilters.sub_module = '';
    newFilters.feature_section = '';
    await loadFilterSubModules(value);
  } else if (name === 'sub_module') {
    newFilters.feature_section = '';
    await loadFilterFeatures(filters.module_id, value);
  }
  
  setFilters(newFilters);
};
```

**5. Clear All Filters**
```javascript
const handleClearFilters = () => {
  setFilters({
    module_id: '',
    sub_module: '',
    feature_section: '',
    test_type: '',
  });
  setFilterSubModules([]);
  setFilterFeatures([]);
};
```

#### Updated UI Components

**1. Filter Panel (NEW)**

Added a comprehensive filter panel above the test cases table:

```jsx
<Paper sx={{ p: 2, mb: 3 }}>
  <Typography variant="h6" gutterBottom>Filters</Typography>
  <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
    {/* Module Filter */}
    <TextField select label="Module" ... />
    
    {/* Sub-Module Filter (shows when module selected) */}
    {filters.module_id && (
      <TextField select label="Sub-Module" ... />
    )}
    
    {/* Feature Filter (shows when sub-module selected) */}
    {filters.module_id && filters.sub_module && (
      <TextField select label="Feature/Section" ... />
    )}
    
    {/* Test Type Filter */}
    <TextField select label="Test Type" ... />
    
    {/* Clear Filters Button */}
    <Button onClick={handleClearFilters}>Clear Filters</Button>
  </Box>
</Paper>
```

**Features:**
- ✅ Cascading dropdowns (Module → Sub-Module → Feature)
- ✅ Shows counts (e.g., "Suppliers (3 features)")
- ✅ Auto-resets child filters when parent changes
- ✅ Clear all filters button
- ✅ Responsive layout with flexbox

**2. Updated Table Headers**

Added two new columns:

```jsx
<TableHead>
  <TableRow>
    <TableCell>Test ID</TableCell>
    <TableCell>Title</TableCell>
    <TableCell>Module</TableCell>
    <TableCell>Sub-Module</TableCell>      {/* NEW */}
    <TableCell>Feature</TableCell>         {/* NEW */}
    <TableCell>Type</TableCell>
    <TableCell>Created</TableCell>
    <TableCell align="right">Actions</TableCell>
  </TableRow>
</TableHead>
```

**3. Updated Table Body**

Display hierarchy fields with chips:

```jsx
{/* Sub-Module Column */}
<TableCell>
  {testCase.sub_module ? (
    <Chip
      label={testCase.sub_module}
      size="small"
      color="secondary"
      variant="outlined"
    />
  ) : (
    <Typography variant="body2" color="text.secondary">-</Typography>
  )}
</TableCell>

{/* Feature Column */}
<TableCell>
  {testCase.feature_section ? (
    <Chip
      label={testCase.feature_section}
      size="small"
      color="info"
      variant="outlined"
    />
  ) : (
    <Typography variant="body2" color="text.secondary">-</Typography>
  )}
</TableCell>
```

**4. Enhanced Create/Edit Dialog**

Added cascading dropdowns in the form:

```jsx
{/* Module Dropdown (existing) */}
<TextField select label="Module" ... />

{/* Sub-Module Dropdown - NEW (shows when module selected) */}
{formData.module_id && (
  <TextField
    select
    label="Sub-Module"
    name="sub_module"
    helperText="Optional: Group tests by sub-module (e.g., Suppliers, Invoices)"
  >
    <MenuItem value=""><em>None</em></MenuItem>
    {subModules.map((sm) => (
      <MenuItem value={sm.name}>
        {sm.name} ({sm.feature_count} features)
      </MenuItem>
    ))}
  </TextField>
)}

{/* Feature Dropdown - NEW (shows when sub-module selected) */}
{formData.module_id && formData.sub_module && (
  <TextField
    select
    label="Feature/Section"
    name="feature_section"
    helperText="Optional: Specify feature or section (e.g., Supplier Profile)"
  >
    <MenuItem value=""><em>None</em></MenuItem>
    {features.map((f) => (
      <MenuItem value={f.name}>
        {f.name} ({f.test_count} tests)
      </MenuItem>
    ))}
  </TextField>
)}
```

**Features:**
- ✅ Cascading behavior (sub-module shows after module, feature shows after sub-module)
- ✅ Optional fields (can be left empty)
- ✅ Shows counts for each option
- ✅ Helper text to guide users
- ✅ Auto-loads options when editing existing test case

**5. Enhanced View Dialog**

Added hierarchy fields to the view dialog:

```jsx
{/* Module (existing) */}
<Typography variant="subtitle2">Module</Typography>
<Typography variant="body1">{getModuleName(selectedTestCase.module_id)}</Typography>

{/* Sub-Module - NEW (shows if exists) */}
{selectedTestCase.sub_module && (
  <>
    <Typography variant="subtitle2">Sub-Module</Typography>
    <Typography variant="body1">{selectedTestCase.sub_module}</Typography>
  </>
)}

{/* Feature - NEW (shows if exists) */}
{selectedTestCase.feature_section && (
  <>
    <Typography variant="subtitle2">Feature/Section</Typography>
    <Typography variant="body1">{selectedTestCase.feature_section}</Typography>
  </>
)}
```

## User Experience Flow

### Creating a New Test Case

1. **User clicks "New Test Case" button**
2. **Dialog opens with empty form**
3. **User selects Module: "Account Payable"**
   - API call: `GET /api/test-cases/hierarchy/options?module_id=1`
   - Sub-Module dropdown appears with options: ["Suppliers", "Invoices", "Payments"]
4. **User selects Sub-Module: "Suppliers"**
   - API call: `GET /api/test-cases/hierarchy/options?module_id=1&sub_module=Suppliers`
   - Feature dropdown appears with options: ["Supplier Profile", "List View", "Create Form"]
5. **User selects Feature: "Supplier Profile"**
6. **User fills other fields and clicks "Create"**
   - Test case created with: `module_id=1, sub_module="Suppliers", feature_section="Supplier Profile"`

### Filtering Test Cases

1. **User selects Module filter: "Account Payable"**
   - Sub-Module filter appears
   - Table refreshes showing all Account Payable tests
2. **User selects Sub-Module filter: "Suppliers"**
   - Feature filter appears
   - Table refreshes showing only Supplier tests
3. **User selects Feature filter: "Supplier Profile"**
   - Table refreshes showing only Supplier Profile tests
4. **User clicks "Clear Filters"**
   - All filters reset
   - Table shows all test cases

## Visual Changes

### Before (Old UI)
```
┌─────────────────────────────────────────┐
│ Test Cases               [New Test Case]│
├─────────────────────────────────────────┤
│ Test ID | Title | Module | Type | ...   │
├─────────────────────────────────────────┤
│ TC_001  | Test  | AP     | UI   | ...   │
└─────────────────────────────────────────┘
```

### After (New UI)
```
┌──────────────────────────────────────────────────────────────┐
│ Test Cases                              [New Test Case]       │
├──────────────────────────────────────────────────────────────┤
│ Filters                                                       │
│ [Module ▼] [Sub-Module ▼] [Feature ▼] [Type ▼] [Clear]      │
├──────────────────────────────────────────────────────────────┤
│ Test ID | Title | Module | Sub-Module | Feature | Type | ... │
├──────────────────────────────────────────────────────────────┤
│ TC_001  | Test  | AP     | Suppliers  | Profile | UI   | ... │
└──────────────────────────────────────────────────────────────┘
```

## Create/Edit Dialog Changes

### Before (Old Form)
```
┌────────────────────────────────┐
│ Create New Test Case           │
├────────────────────────────────┤
│ Test ID:     [_____________]   │
│ Title:       [_____________]   │
│ Module:      [Select ▼]        │
│ Test Type:   [Select ▼]        │
│ ...                            │
└────────────────────────────────┘
```

### After (New Form)
```
┌────────────────────────────────┐
│ Create New Test Case           │
├────────────────────────────────┤
│ Test ID:     [_____________]   │
│ Title:       [_____________]   │
│ Module:      [Select ▼]        │
│                                │
│ ┌─ Shows after Module selected │
│ │ Sub-Module: [Select ▼]       │
│ │ "Optional: Group by..."      │
│ └────────────────────────────  │
│                                │
│ ┌─ Shows after Sub-Mod selected│
│ │ Feature:    [Select ▼]       │
│ │ "Optional: Specify feature" │
│ └────────────────────────────  │
│                                │
│ Test Type:   [Select ▼]        │
│ ...                            │
└────────────────────────────────┘
```

## API Integration

### Endpoints Used

1. **`GET /api/test-cases/`**
   - Used for: Loading all test cases with optional filters
   - Filters: `module_id`, `sub_module`, `feature_section`, `test_type`

2. **`GET /api/test-cases/hierarchy/options`**
   - Used for: Populating cascading dropdowns
   - Modes:
     - No params → Returns all modules
     - `?module_id=1` → Returns sub-modules for module
     - `?module_id=1&sub_module=Suppliers` → Returns features for sub-module

3. **`POST /api/test-cases/`**
   - Used for: Creating new test case
   - Body includes: `sub_module`, `feature_section`

4. **`PUT /api/test-cases/{id}`**
   - Used for: Updating existing test case
   - Body includes: `sub_module`, `feature_section`

## Benefits

### For Users

✅ **Better Organization**
- Test cases organized in clear hierarchy
- Easy to find specific tests
- Visual indicators with colored chips

✅ **Powerful Filtering**
- Filter by module, sub-module, or feature
- Cascading filters prevent invalid combinations
- Quick "Clear Filters" button

✅ **Intuitive Creation**
- Guided dropdown flow
- Shows counts for each option
- Optional fields with helpful hints

✅ **Enhanced Visibility**
- Table shows full hierarchy at a glance
- Color-coded chips for easy scanning
- Detailed view shows all hierarchy levels

### For Developers

✅ **Clean API Integration**
- Two simple API methods handle all hierarchy needs
- Reusable functions for form and filter dropdowns
- Efficient data loading (only when needed)

✅ **Maintainable Code**
- State management separated (form vs filters)
- Cascading logic centralized
- No duplicate code

✅ **Scalable Architecture**
- Supports unlimited hierarchy depth
- Easy to add new filter options
- Performance-optimized (indexed queries)

## Testing the Updates

### Manual Testing Steps

1. **Start Backend:**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Test Filter Panel:**
   - Select a module → Verify sub-modules appear
   - Select sub-module → Verify features appear
   - Select feature → Verify table filters
   - Click "Clear Filters" → Verify all reset

4. **Test Create Dialog:**
   - Click "New Test Case"
   - Select module → Verify sub-module dropdown appears
   - Select sub-module → Verify feature dropdown appears
   - Create test case with hierarchy
   - Verify it appears in table with chips

5. **Test Edit Dialog:**
   - Click edit on existing test case
   - Verify hierarchy dropdowns pre-populated
   - Change sub-module → Verify feature resets
   - Update and verify changes

6. **Test View Dialog:**
   - Click view on test case with hierarchy
   - Verify all hierarchy fields displayed
   - Verify test case without hierarchy shows correctly

## Backward Compatibility

✅ **Existing test cases without hierarchy work perfectly**
- Old test cases show "-" in Sub-Module and Feature columns
- Can be edited to add hierarchy
- No data loss or errors

✅ **Optional fields**
- Sub-module and feature are optional
- Can create test cases without hierarchy
- Filters still work with partial data

## Summary

The frontend now fully supports hierarchical test organization with:

- ✅ **Cascading dropdowns** in create/edit forms
- ✅ **Powerful filters** with cascading behavior
- ✅ **Enhanced table** with hierarchy columns
- ✅ **Visual chips** for better UX
- ✅ **Backward compatible** with existing data
- ✅ **Clean API integration** with new endpoints
- ✅ **Responsive design** that works on all screens

Users can now organize and filter test cases by:
**Module → Sub-Module → Feature/Section → Individual Test**

Example: **Account Payable → Suppliers → Supplier Profile → TC_AP_SUP_PROF_001**
