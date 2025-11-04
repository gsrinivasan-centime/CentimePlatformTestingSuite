# Hierarchical Test Organization - Visual Guide

## 4-Level Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                           MODULE                                │
│                    (e.g., Account Payable)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
           ┌───────────┴───────────┬───────────────┐
           │                       │               │
    ┌──────▼──────┐         ┌──────▼──────┐   ┌──────▼──────┐
    │ SUB-MODULE  │         │ SUB-MODULE  │   │ SUB-MODULE  │
    │  Suppliers  │         │  Invoices   │   │  Payments   │
    └──────┬──────┘         └──────┬──────┘   └──────┬──────┘
           │                       │                  │
    ┌──────┴──────┬───────┐       │                  │
    │             │       │       │                  │
┌───▼────┐  ┌────▼────┐ ┌▼──┐  ┌─▼──────┐    ┌─────▼──────┐
│FEATURE │  │ FEATURE │ │...│  │FEATURE │    │  FEATURE   │
│Profile │  │  List   │ │   │  │Creation│    │ Processing │
└───┬────┘  └────┬────┘ └───┘  └───┬────┘    └─────┬──────┘
    │            │                  │                │
┌───▼────┐  ┌───▼────┐        ┌───▼────┐      ┌────▼────┐
│TC_001  │  │TC_001  │        │TC_001  │      │TC_001   │
│TC_002  │  │TC_002  │        │TC_002  │      │TC_002   │
│  ...   │  │  ...   │        │  ...   │      │  ...    │
└────────┘  └────────┘        └────────┘      └─────────┘
```

## Real-World Example: Account Payable Module

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACCOUNT PAYABLE                              │
│                         (Module ID: 1)                              │
└────────────────┬────────────────────────────────────────────────────┘
                 │
        ┌────────┼────────┬────────────────┐
        │                 │                │
  ┌─────▼─────┐     ┌─────▼─────┐    ┌────▼─────┐
  │ Suppliers │     │ Invoices  │    │ Payments │
  │           │     │           │    │          │
  └─────┬─────┘     └─────┬─────┘    └────┬─────┘
        │                 │                │
  ┌─────┴─────┬───────┐   │                │
  │           │       │   │                │
┌─▼─────────┐ │  ┌────▼─┐ │           ┌────▼──────────┐
│ Supplier  │ │  │List  │ │           │   Payment     │
│  Profile  │ │  │View  │ │           │  Processing   │
└────┬──────┘ │  └──┬───┘ │           └───────┬───────┘
     │        │     │     │                   │
     │     ┌──▼─────┐│    │                   │
     │     │Create  ││    │                   │
     │     │ Form   ││    │                   │
     │     └──┬─────┘│    │                   │
     │        │      │    │                   │
┌────▼────┐┌──▼───┐┌▼────▼─────┐      ┌──────▼────────┐
│TC_AP_   ││TC_AP_││TC_AP_INV_ │      │TC_AP_PAY_     │
│SUP_PROF ││SUP_  ││CREATE_001 │      │PROC_001       │
│_001     ││LIST_ ││TC_AP_INV_ │      │Process        │
│View     ││001   ││APPR_001   │      │Supplier       │
│Profile  ││List  ││Approve    │      │Payment        │
│         ││All   ││Invoice    │      │               │
│         ││      ││           │      │               │
│TC_AP_   ││TC_AP_││           │      │               │
│SUP_PROF ││SUP_  ││           │      │               │
│_002     ││CREATE││           │      │               │
│Edit     ││_001  ││           │      │               │
│Profile  ││Create││           │      │               │
└─────────┘└──────┘└───────────┘      └───────────────┘
```

## Database Structure Visualization

