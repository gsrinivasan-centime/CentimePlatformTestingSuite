# Hierarchical Test Case Organization Guide

## Overview

The test management platform now supports **hierarchical organization** of test cases, allowing you to structure tests in a logical, scalable manner that reflects your application's architecture.

## Hierarchy Structure

```
Module → Sub-Module → Feature/Section → Test Case
```

### Example: Account Payable Module

```
Account Payable (Module)
├── Suppliers (Sub-Module)
│   ├── Supplier Profile (Feature)
│   │   ├── TC_AP_SUP_PROF_001: View Supplier Profile Details
│   │   └── TC_AP_SUP_PROF_002: Edit Supplier Profile
│   ├── List View (Feature)
│   │   └── TC_AP_SUP_LIST_001: Display All Suppliers in List
│   └── Create Form (Feature)
│       └── TC_AP_SUP_CREATE_001: Create New Supplier
├── Invoices (Sub-Module)
│   ├── Invoice Creation (Feature)
│   │   └── TC_AP_INV_CREATE_001: Create Unpaid Invoice
│   └── Invoice Approval (Feature)
│       └── TC_AP_INV_APPR_001: Approve Invoice
└── Payments (Sub-Module)
    └── Payment Processing (Feature)
        └── TC_AP_PAY_PROC_001: Process Supplier Payment
```

## Database Schema

### New Fields in TestCase Model

The `test_cases` table has been enhanced with two new fields:

```python
class TestCase(Base):
    # ... existing fields ...
    
    # Hierarchical organization fields
    sub_module = Column(String, nullable=True, index=True)
    feature_section = Column(String, nullable=True, index=True)
```

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `module_id` | Integer (FK) | Links to modules table | 1 (Account Payable) |
| `sub_module` | String | Groups related features | "Suppliers", "Invoices" |
| `feature_section` | String | Specific feature/section | "Supplier Profile", "List View" |

### Indexes

For optimal query performance, the following indexes are created:

- `idx_test_cases_sub_module` - Index on `sub_module`
- `idx_test_cases_feature_section` - Index on `feature_section`
- `idx_test_cases_hierarchy` - Composite index on `(module_id, sub_module, feature_section)`

## API Endpoints

### 1. List Test Cases with Hierarchy Filters

**Endpoint:** `GET /api/test-cases/`

**New Query Parameters:**
- `sub_module` (optional): Filter by sub-module
- `feature_section` (optional): Filter by feature/section

**Example Requests:**

```bash
# Get all test cases in Suppliers sub-module
GET /api/test-cases/?module_id=1&sub_module=Suppliers

# Get all test cases for Supplier Profile feature
GET /api/test-cases/?module_id=1&sub_module=Suppliers&feature_section=Supplier Profile

# Get all UI test cases in Invoice Creation feature
GET /api/test-cases/?module_id=1&sub_module=Invoices&feature_section=Invoice Creation&test_type=UI
```

### 2. Get Hierarchy Structure

**Endpoint:** `GET /api/test-cases/hierarchy/structure`

Returns the complete hierarchical structure for all modules.

**Response Example:**

```json
{
  "Account Payable": {
    "module_id": 1,
    "sub_modules": {
      "Suppliers": {
        "features": ["Supplier Profile", "List View", "Create Form"]
      },
      "Invoices": {
        "features": ["Invoice Creation", "Invoice Approval"]
      }
    }
  }
}
```

### 3. Get Cascading Dropdown Options

**Endpoint:** `GET /api/test-cases/hierarchy/options`

Supports cascading dropdowns in the UI.

**Query Parameters:**
- No parameters: Returns all modules
- `module_id`: Returns sub-modules for that module
- `module_id` + `sub_module`: Returns features for that sub-module

**Example Requests:**

