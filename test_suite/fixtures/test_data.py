"""
Test Data Repository
Centralized test data for all modules and features
"""

# ==================== User Test Data ====================

VALID_USERS = {
    "admin": {
        "email": "admin@centime.com",
        "password": "Admin@123",
        "full_name": "Admin User",
        "role": "admin"
    },
    "tester": {
        "email": "tester@centime.com",
        "password": "Tester@123",
        "full_name": "Test User",
        "role": "tester"
    },
    "manager": {
        "email": "manager@centime.com",
        "password": "Manager@123",
        "full_name": "Manager User",
        "role": "tester"
    }
}

INVALID_USERS = {
    "wrong_password": {
        "email": "admin@centime.com",
        "password": "WrongPassword123"
    },
    "non_existent": {
        "email": "nonexistent@centime.com",
        "password": "Password@123"
    },
    "invalid_email": {
        "email": "invalid-email",
        "password": "Password@123"
    },
    "empty_fields": {
        "email": "",
        "password": ""
    }
}

# ==================== Module Test Data ====================

MODULES = {
    "account_payable": {
        "name": "Account Payable",
        "description": "Manage accounts payable operations",
        "features": ["Suppliers", "Unpaid Invoices", "Paid Invoices", "Payments"]
    },
    "account_receivable": {
        "name": "Account Receivable",
        "description": "Manage accounts receivable operations",
        "features": ["Customers", "Outstanding Invoices", "Received Payments"]
    },
    "cash_flow": {
        "name": "Cash Flow Forecasting",
        "description": "Forecast and manage cash flow",
        "features": ["Forecasts", "Scenarios", "Reports"]
    },
    "banking": {
        "name": "Banking Integrations",
        "description": "Integrate with banking systems",
        "features": ["Bank Accounts", "Transactions", "Reconciliation"]
    }
}

# ==================== Account Payable Test Data ====================

SUPPLIERS = {
    "valid_supplier": {
        "name": "ABC Corporation",
        "email": "contact@abccorp.com",
        "phone": "+1-555-0100",
        "address": "123 Business St, New York, NY 10001",
        "tax_id": "12-3456789",
        "payment_terms": "Net 30"
    },
    "valid_supplier_2": {
        "name": "XYZ Enterprises",
        "email": "info@xyzent.com",
        "phone": "+1-555-0200",
        "address": "456 Commerce Ave, Los Angeles, CA 90001",
        "tax_id": "98-7654321",
        "payment_terms": "Net 60"
    },
    "invalid_supplier": {
        "name": "",  # Missing required field
        "email": "invalid-email",
        "phone": "invalid",
        "address": "",
        "tax_id": "",
        "payment_terms": ""
    },
    "duplicate_supplier": {
        "name": "ABC Corporation",  # Duplicate name
        "email": "duplicate@abccorp.com",
        "phone": "+1-555-0100",
        "address": "123 Business St, New York, NY 10001",
        "tax_id": "12-3456789",
        "payment_terms": "Net 30"
    }
}

UNPAID_INVOICES = {
    "valid_invoice": {
        "invoice_number": "INV-2024-001",
        "supplier": "ABC Corporation",
        "amount": 5000.00,
        "currency": "USD",
        "invoice_date": "2024-10-01",
        "due_date": "2024-10-31",
        "description": "Office supplies purchase",
        "status": "Unpaid"
    },
    "valid_invoice_2": {
        "invoice_number": "INV-2024-002",
        "supplier": "XYZ Enterprises",
        "amount": 12500.00,
        "currency": "USD",
        "invoice_date": "2024-10-15",
        "due_date": "2024-11-15",
        "description": "IT equipment purchase",
        "status": "Unpaid"
    },
    "overdue_invoice": {
        "invoice_number": "INV-2024-003",
        "supplier": "ABC Corporation",
        "amount": 3000.00,
        "currency": "USD",
        "invoice_date": "2024-09-01",
        "due_date": "2024-09-30",
        "description": "Monthly service fee",
        "status": "Overdue"
    }
}

PAID_INVOICES = {
    "paid_invoice_1": {
        "invoice_number": "INV-2024-004",
        "supplier": "ABC Corporation",
        "amount": 7500.00,
        "currency": "USD",
        "invoice_date": "2024-09-01",
        "due_date": "2024-09-30",
        "payment_date": "2024-09-28",
        "payment_method": "Bank Transfer",
        "description": "Software licenses",
        "status": "Paid"
    }
}

