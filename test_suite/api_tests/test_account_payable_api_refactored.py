"""
Test Case ID: TC_API_001
Module: Account Payable  
Test Type: Automated API Test
Description: Test Account Payable API endpoints using API Client Pattern
Author: QA Team

REFACTORED: Now using API Client Pattern for better code reuse and maintainability
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api_clients.account_payable_api_client import AccountPayableAPIClient
from fixtures.test_data import SUPPLIERS, UNPAID_INVOICES, VALID_USERS


@pytest.mark.api
@pytest.mark.smoke
@pytest.mark.account_payable
class TestAccountPayableAPIRefactored:
    """
    Test suite for Account Payable API using API Client Pattern
    Demonstrates code reuse and scalability
    """
    
    @pytest.fixture(scope="class")
    def ap_api_client(self, api_base_url, authenticated_api_client):
        """Create Account Payable API client"""
        return AccountPayableAPIClient(api_base_url)
    
    # ==================== Supplier Tests ====================
    
    def test_create_supplier(self, ap_api_client):
        """
        Test Case: Verify creating a new supplier via API
        
        API Endpoint: POST /api/account-payable/suppliers
        
        Expected Result:
        - Status code: 201 Created
        - Response contains created supplier with ID
        - All submitted fields are correctly saved
        """
        # Get test data
        supplier_data = SUPPLIERS["valid_supplier"]
        
        # Create supplier using API client
        response = ap_api_client.create_supplier(supplier_data)
        
        # Verify response
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        
        # Verify response data
        created_supplier = response.json()
        assert "id" in created_supplier, "Response missing supplier ID"
        assert created_supplier["name"] == supplier_data["name"]
        assert created_supplier["email"] == supplier_data["email"]
    
    def test_get_suppliers_list(self, ap_api_client):
        """
        Test Case: Verify API returns list of suppliers
        
        API Endpoint: GET /api/account-payable/suppliers
        
        Expected Result:
        - Status code: 200 OK
        - Response body contains array of supplier objects
        - Each supplier has required fields
        """
        # Get suppliers
        response = ap_api_client.get_suppliers()
        
        # Verify response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify response structure
        suppliers = response.json()
        assert isinstance(suppliers, list), "Response should be a list"
        
        # Verify supplier structure (if suppliers exist)
        if len(suppliers) > 0:
            supplier = suppliers[0]
            required_fields = ["id", "name", "email", "phone"]
            for field in required_fields:
                assert field in supplier, f"Supplier missing required field: {field}"
    
    def test_get_supplier_by_id(self, ap_api_client):
        """
        Test Case: Verify getting specific supplier by ID
        
        API Endpoint: GET /api/account-payable/suppliers/{id}
        
        Expected Result:
        - Status code: 200 OK
        - Response contains supplier details
        """
        # First get list of suppliers
        list_response = ap_api_client.get_suppliers()
        suppliers = list_response.json()
        
        if len(suppliers) > 0:
            supplier_id = suppliers[0]["id"]
            
            # Get specific supplier
            response = ap_api_client.get_supplier_by_id(supplier_id)
            
            # Verify response
            assert response.status_code == 200
            supplier = response.json()
            assert supplier["id"] == supplier_id
    
    def test_update_supplier(self, ap_api_client):
        """
        Test Case: Verify updating supplier via API
        
        API Endpoint: PUT /api/account-payable/suppliers/{id}
        
        Expected Result:
        - Status code: 200 OK
        - Supplier data is updated
        """
        # Get existing supplier
        list_response = ap_api_client.get_suppliers()
        suppliers = list_response.json()
        
        if len(suppliers) > 0:
            supplier_id = suppliers[0]["id"]
            
            # Update data
            update_data = {
                "name": "Updated Supplier Name",
                "phone": "+1-555-9999"
            }
            
            # Update supplier
            response = ap_api_client.update_supplier(supplier_id, update_data)
            
            # Verify response
            assert response.status_code == 200
            updated_supplier = response.json()
            assert updated_supplier["name"] == update_data["name"]
    
    def test_delete_supplier(self, ap_api_client):
        """
        Test Case: Verify deleting supplier via API
        
        API Endpoint: DELETE /api/account-payable/suppliers/{id}
        
        Expected Result:
        - Status code: 204 No Content or 200 OK
        - Supplier is deleted from system
        """
        # Create a supplier to delete
        supplier_data = SUPPLIERS["valid_supplier_2"]
        create_response = ap_api_client.create_supplier(supplier_data)
        supplier_id = create_response.json()["id"]
        
        # Delete supplier
        response = ap_api_client.delete_supplier(supplier_id)
        
        # Verify response
        assert response.status_code in [200, 204]
        
        # Verify supplier is deleted
        get_response = ap_api_client.get_supplier_by_id(supplier_id)
        assert get_response.status_code == 404
    
    # ==================== Invoice Tests ====================
    
    def test_create_invoice(self, ap_api_client):
        """
        Test Case: Verify creating a new invoice via API
        
        API Endpoint: POST /api/account-payable/invoices
        
        Expected Result:
        - Status code: 201 Created
        - Response contains created invoice with ID
        """
        # Get test data
        invoice_data = UNPAID_INVOICES["valid_invoice"]
        
        # Create invoice
        response = ap_api_client.create_invoice(invoice_data)
        
        # Verify response
        assert response.status_code == 201
        
        # Verify response data
        created_invoice = response.json()
        assert "id" in created_invoice
        assert created_invoice["invoice_number"] == invoice_data["invoice_number"]
        assert created_invoice["amount"] == invoice_data["amount"]
    
    def test_get_invoices_list(self, ap_api_client):
        """
        Test Case: Verify API returns list of invoices
        
        API Endpoint: GET /api/account-payable/invoices
        
        Expected Result:
        - Status code: 200 OK
        - Response contains list of invoices
        """
        # Get invoices
        response = ap_api_client.get_invoices()
        
        # Verify response
        assert response.status_code == 200
        
        # Verify structure
        invoices = response.json()
        assert isinstance(invoices, list)
        
        if len(invoices) > 0:
            invoice = invoices[0]
            required_fields = ["id", "invoice_number", "amount", "status"]
            for field in required_fields:
                assert field in invoice, f"Invoice missing field: {field}"
    
    def test_get_unpaid_invoices(self, ap_api_client):
        """
        Test Case: Verify filtering invoices by status
        
        API Endpoint: GET /api/account-payable/invoices?status=unpaid
        
        Expected Result:
        - Status code: 200 OK
        - Response contains only unpaid invoices
        """
        # Get unpaid invoices
        response = ap_api_client.get_invoices(status="unpaid")
        
        # Verify response
        assert response.status_code == 200
        
        # Verify all returned invoices are unpaid
        invoices = response.json()
        for invoice in invoices:
            assert invoice["status"].lower() == "unpaid"
    
    def test_mark_invoice_as_paid(self, ap_api_client):
        """
        Test Case: Verify marking invoice as paid
        
        API Endpoint: POST /api/account-payable/invoices/{id}/pay
        
        Expected Result:
        - Status code: 200 OK
        - Invoice status updated to paid
        """
        # Create an unpaid invoice first
        invoice_data = UNPAID_INVOICES["valid_invoice_2"]
        create_response = ap_api_client.create_invoice(invoice_data)
        invoice_id = create_response.json()["id"]
        
        # Mark as paid
        payment_data = {
            "payment_date": "2024-11-01",
            "payment_method": "Bank Transfer",
            "reference_number": "PAY-2024-001"
        }
        
        response = ap_api_client.mark_invoice_as_paid(invoice_id, payment_data)
        
        # Verify response
        assert response.status_code == 200
        
        # Verify invoice is marked as paid
        get_response = ap_api_client.get_invoice_by_id(invoice_id)
        invoice = get_response.json()
        assert invoice["status"].lower() == "paid"
    
    # ==================== Report Tests ====================
    
    def test_get_aging_report(self, ap_api_client):
        """
        Test Case: Verify accounts payable aging report
        
        API Endpoint: GET /api/account-payable/reports/aging
        
        Expected Result:
        - Status code: 200 OK
        - Response contains aging buckets
        """
        # Get aging report
        response = ap_api_client.get_aging_report()
        
        # Verify response
        assert response.status_code == 200
        
        # Verify report structure
        report = response.json()
        assert isinstance(report, dict)
        # Add specific assertions based on your report structure
    
    def test_get_summary_report(self, ap_api_client):
        """
        Test Case: Verify accounts payable summary report
        
        API Endpoint: GET /api/account-payable/reports/summary
        
        Expected Result:
        - Status code: 200 OK
        - Response contains summary metrics
        """
        # Get summary report
        response = ap_api_client.get_summary_report()
        
        # Verify response
        assert response.status_code == 200
        
        # Verify report contains expected metrics
        summary = response.json()
        assert isinstance(summary, dict)
        # Add specific assertions for metrics


@pytest.mark.api
@pytest.mark.regression
class TestAccountPayableAPIEdgeCases:
    """Edge case and negative tests for Account Payable API"""
    
    def test_create_supplier_duplicate_name(self, ap_api_client):
        """
        Test Case: Verify duplicate supplier name is rejected
        
        Expected Result:
        - Status code: 400 Bad Request or 409 Conflict
        - Error message indicates duplicate
        """
        # Create first supplier
        supplier_data = SUPPLIERS["valid_supplier"]
        ap_api_client.create_supplier(supplier_data)
        
        # Try to create duplicate
        response = ap_api_client.create_supplier(supplier_data)
        
        # Verify error
        assert response.status_code in [400, 409]
    
    def test_create_supplier_invalid_email(self, ap_api_client):
        """
        Test Case: Verify invalid email is rejected
        
        Expected Result:
        - Status code: 400 Bad Request
        - Error message indicates invalid email
        """
        supplier_data = SUPPLIERS["invalid_supplier"]
        response = ap_api_client.create_supplier(supplier_data)
        
        # Verify error
        assert response.status_code == 400
    
    def test_get_nonexistent_supplier(self, ap_api_client):
        """
        Test Case: Verify getting non-existent supplier returns 404
        
        Expected Result:
        - Status code: 404 Not Found
        """
        response = ap_api_client.get_supplier_by_id(999999)
        assert response.status_code == 404