```bash
# Get all modules with counts
GET /api/test-cases/hierarchy/options
Response: [
  {"id": 1, "name": "Account Payable", "sub_module_count": 3}
]

# Get sub-modules for Account Payable
GET /api/test-cases/hierarchy/options?module_id=1
Response: [
  {"name": "Suppliers", "feature_count": 3},
  {"name": "Invoices", "feature_count": 2}
]

# Get features for Suppliers sub-module
GET /api/test-cases/hierarchy/options?module_id=1&sub_module=Suppliers
Response: [
  {"name": "Supplier Profile", "test_count": 2},
  {"name": "List View", "test_count": 1}
]
```

## Frontend Integration

### Creating a Test Case with Hierarchy

When creating a test case in the UI, users can now specify:

1. **Module** (existing dropdown)
2. **Sub-Module** (new cascading dropdown)
3. **Feature/Section** (new cascading dropdown)

**Form Flow:**
```
1. User selects Module: "Account Payable"
   → API call: GET /api/test-cases/hierarchy/options?module_id=1
   → Sub-Module dropdown populated with ["Suppliers", "Invoices", "Payments"]

2. User selects Sub-Module: "Suppliers"
   → API call: GET /api/test-cases/hierarchy/options?module_id=1&sub_module=Suppliers
   → Feature dropdown populated with ["Supplier Profile", "List View", "Create Form"]

3. User selects Feature: "Supplier Profile"
   → Test case is created with:
     - module_id: 1
     - sub_module: "Suppliers"
     - feature_section: "Supplier Profile"
```

### Example React Component (Cascading Dropdowns)

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function TestCaseForm() {
  const [modules, setModules] = useState([]);
  const [subModules, setSubModules] = useState([]);
  const [features, setFeatures] = useState([]);
  
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedSubModule, setSelectedSubModule] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');

  // Load modules on mount
  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    const response = await api.get('/test-cases/hierarchy/options');
    setModules(response.data);
  };

  const loadSubModules = async (moduleId) => {
    const response = await api.get(`/test-cases/hierarchy/options?module_id=${moduleId}`);
    setSubModules(response.data);
    setFeatures([]); // Reset features
  };

  const loadFeatures = async (moduleId, subModule) => {
    const response = await api.get(
      `/test-cases/hierarchy/options?module_id=${moduleId}&sub_module=${subModule}`
    );
    setFeatures(response.data);
  };

  const handleModuleChange = (e) => {
    const moduleId = e.target.value;
    setSelectedModule(moduleId);
    setSelectedSubModule('');
    setSelectedFeature('');
    loadSubModules(moduleId);
  };

  const handleSubModuleChange = (e) => {
    const subModule = e.target.value;
    setSelectedSubModule(subModule);
    setSelectedFeature('');
    loadFeatures(selectedModule, subModule);
  };

  return (
    <form>
      {/* Module Dropdown */}
      <select value={selectedModule} onChange={handleModuleChange}>
        <option value="">Select Module</option>
        {modules.map(m => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.sub_module_count} sub-modules)
          </option>
        ))}
      </select>

      {/* Sub-Module Dropdown */}
      {selectedModule && (
        <select value={selectedSubModule} onChange={handleSubModuleChange}>
          <option value="">Select Sub-Module</option>
          {subModules.map(sm => (
            <option key={sm.name} value={sm.name}>
              {sm.name} ({sm.feature_count} features)
            </option>
          ))}
        </select>
      )}

      {/* Feature Dropdown */}
      {selectedSubModule && (
        <select value={selectedFeature} onChange={(e) => setSelectedFeature(e.target.value)}>
          <option value="">Select Feature/Section</option>
          {features.map(f => (
            <option key={f.name} value={f.name}>
              {f.name} ({f.test_count} tests)
            </option>
          ))}
        </select>
      )}

      {/* Other form fields... */}
    </form>
  );
}
```

## Test Data Examples

The `test_suite/fixtures/test_data.py` file now includes `TEST_CASE_HIERARCHY` with comprehensive examples:

```python
from test_suite.fixtures.test_data import TEST_CASE_HIERARCHY, get_test_case_by_hierarchy

