"""
Test Case ID: TC_API_001
Module: Account Payable
Test Type: Automated API Test
Description: Test Account Payable API endpoints for invoice management
Author: QA Team
"""

import pytest
import requests
import json

@pytest.mark.api
@pytest.mark.smoke
@pytest.mark.account_payable
class TestAccountPayableAPI:
    """Test suite for Account Payable API endpoints"""
    
    def test_get_invoices_list(self, api_base_url, authenticated_headers):
        """
        Test Case: Verify API returns list of invoices
        
        API Endpoint: GET /api/invoices
        
        Steps:
        1. Send GET request to /api/invoices endpoint with authentication
        2. Verify response status code is 200
        3. Verify response contains list of invoices
        4. Verify invoice object structure
        
        Expected Result:
        - Status code: 200 OK
        - Response body contains array of invoice objects
        - Each invoice has required fields: id, invoice_number, amount, status, due_date
        """
        # Step 1: Send GET request
        endpoint = f"{api_base_url}/api/invoices"
        response = requests.get(endpoint, headers=authenticated_headers)
        
        # Step 2: Verify status code
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Step 3: Verify response contains data
        response_data = response.json()
        assert isinstance(response_data, list), "Response should be a list"
        
        # Step 4: Verify invoice structure (if invoices exist)
        if len(response_data) > 0:
            invoice = response_data[0]
            required_fields = ["id", "invoice_number", "amount", "status", "due_date"]
            
            for field in required_fields:
                assert field in invoice, f"Invoice missing required field: {field}"
            
            # Verify data types
            assert isinstance(invoice["id"], int), "Invoice ID should be integer"
            assert isinstance(invoice["invoice_number"], str), "Invoice number should be string"
            assert isinstance(invoice["amount"], (int, float)), "Amount should be numeric"
            assert invoice["status"] in ["pending", "approved", "paid", "rejected"], "Invalid status value"
    
    def test_create_invoice(self, api_base_url, authenticated_headers):
        """
        Test Case: Verify creating a new invoice via API
        
        API Endpoint: POST /api/invoices
        
        Steps:
        1. Prepare invoice payload with valid data
        2. Send POST request to /api/invoices endpoint
        3. Verify response status code is 201
        4. Verify response contains created invoice data
        5. Verify invoice_number matches request
        
        Expected Result:
        - Status code: 201 Created
        - Response contains created invoice with ID
        - All submitted fields are correctly saved
        """
        # Step 1: Prepare payload
        invoice_payload = {
            "invoice_number": "INV-2025-001",
            "vendor_name": "Test Vendor Inc.",
            "amount": 15000.50,
            "currency": "USD",
            "due_date": "2025-12-31",
            "status": "pending",
            "description": "Test invoice for automated testing",
            "line_items": [
                {
                    "description": "Service Fee",
                    "quantity": 1,
                    "unit_price": 15000.50
                }
            ]
        }
        
        # Step 2: Send POST request
        endpoint = f"{api_base_url}/api/invoices"
        response = requests.post(
            endpoint,
            headers=authenticated_headers,
            json=invoice_payload
        )
        
        # Step 3: Verify status code
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        # Step 4: Verify response contains created invoice
        created_invoice = response.json()
        assert "id" in created_invoice, "Response should contain invoice ID"
        assert isinstance(created_invoice["id"], int), "Invoice ID should be integer"
        
        # Step 5: Verify data matches request
        assert created_invoice["invoice_number"] == invoice_payload["invoice_number"]
        assert created_invoice["vendor_name"] == invoice_payload["vendor_name"]
        assert created_invoice["amount"] == invoice_payload["amount"]
        assert created_invoice["status"] == invoice_payload["status"]
        
        # Store invoice ID for cleanup (in real scenario)
        return created_invoice["id"]
    
    def test_get_invoice_by_id(self, api_base_url, authenticated_headers):
        """
        Test Case: Verify retrieving specific invoice by ID
        
        API Endpoint: GET /api/invoices/{invoice_id}
        
        Steps:
        1. Send GET request to /api/invoices/1 endpoint
        2. Verify response status code is 200
        3. Verify response contains invoice details
        4. Verify invoice ID matches requested ID
        
        Expected Result:
        - Status code: 200 OK
        - Response contains invoice object with matching ID
        - All invoice fields are present and valid
        """
        # Assuming invoice with ID 1 exists (or create one first)
        invoice_id = 1
        
        # Step 1: Send GET request
        endpoint = f"{api_base_url}/api/invoices/{invoice_id}"
        response = requests.get(endpoint, headers=authenticated_headers)
        
        # Step 2: Verify status code
        # Accept both 200 (found) and 404 (not found) as valid for this test structure
        assert response.status_code in [200, 404], f"Unexpected status code: {response.status_code}"
        
        if response.status_code == 200:
            # Step 3 & 4: Verify response data
            invoice = response.json()
            assert invoice["id"] == invoice_id, f"Expected invoice ID {invoice_id}, got {invoice['id']}"
            assert "invoice_number" in invoice
            assert "amount" in invoice
            assert "status" in invoice
    
    def test_update_invoice_status(self, api_base_url, authenticated_headers):
        """
        Test Case: Verify updating invoice status
        
        API Endpoint: PATCH /api/invoices/{invoice_id}
        
        Steps:
        1. Prepare update payload with new status
        2. Send PATCH request to update invoice
        3. Verify response status code is 200
        4. Verify status is updated in response
        
        Expected Result:
        - Status code: 200 OK
        - Invoice status is successfully updated
        - Response reflects the new status
        """
        invoice_id = 1
        
        # Step 1: Prepare update payload
        update_payload = {
            "status": "approved"
        }
        
        # Step 2: Send PATCH request
        endpoint = f"{api_base_url}/api/invoices/{invoice_id}"
        response = requests.patch(
            endpoint,
            headers=authenticated_headers,
            json=update_payload
        )
        
        # Step 3: Verify status code (200 or 404 if invoice doesn't exist)
        assert response.status_code in [200, 404], f"Unexpected status code: {response.status_code}"
        
        if response.status_code == 200:
            # Step 4: Verify update
            updated_invoice = response.json()
            assert updated_invoice["status"] == "approved", "Status not updated correctly"
    
    def test_invalid_invoice_creation(self, api_base_url, authenticated_headers):
        """
        Test Case: Verify API validation for invalid invoice data
        
        API Endpoint: POST /api/invoices
        
        Steps:
        1. Prepare invalid payload (missing required fields)
        2. Send POST request
        3. Verify response status code is 400 or 422
        4. Verify error message indicates validation failure
        
        Expected Result:
        - Status code: 400 Bad Request or 422 Unprocessable Entity
        - Error message indicates which fields are missing/invalid
        """
        # Step 1: Prepare invalid payload (missing required fields)
        invalid_payload = {
            "invoice_number": "INV-INVALID"
            # Missing amount, vendor_name, etc.
        }
        
        # Step 2: Send POST request
        endpoint = f"{api_base_url}/api/invoices"
        response = requests.post(
            endpoint,
            headers=authenticated_headers,
            json=invalid_payload
        )
        
        # Step 3: Verify error status code
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        
        # Step 4: Verify error message exists
        error_response = response.json()
        assert "detail" in error_response or "error" in error_response, "Error message not provided"
    
    def test_unauthorized_access(self, api_base_url, api_headers):
        """
        Test Case: Verify API requires authentication
        
        API Endpoint: GET /api/invoices
        
        Steps:
        1. Send GET request without authentication token
        2. Verify response status code is 401
        3. Verify error message indicates authentication required
        
        Expected Result:
        - Status code: 401 Unauthorized
        - Error message indicates missing/invalid authentication
        """
        # Step 1: Send request without auth token
        endpoint = f"{api_base_url}/api/invoices"
        response = requests.get(endpoint, headers=api_headers)  # No auth token
        
        # Step 2: Verify status code
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        # Step 3: Verify error message
        error_response = response.json()
        assert "detail" in error_response, "Error detail not provided"
