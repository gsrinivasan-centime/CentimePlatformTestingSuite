# Quick Reference: Hierarchical Test Organization

## Structure

```
Module → Sub-Module → Feature/Section → Test Case
```

## Example: Adding a Test for "Supplier Profile" Feature

### 1. Create Test Case in Database

```json
{
  "test_id": "TC_AP_SUP_PROF_001",
  "title": "View Supplier Profile Details",
  "description": "Verify that supplier profile displays all details correctly",
  "test_type": "UI",
  "module_id": 1,
  "sub_module": "Suppliers",
  "feature_section": "Supplier Profile",
  "automated_script_path": "test_suite/ui_tests/account_payable/suppliers/test_supplier_profile.py"
}
```

### 2. Create Test File

**File:** `test_suite/ui_tests/account_payable/suppliers/test_supplier_profile.py`

```python
import pytest
from test_suite.fixtures.test_data import VALID_USERS, SUPPLIERS

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
    
    def test_view_supplier_profile(self, logged_in_driver, navigation, suppliers_page):
        """
        Verify that supplier profile displays all details correctly
        
        Hierarchy: Account Payable → Suppliers → Supplier Profile
        """
        # Navigate to suppliers
        navigation.go_to_suppliers()
        
        # Create a supplier
        supplier_data = SUPPLIERS["valid_supplier"]
        suppliers_page.create_supplier(supplier_data)
        
        # View profile
        suppliers_page.click_supplier(supplier_data["name"])
        
        # Verify profile details
        assert suppliers_page.is_supplier_detail_visible()
        assert supplier_data["name"] in suppliers_page.get_supplier_name()
```

### 3. Update Test Data (Optional)

**File:** `test_suite/fixtures/test_data.py`

```python
# Add to TEST_CASE_HIERARCHY
TEST_CASE_HIERARCHY["account_payable"]["sub_modules"]["suppliers"]["features"]["supplier_profile"]["test_cases"].append({
    "test_id": "TC_AP_SUP_PROF_001",
    "title": "View Supplier Profile Details",
    "description": "Verify that supplier profile displays all details correctly",
    "test_type": "UI",
    "sub_module": "Suppliers",
    "feature_section": "Supplier Profile"
})
```

## API Usage

### Get All Supplier Profile Tests

```bash
curl "http://localhost:8000/api/test-cases/?module_id=1&sub_module=Suppliers&feature_section=Supplier%20Profile"
```

### Get Hierarchy Structure

```bash
curl http://localhost:8000/api/test-cases/hierarchy/structure
```

### Get Cascading Options

```bash
# Get all modules
curl http://localhost:8000/api/test-cases/hierarchy/options

# Get sub-modules for Account Payable (module_id=1)
curl http://localhost:8000/api/test-cases/hierarchy/options?module_id=1

# Get features for Suppliers sub-module
curl "http://localhost:8000/api/test-cases/hierarchy/options?module_id=1&sub_module=Suppliers"
```

## Test ID Format

```
TC_<MODULE_ABBR>_<SUBMODULE_ABBR>_<FEATURE_ABBR>_<NUMBER>
```

### Examples

| Test ID | Hierarchy Path |
|---------|---------------|
| TC_AP_SUP_PROF_001 | Account Payable → Suppliers → Supplier Profile → Test 001 |
| TC_AP_INV_CREATE_001 | Account Payable → Invoices → Invoice Creation → Test 001 |
| TC_AR_CUST_LIST_001 | Account Receivable → Customers → Customer List → Test 001 |

## Running Tests by Hierarchy

```bash
# Run all Account Payable tests
pytest -m account_payable

# Run all Supplier tests
pytest -m suppliers

# Run all Supplier Profile tests
pytest -m supplier_profile

# Run specific feature tests
pytest test_suite/ui_tests/account_payable/suppliers/test_supplier_profile.py

# Run with multiple markers
pytest -m "account_payable and suppliers and supplier_profile"
```

## Common Hierarchies

### Account Payable
```
Account Payable
├── Suppliers
│   ├── Supplier Profile
│   ├── List View
│   └── Create Form
├── Invoices
│   ├── Invoice Creation
│   └── Invoice Approval
└── Payments
    └── Payment Processing
```