# Get a specific test case by hierarchy path
test_case = get_test_case_by_hierarchy(
    module="account_payable",
    sub_module="suppliers",
    feature="supplier_profile",
    test_index=0
)

# Get all test cases for a sub-module
supplier_tests = get_test_cases_by_sub_module("account_payable", "suppliers")

# Get all test cases for a feature
profile_tests = get_test_cases_by_feature("account_payable", "suppliers", "supplier_profile")
```

## Naming Conventions

### Test ID Format

Use a hierarchical format for test IDs:

```
TC_<MODULE>_<SUBMODULE>_<FEATURE>_<NUMBER>
```

**Examples:**
- `TC_AP_SUP_PROF_001` - Account Payable → Suppliers → Profile → Test 001
- `TC_AP_INV_CREATE_001` - Account Payable → Invoices → Creation → Test 001
- `TC_AR_CUST_LIST_001` - Account Receivable → Customers → List → Test 001

### Module Abbreviations

| Module | Abbreviation |
|--------|--------------|
| Account Payable | AP |
| Account Receivable | AR |
| Cash Flow | CF |
| Banking | BK |

### Sub-Module Examples

| Module | Sub-Modules |
|--------|-------------|
| Account Payable | Suppliers, Invoices, Payments, Reports |
| Account Receivable | Customers, Outstanding Invoices, Received Payments, Aging Reports |
| Cash Flow | Forecasts, Scenarios, Reports, Settings |
| Banking | Bank Accounts, Transactions, Reconciliation, Integration |

## Migration

### Running the Migration

The migration script adds the new columns to the existing database:

```bash
# Run migration
python3 backend/migrate_add_hierarchy.py

# Show current schema
python3 backend/migrate_add_hierarchy.py --show-schema

# Rollback if needed
python3 backend/migrate_add_hierarchy.py --rollback <backup_path>
```

### Updating Existing Test Cases

Existing test cases will have `NULL` values for `sub_module` and `feature_section`. You can update them:

1. **Manually via UI**: Edit each test case and select appropriate hierarchy
2. **Bulk update via API**: Use PATCH requests
3. **SQL script**: Direct database update

**Example SQL Update:**

```sql
-- Update all supplier-related test cases
UPDATE test_cases 
SET sub_module = 'Suppliers', 
    feature_section = 'Supplier Profile'
WHERE test_id LIKE 'TC_AP_SUP_PROF%';

-- Update invoice-related test cases
UPDATE test_cases 
SET sub_module = 'Invoices', 
    feature_section = 'Invoice Creation'
WHERE test_id LIKE 'TC_AP_INV_CREATE%';
```

## Pytest Integration

### Organizing Test Files by Hierarchy

Match your test file structure to the hierarchy:

```
test_suite/
├── ui_tests/
│   ├── account_payable/
│   │   ├── suppliers/
│   │   │   ├── test_supplier_profile.py
│   │   │   ├── test_supplier_list.py
│   │   │   └── test_supplier_create.py
│   │   ├── invoices/
│   │   │   ├── test_invoice_creation.py
│   │   │   └── test_invoice_approval.py
│   │   └── payments/
│   │       └── test_payment_processing.py
│   └── account_receivable/
│       └── customers/
│           └── test_customer_profile.py
```

### Using Markers with Hierarchy

Combine pytest markers to reflect hierarchy:

```python
import pytest

@pytest.mark.ui
@pytest.mark.account_payable
@pytest.mark.suppliers
@pytest.mark.supplier_profile
class TestSupplierProfile:
    """
    Test ID: TC_AP_SUP_PROF_001
    Module: Account Payable
    Sub-Module: Suppliers
    Feature: Supplier Profile
    """
    
    def test_view_supplier_profile(self):
        """Verify supplier profile displays correctly"""
        pass
```

### Running Tests by Hierarchy

```bash
# Run all Account Payable tests
pytest -m account_payable

# Run all Supplier tests
pytest -m suppliers

# Run all Supplier Profile tests
pytest -m supplier_profile