```
┌────────────────────────────────────────────────────────────────────┐
│                        test_cases TABLE                            │
├────────────┬──────────────┬──────────────┬─────────────────────────┤
│ id         │ test_id      │ title        │ ...                     │
│ module_id  │ sub_module   │ feature_sec  │ automated_script_path   │
├────────────┼──────────────┼──────────────┼─────────────────────────┤
│ 1          │TC_AP_SUP_... │View Profile  │test_suite/ui_tests/...  │
│ 1 (AP)     │"Suppliers"   │"Profile"     │account_payable/...      │
├────────────┼──────────────┼──────────────┼─────────────────────────┤
│ 2          │TC_AP_SUP_... │Edit Profile  │test_suite/ui_tests/...  │
│ 1 (AP)     │"Suppliers"   │"Profile"     │account_payable/...      │
├────────────┼──────────────┼──────────────┼─────────────────────────┤
│ 3          │TC_AP_SUP_... │List All      │test_suite/ui_tests/...  │
│ 1 (AP)     │"Suppliers"   │"List View"   │account_payable/...      │
└────────────┴──────────────┴──────────────┴─────────────────────────┘
           │              │              │
           └──────────────┴──────────────┴──────► Indexed columns
                                                   for fast queries
```

## File Structure Mapping

```
Backend Structure                    Test Suite Structure
═══════════════════                  ═══════════════════════

modules table                        test_suite/
└── Account Payable (id=1) ────────► ├── ui_tests/
                                     │   └── account_payable/
    test_cases table                 │       ├── suppliers/
    ├── sub_module="Suppliers" ─────►│       │   ├── test_supplier_profile.py
    │   ├── feature="Profile" ──────►│       │   │   └── TC_AP_SUP_PROF_001, 002
    │   ├── feature="List View" ────►│       │   ├── test_supplier_list.py
    │   │                            │       │   │   └── TC_AP_SUP_LIST_001
    │   └── feature="Create Form" ──►│       │   └── test_supplier_create.py
    │                                │       │       └── TC_AP_SUP_CREATE_001
    ├── sub_module="Invoices" ──────►│       ├── invoices/
    │   ├── feature="Creation" ─────►│       │   ├── test_invoice_creation.py
    │   └── feature="Approval" ─────►│       │   └── test_invoice_approval.py
    │                                │       │
    └── sub_module="Payments" ──────►│       └── payments/
        └── feature="Processing" ───►│           └── test_payment_processing.py
                                     │
                                     └── api_tests/
                                         └── (similar structure)
```

## API Endpoint Flow

```
User Request Flow for Cascading Dropdowns
═══════════════════════════════════════════

1. Page Load
   │
   ├──► GET /api/test-cases/hierarchy/options
   │
   └──► Response: [
          {
            "id": 1,
            "name": "Account Payable",
            "sub_module_count": 3
          }
        ]

2. User Selects Module: "Account Payable" (id=1)
   │
   ├──► GET /api/test-cases/hierarchy/options?module_id=1
   │
   └──► Response: [
          {
            "name": "Suppliers",
            "feature_count": 3
          },
          {
            "name": "Invoices",
            "feature_count": 2
          }
        ]

3. User Selects Sub-Module: "Suppliers"
   │
   ├──► GET /api/test-cases/hierarchy/options?module_id=1&sub_module=Suppliers
   │
   └──► Response: [
          {
            "name": "Supplier Profile",
            "test_count": 2
          },
          {
            "name": "List View",
            "test_count": 1
          }
        ]

4. User Selects Feature: "Supplier Profile"
   │
   └──► Form Complete:
        - module_id: 1
        - sub_module: "Suppliers"
        - feature_section: "Supplier Profile"
```

## Test Execution Flow

```
Running Tests with Hierarchy
════════════════════════════

Command: pytest -m "account_payable and suppliers and supplier_profile"
   │
   ├──► Pytest discovers tests based on markers
   │
   ├──► Tests matching hierarchy:
   │    ├── test_suite/ui_tests/account_payable/suppliers/test_supplier_profile.py
   │    │   └── @pytest.mark.supplier_profile
   │    │       ├── test_view_supplier_profile()
   │    │       └── test_edit_supplier_profile()
   │    │
   │    └── (other matching tests...)
   │
   └──► Execution with conftest fixtures:
        ├── Browser fixtures (driver)
        ├── Page objects (suppliers_page)
        ├── Test data (SUPPLIERS)
        └── Authentication (logged_in_driver)
```