### Account Receivable
```
Account Receivable
├── Customers
│   ├── Customer Profile
│   ├── List View
│   └── Create Form
├── Outstanding Invoices
│   ├── Invoice List
│   └── Payment Tracking
└── Received Payments
    └── Payment History
```

## Helper Functions

```python
from test_suite.fixtures.test_data import (
    get_test_case_by_hierarchy,
    get_test_cases_by_sub_module,
    get_test_cases_by_feature
)

# Get specific test case
test = get_test_case_by_hierarchy(
    module="account_payable",
    sub_module="suppliers",
    feature="supplier_profile",
    test_index=0
)

# Get all tests in Suppliers sub-module
supplier_tests = get_test_cases_by_sub_module("account_payable", "suppliers")

# Get all tests in Supplier Profile feature
profile_tests = get_test_cases_by_feature("account_payable", "suppliers", "supplier_profile")
```

## Database Queries

### Filter by Sub-Module

```sql
SELECT * FROM test_cases 
WHERE module_id = 1 
  AND sub_module = 'Suppliers';
```

### Filter by Feature

```sql
SELECT * FROM test_cases 
WHERE module_id = 1 
  AND sub_module = 'Suppliers' 
  AND feature_section = 'Supplier Profile';
```

### Get Hierarchy Counts

```sql
SELECT 
    sub_module,
    feature_section,
    COUNT(*) as test_count
FROM test_cases
WHERE module_id = 1
GROUP BY sub_module, feature_section
ORDER BY sub_module, feature_section;
```

## Frontend (React) Example

### Cascading Dropdowns

```jsx
const [modules, setModules] = useState([]);
const [subModules, setSubModules] = useState([]);
const [features, setFeatures] = useState([]);

const [selectedModule, setSelectedModule] = useState('');
const [selectedSubModule, setSelectedSubModule] = useState('');
const [selectedFeature, setSelectedFeature] = useState('');

// Load modules
useEffect(() => {
  api.get('/test-cases/hierarchy/options')
    .then(res => setModules(res.data));
}, []);

// Load sub-modules when module changes
useEffect(() => {
  if (selectedModule) {
    api.get(`/test-cases/hierarchy/options?module_id=${selectedModule}`)
      .then(res => setSubModules(res.data));
  }
}, [selectedModule]);

// Load features when sub-module changes
useEffect(() => {
  if (selectedModule && selectedSubModule) {
    api.get(`/test-cases/hierarchy/options?module_id=${selectedModule}&sub_module=${selectedSubModule}`)
      .then(res => setFeatures(res.data));
  }
}, [selectedModule, selectedSubModule]);
```

## Module Abbreviations

| Module | Abbreviation |
|--------|--------------|
| Account Payable | AP |
| Account Receivable | AR |
| Cash Flow Forecasting | CF |
| Banking Integrations | BK |

## Common Sub-Modules

| Module | Sub-Modules |
|--------|-------------|
| Account Payable | Suppliers, Invoices, Payments, Reports |
| Account Receivable | Customers, Outstanding Invoices, Received Payments, Aging Reports |
| Cash Flow | Forecasts, Scenarios, Reports, Settings |
| Banking | Bank Accounts, Transactions, Reconciliation, Integration |

## Migration Commands

```bash
# Run migration
python3 backend/migrate_add_hierarchy.py

# Show schema
python3 backend/migrate_add_hierarchy.py --show-schema

# Rollback
python3 backend/migrate_add_hierarchy.py --rollback <backup_path>
```

## Documentation Files

- **HIERARCHICAL_TEST_ORGANIZATION.md** - Comprehensive guide (400+ lines)
- **HIERARCHY_IMPLEMENTATION_SUMMARY.md** - Implementation details
- **HIERARCHY_QUICK_REFERENCE.md** - This quick reference

## Support

For more details, see:
- `HIERARCHICAL_TEST_ORGANIZATION.md` - Full documentation
- `PAGE_OBJECT_MODEL_GUIDE.md` - Page Object patterns
- `REFACTORING_SUMMARY.md` - Test suite architecture