# Run specific hierarchy level
pytest test_suite/ui_tests/account_payable/suppliers/test_supplier_profile.py
```

## Benefits of Hierarchical Organization

### 1. **Scalability**
- Handle thousands of test cases with clear organization
- Easy to navigate and find specific tests
- Logical grouping reduces cognitive load

### 2. **Maintenance**
- Easier to update tests when features change
- Clear ownership and responsibility boundaries
- Reduces duplication across similar features

### 3. **Reporting**
- Generate reports by module, sub-module, or feature
- Track test coverage at different levels
- Identify gaps in test coverage

### 4. **Team Collaboration**
- Clear structure for distributed teams
- Easy to assign test creation to specific areas
- Better communication about test scope

### 5. **Filtering & Search**
- Filter test cases by any level of hierarchy
- Quick access to relevant tests
- Efficient test execution planning

## Best Practices

### 1. **Consistent Naming**
- Use clear, descriptive names for sub-modules and features
- Follow established naming conventions
- Keep names concise but meaningful

### 2. **Logical Grouping**
- Group related functionality together
- Align with application's feature structure
- Consider user workflows when organizing

### 3. **Documentation**
- Document the hierarchy structure for your project
- Include examples in your test plan
- Keep the structure visible to all team members

### 4. **Regular Reviews**
- Review and refactor hierarchy as application evolves
- Consolidate or split sub-modules as needed
- Maintain consistency across modules

### 5. **Backward Compatibility**
- Existing test cases without hierarchy still work
- Gradually migrate old tests to new structure
- Use migration scripts for bulk updates

## Example: Adding a New Feature

When a new feature is introduced, follow this workflow:

### Scenario: New "Supplier Payment Terms" feature in Account Payable

1. **Identify Hierarchy:**
   - Module: Account Payable
   - Sub-Module: Suppliers
   - Feature: Payment Terms (NEW)

2. **Create Folder Structure:**
   ```bash
   mkdir -p test_suite/ui_tests/account_payable/suppliers/payment_terms
   ```

3. **Create Test File:**
   ```python
   # test_suite/ui_tests/account_payable/suppliers/payment_terms/test_payment_terms.py
   
   import pytest
   
   @pytest.mark.ui
   @pytest.mark.account_payable
   @pytest.mark.suppliers
   @pytest.mark.payment_terms
   class TestSupplierPaymentTerms:
       """
       Test ID: TC_AP_SUP_TERMS_001
       Module: Account Payable
       Sub-Module: Suppliers
       Feature: Payment Terms
       """
       
       def test_add_payment_terms(self):
           """Verify payment terms can be added to supplier"""
           pass
   ```

4. **Create Test Case in DB:**
   ```python
   {
       "test_id": "TC_AP_SUP_TERMS_001",
       "title": "Add Payment Terms to Supplier",
       "description": "Verify payment terms can be configured for supplier",
       "test_type": "UI",
       "module_id": 1,  # Account Payable
       "sub_module": "Suppliers",
       "feature_section": "Payment Terms",
       "automated_script_path": "test_suite/ui_tests/account_payable/suppliers/payment_terms/test_payment_terms.py"
   }
   ```

5. **Update Test Data:**
   ```python
   # Add to test_suite/fixtures/test_data.py
   TEST_CASE_HIERARCHY["account_payable"]["sub_modules"]["suppliers"]["features"]["payment_terms"] = {
       "name": "Payment Terms",
       "test_cases": [...]
   }
   ```

## Summary

The hierarchical organization feature provides:

- ✅ **4-level hierarchy**: Module → Sub-Module → Feature → Test Case
- ✅ **Database support**: New indexed columns for performance
- ✅ **API endpoints**: Full filtering and cascading dropdown support
- ✅ **Migration script**: Safe database upgrade with backup
- ✅ **Test data examples**: Comprehensive fixtures
- ✅ **Frontend ready**: Cascading dropdown design
- ✅ **Backward compatible**: Existing tests continue to work

This structure supports scaling from hundreds to thousands of test cases while maintaining clarity and organization.