## Test ID Hierarchy Visualization

```
Test ID Structure: TC_AP_SUP_PROF_001
                   │  │  │   │    │
                   │  │  │   │    └─► Sequential Number (001, 002, 003...)
                   │  │  │   │
                   │  │  │   └──────► Feature Abbreviation (PROF = Profile)
                   │  │  │
                   │  │  └──────────► Sub-Module Abbreviation (SUP = Suppliers)
                   │  │
                   │  └─────────────► Module Abbreviation (AP = Account Payable)
                   │
                   └────────────────► Test Case Prefix

Examples:
─────────
TC_AP_SUP_PROF_001    Account Payable → Suppliers → Profile → Test 001
TC_AP_SUP_LIST_001    Account Payable → Suppliers → List View → Test 001
TC_AP_INV_CREATE_001  Account Payable → Invoices → Creation → Test 001
TC_AR_CUST_PROF_001   Account Receivable → Customers → Profile → Test 001
```

## Filtering Flow Diagram

```
Filtering Test Cases by Hierarchy
═════════════════════════════════

No Filters
   │
   ├──► Returns: ALL test cases
   └──► SQL: SELECT * FROM test_cases

Filter: module_id=1
   │
   ├──► Returns: All Account Payable tests
   └──► SQL: SELECT * FROM test_cases WHERE module_id = 1

Filter: module_id=1, sub_module="Suppliers"
   │
   ├──► Returns: All Supplier tests
   └──► SQL: SELECT * FROM test_cases
             WHERE module_id = 1 AND sub_module = 'Suppliers'

Filter: module_id=1, sub_module="Suppliers", feature_section="Profile"
   │
   ├──► Returns: Only Supplier Profile tests
   └──► SQL: SELECT * FROM test_cases
             WHERE module_id = 1
               AND sub_module = 'Suppliers'
               AND feature_section = 'Supplier Profile'
```

## Hierarchy Benefits Visualization

```
Traditional Flat Structure         Hierarchical Structure
════════════════════════           ════════════════════════

test_cases/                        test_cases/
├── TC_001.py                      └── Account Payable/
├── TC_002.py                          ├── Suppliers/
├── TC_003.py                          │   ├── Profile/
├── TC_004.py                          │   │   ├── TC_001
├── TC_005.py                          │   │   └── TC_002
├── ...                                │   ├── List/
├── TC_999.py                          │   │   └── TC_001
└── TC_1000.py                         │   └── Create/
                                       │       └── TC_001
❌ Hard to navigate                    ├── Invoices/
❌ No logical grouping                 │   ├── Creation/
❌ Difficult to maintain               │   └── Approval/
❌ Poor scalability                    └── Payments/
                                           └── Processing/

                                   ✅ Easy to navigate
                                   ✅ Logical grouping
                                   ✅ Easy to maintain
                                   ✅ Highly scalable
```

## Migration Process Visualization

```
Database Migration Flow
═══════════════════════

Before Migration                   After Migration
────────────────                   ───────────────

test_cases table                  test_cases table
┌──────────────┐                  ┌──────────────────┐
│ id           │                  │ id               │
│ test_id      │                  │ test_id          │
│ title        │                  │ title            │
│ module_id    │                  │ module_id        │
│ ...          │    ──────►       │ sub_module    ⭐│← NEW
└──────────────┘                  │ feature_sect  ⭐│← NEW
                                  │ ...              │
                                  └──────────────────┘

Migration Script Actions:
1. ✅ Create backup: test_management.db.backup_YYYYMMDD_HHMMSS
2. ✅ ALTER TABLE test_cases ADD COLUMN sub_module TEXT
3. ✅ CREATE INDEX idx_test_cases_sub_module
4. ✅ ALTER TABLE test_cases ADD COLUMN feature_section TEXT
5. ✅ CREATE INDEX idx_test_cases_feature_section
6. ✅ CREATE INDEX idx_test_cases_hierarchy (composite)
7. ✅ Verify changes
```