# ==================== Account Receivable Test Data ====================

CUSTOMERS = {
    "valid_customer": {
        "name": "Client Solutions Inc",
        "email": "billing@clientsolutions.com",
        "phone": "+1-555-0300",
        "address": "789 Corporate Blvd, Chicago, IL 60601",
        "credit_limit": 50000.00,
        "payment_terms": "Net 30"
    }
}

OUTSTANDING_INVOICES = {
    "outstanding_invoice": {
        "invoice_number": "INV-OUT-2024-001",
        "customer": "Client Solutions Inc",
        "amount": 15000.00,
        "currency": "USD",
        "invoice_date": "2024-10-01",
        "due_date": "2024-10-31",
        "description": "Consulting services",
        "status": "Outstanding"
    }
}

# ==================== Test Case Test Data ====================

TEST_CASES = {
    "ui_test": {
        "test_id": "TC_UI_001",
        "title": "Verify Login Functionality",
        "description": "Test successful login with valid credentials",
        "test_type": "UI",
        "module": "Account Payable",
        "priority": "High",
        "status": "Active"
    },
    "api_test": {
        "test_id": "TC_API_001",
        "title": "Verify Create Supplier API",
        "description": "Test supplier creation via API",
        "test_type": "API",
        "module": "Account Payable",
        "priority": "High",
        "status": "Active"
    }
}

# ==================== Common Search/Filter Data ====================

DATE_RANGES = {
    "today": {"start": "2024-11-01", "end": "2024-11-01"},
    "this_week": {"start": "2024-10-28", "end": "2024-11-03"},
    "this_month": {"start": "2024-11-01", "end": "2024-11-30"},
    "last_month": {"start": "2024-10-01", "end": "2024-10-31"},
    "last_quarter": {"start": "2024-07-01", "end": "2024-09-30"}
}

CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]

PAYMENT_METHODS = ["Bank Transfer", "Credit Card", "Check", "ACH", "Wire Transfer"]

PAYMENT_TERMS = ["Due on Receipt", "Net 15", "Net 30", "Net 60", "Net 90"]

# ==================== Error Messages ====================

ERROR_MESSAGES = {
    "invalid_login": "Invalid email or password",
    "required_field": "This field is required",
    "invalid_email": "Please enter a valid email address",
    "duplicate_entry": "This entry already exists",
    "insufficient_permissions": "You do not have permission to perform this action",
    "session_expired": "Your session has expired. Please login again"
}

# ==================== Success Messages ====================

SUCCESS_MESSAGES = {
    "login_success": "Login successful",
    "created_successfully": "Created successfully",
    "updated_successfully": "Updated successfully",
    "deleted_successfully": "Deleted successfully",
    "saved_successfully": "Saved successfully"
}

# ==================== API Test Data ====================

API_ENDPOINTS = {
    "base_url": "http://localhost:8000",
    "auth": {
        "register": "/api/auth/register",
        "login": "/api/auth/login",
        "me": "/api/auth/me"
    },
    "test_cases": "/api/test-cases",
    "modules": "/api/modules",
    "releases": "/api/releases",
    "executions": "/api/executions",
    "users": "/api/users"
}

# ==================== Test Case Hierarchy Examples ====================

