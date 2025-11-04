"""
Test Case ID: TC_AP_SUPPLIERS_xxx
Module: Account Payable
Sub-Module: Suppliers
Test Type: Automated UI Test
Description: Test Suppliers feature in Account Payable module
Author: QA Team

This demonstrates the scalable Page Object Model pattern
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from page_objects.account_payable.suppliers_page import SuppliersPage
from fixtures.test_data import SUPPLIERS


@pytest.mark.ui
@pytest.mark.account_payable
@pytest.mark.suppliers
class TestSuppliersFeature:
    """
    Test suite for Suppliers feature
    Demonstrates scalable pattern for feature testing
    """
    
    def test_navigate_to_suppliers_tab(self, logged_in_driver, base_url):
        """
        Test Case: TC_AP_SUPPLIERS_001
        Verify navigation to Suppliers tab
        
        Steps:
        1. User is logged in
        2. Navigate to Account Payable module
        3. Click on Suppliers tab
        4. Verify Suppliers page is displayed
        
        Expected Result:
        - Suppliers tab is active
        - Suppliers list/form is visible
        """
        # Initialize page object
        suppliers_page = SuppliersPage(logged_in_driver, base_url)
        
        # Navigate to suppliers
        suppliers_page.navigate()
        suppliers_page.click_suppliers_tab()
        
        # Verify page is displayed
        assert suppliers_page.is_suppliers_page_displayed(), "Suppliers page not displayed"
    
    

@pytest.mark.ui
@pytest.mark.account_payable
@pytest.mark.suppliers
@pytest.mark.smoke
class TestSuppliersCriticalPath:
    """
    Critical path tests for Suppliers feature
    These tests cover the most important user journeys
    """
    
    def test_supplier_lifecycle(self, logged_in_driver, base_url):
        """
        Test Case: TC_AP_SUPPLIERS_LIFECYCLE
        Test complete supplier lifecycle: Create → View → Edit → Delete
        
        This is a comprehensive test that validates the entire workflow
        """
        suppliers_page = SuppliersPage(logged_in_driver, base_url)
        
        # Create
        supplier_data = SUPPLIERS["valid_supplier"]
        suppliers_page.navigate()
        suppliers_page.click_suppliers_tab()
        suppliers_page.create_supplier(supplier_data)
        assert suppliers_page.is_success_message_displayed(), "Create failed"
        
        # View
        assert suppliers_page.is_supplier_in_list(supplier_data["name"]), "Supplier not in list"
        
        # Edit
        suppliers_page.click_edit_supplier(supplier_data["name"])
        updated_data = {"phone": "+1-555-8888"}
        suppliers_page.fill_supplier_form(updated_data)
        suppliers_page.click_save_supplier()
        assert suppliers_page.is_success_message_displayed(), "Update failed"
        
        # Delete
        suppliers_page.click_delete_supplier(supplier_data["name"])
        suppliers_page.confirm_delete()
        assert suppliers_page.is_success_message_displayed(), "Delete failed"
        assert not suppliers_page.is_supplier_in_list(supplier_data["name"]), \
            "Supplier still exists after delete"