## Complete Example: Adding New Feature Test

```
Step-by-Step: Add "Supplier Payment Terms" Feature
═══════════════════════════════════════════════════

1. Identify Hierarchy
   ┌────────────────────────────────────┐
   │ Module: Account Payable            │
   │ Sub-Module: Suppliers              │
   │ Feature: Payment Terms ⭐ NEW      │
   └────────────────────────────────────┘

2. Create Directory Structure
   test_suite/ui_tests/account_payable/suppliers/
   └── payment_terms/ ⭐ NEW
       └── test_payment_terms.py ⭐ NEW

3. Write Test File
   test_payment_terms.py:
   ┌────────────────────────────────────────────┐
   │ @pytest.mark.ui                            │
   │ @pytest.mark.account_payable               │
   │ @pytest.mark.suppliers                     │
   │ @pytest.mark.payment_terms ⭐              │
   │ class TestPaymentTerms:                    │
   │     def test_add_payment_terms(self):      │
   │         # Test code here                   │
   └────────────────────────────────────────────┘

4. Create Database Entry
   POST /api/test-cases/
   ┌────────────────────────────────────────────┐
   │ {                                          │
   │   "test_id": "TC_AP_SUP_TERMS_001",        │
   │   "title": "Add Payment Terms",            │
   │   "module_id": 1,                          │
   │   "sub_module": "Suppliers",               │
   │   "feature_section": "Payment Terms" ⭐    │
   │ }                                          │
   └────────────────────────────────────────────┘

5. Run Test
   pytest -m payment_terms
   └──► Executes: test_add_payment_terms()
```

## Summary Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                   HIERARCHICAL TEST ORGANIZATION                      │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Database Layer          API Layer           Test Suite Layer        │
│  ═══════════════         ═══════════         ══════════════          │
│                                                                       │
│  ┌─────────────┐         ┌─────────┐         ┌────────────┐         │
│  │test_cases   │         │ GET /   │         │ Page       │         │
│  │table        │◄────────│ test-   │────────►│ Objects    │         │
│  │             │         │ cases/  │         │            │         │
│  │+ module_id  │         │         │         │+ Login     │         │
│  │+ sub_module │         │+ filters│         │+ Dashboard │         │
│  │+ feature_   │         │+ cascade│         │+ Suppliers │         │
│  │  section    │         │  options│         │  ...       │         │
│  └─────────────┘         └─────────┘         └────────────┘         │
│         │                     │                     │                │
│         │                     │                     │                │
│         └─────────────────────┼─────────────────────┘                │
│                               │                                      │
│                    ┌──────────▼──────────┐                           │
│                    │   User Interface    │                           │
│                    │   ──────────────    │                           │
│                    │  Cascading Dropdowns│                           │
│                    │  ┌────────────────┐ │                           │
│                    │  │Module:    [AP▼]│ │                           │
│                    │  │Sub-Mod:   [Sup▼│ │                           │
│                    │  │Feature:   [Pro▼│ │                           │
│                    │  └────────────────┘ │                           │
│                    └─────────────────────┘                           │
│                                                                       │
│  Benefits:                                                            │
│  ✅ Scalable: Handle 1000+ tests                                     │
│  ✅ Organized: Clear logical structure                               │
│  ✅ Maintainable: Easy to update                                     │
│  ✅ Filterable: Fast queries with indexes                            │
│  ✅ Team-friendly: Clear ownership                                   │
└───────────────────────────────────────────────────────────────────────┘
```