TEST_CASE_HIERARCHY = {
    "account_payable": {
        "module": "Account Payable",
        "module_id": 1,
        "sub_modules": {
            "suppliers": {
                "name": "Suppliers",
                "features": {
                    "supplier_profile": {
                        "name": "Supplier Profile",
                        "test_cases": [
                            {
                                "test_id": "TC_AP_SUP_PROF_001",
                                "title": "View Supplier Profile Details",
                                "description": "Verify that supplier profile displays all details correctly",
                                "test_type": "UI",
                                "sub_module": "Suppliers",
                                "feature_section": "Supplier Profile"
                            },
                            {
                                "test_id": "TC_AP_SUP_PROF_002",
                                "title": "Edit Supplier Profile",
                                "description": "Verify that supplier profile can be edited successfully",
                                "test_type": "UI",
                                "sub_module": "Suppliers",
                                "feature_section": "Supplier Profile"
                            }
                        ]
                    },
                    "list_view": {
                        "name": "List View",
                        "test_cases": [
                            {
                                "test_id": "TC_AP_SUP_LIST_001",
                                "title": "Display All Suppliers in List",
                                "description": "Verify that all suppliers are displayed in the list view",
                                "test_type": "UI",
                                "sub_module": "Suppliers",
                                "feature_section": "List View"
                            }
                        ]
                    },
                    "create_form": {
                        "name": "Create Form",
                        "test_cases": [
                            {
                                "test_id": "TC_AP_SUP_CREATE_001",
                                "title": "Create New Supplier",
                                "description": "Verify that a new supplier can be created successfully",
                                "test_type": "UI",
                                "sub_module": "Suppliers",
                                "feature_section": "Create Form"
                            }
                        ]
                    }
                }
            },
            "invoices": {
                "name": "Invoices",
                "features": {
                    "invoice_creation": {
                        "name": "Invoice Creation",
                        "test_cases": [
                            {
                                "test_id": "TC_AP_INV_CREATE_001",
                                "title": "Create Unpaid Invoice",
                                "description": "Verify that an unpaid invoice can be created",
                                "test_type": "UI",
                                "sub_module": "Invoices",
                                "feature_section": "Invoice Creation"
                            }
                        ]
                    },
                    "invoice_approval": {
                        "name": "Invoice Approval",
                        "test_cases": [
                            {
                                "test_id": "TC_AP_INV_APPR_001",
                                "title": "Approve Invoice",
                                "description": "Verify that an invoice can be approved by authorized user",
                                "test_type": "UI",
                                "sub_module": "Invoices",
                                "feature_section": "Invoice Approval"
                            }
                        ]
                    }
                }
            },
            "payments": {
                "name": "Payments",
                "features": {
                    "payment_processing": {
                        "name": "Payment Processing",
                        "test_cases": [
                            {
                                "test_id": "TC_AP_PAY_PROC_001",
                                "title": "Process Supplier Payment",
                                "description": "Verify that supplier payment can be processed",
                                "test_type": "UI",
                                "sub_module": "Payments",
                                "feature_section": "Payment Processing"
                            }
                        ]
                    }
                }
            }
        }
    },
    "account_receivable": {
        "module": "Account Receivable",
        "module_id": 2,
        "sub_modules": {
            "customers": {
                "name": "Customers",
                "features": {
                    "customer_profile": {
                        "name": "Customer Profile",
                        "test_cases": [
                            {
                                "test_id": "TC_AR_CUST_PROF_001",
                                "title": "View Customer Profile",
                                "description": "Verify customer profile displays correctly",
                                "test_type": "UI",
                                "sub_module": "Customers",
                                "feature_section": "Customer Profile"
                            }
                        ]
                    }
                }
            }
        }
    }
}

# Helper function to get test case by hierarchy
def get_test_case_by_hierarchy(module: str, sub_module: str, feature: str, test_index: int = 0):
    """
    Get a test case from the hierarchy by path
    
    Args:
        module: Module name (e.g., "account_payable")
        sub_module: Sub-module name (e.g., "suppliers")
        feature: Feature name (e.g., "supplier_profile")
        test_index: Index of test case in the feature (default: 0)
    
    Returns:
        Test case dictionary or None
    
    Example:
        test = get_test_case_by_hierarchy("account_payable", "suppliers", "supplier_profile", 0)
    """
    try:
        return TEST_CASE_HIERARCHY[module]["sub_modules"][sub_module]["features"][feature]["test_cases"][test_index]
    except (KeyError, IndexError):
        return None

# Helper function to get all test cases for a sub-module
def get_test_cases_by_sub_module(module: str, sub_module: str):
    """
    Get all test cases for a sub-module
    
    Args:
        module: Module name (e.g., "account_payable")
        sub_module: Sub-module name (e.g., "suppliers")
    
    Returns:
        List of all test cases in the sub-module
    """
    try:
        test_cases = []
        sub_mod = TEST_CASE_HIERARCHY[module]["sub_modules"][sub_module]
        for feature_name, feature_data in sub_mod["features"].items():
            test_cases.extend(feature_data["test_cases"])
        return test_cases
    except KeyError:
        return []

# Helper function to get all test cases for a feature
def get_test_cases_by_feature(module: str, sub_module: str, feature: str):
    """
    Get all test cases for a specific feature
    
    Args:
        module: Module name (e.g., "account_payable")
        sub_module: Sub-module name (e.g., "suppliers")
        feature: Feature name (e.g., "supplier_profile")
    
    Returns:
        List of test cases for the feature
    """
    try:
        return TEST_CASE_HIERARCHY[module]["sub_modules"][sub_module]["features"][feature]["test_cases"]
    except KeyError:
        return []
