"""
Account Payable API Client
Reusable methods for Account Payable API endpoints
"""

import requests
from api_clients.base_api_client import BaseAPIClient
from typing import Dict, Optional, List


class AccountPayableAPIClient(BaseAPIClient):
    """API client for Account Payable module"""
    
    def __init__(self, base_url: str):
        """Initialize Account Payable API client"""
        super().__init__(base_url)
        self.module_prefix = "/api/account-payable"
    
    # ==================== Supplier Methods ====================
    
    def create_supplier(self, supplier_data: Dict) -> requests.Response:
        """
        Create a new supplier
        
        Args:
            supplier_data: Supplier information
            
        Returns:
            Response object
        """
        return self.post(f"{self.module_prefix}/suppliers", json_data=supplier_data)
    
    def get_suppliers(self, params: Optional[Dict] = None) -> requests.Response:
        """
        Get list of suppliers
        
        Args:
            params: Query parameters (filters, pagination, etc.)
            
        Returns:
            Response object
        """
        return self.get(f"{self.module_prefix}/suppliers", params=params)
    
    def get_supplier_by_id(self, supplier_id: int) -> requests.Response:
        """
        Get supplier by ID
        
        Args:
            supplier_id: Supplier ID
            
        Returns:
            Response object
        """
        return self.get(f"{self.module_prefix}/suppliers/{supplier_id}")
    
    def update_supplier(self, supplier_id: int, supplier_data: Dict) -> requests.Response:
        """
        Update supplier
        
        Args:
            supplier_id: Supplier ID
            supplier_data: Updated supplier information
            
        Returns:
            Response object
        """
        return self.put(f"{self.module_prefix}/suppliers/{supplier_id}", json_data=supplier_data)
    
    def delete_supplier(self, supplier_id: int) -> requests.Response:
        """
        Delete supplier
        
        Args:
            supplier_id: Supplier ID
            
        Returns:
            Response object
        """
        return self.delete(f"{self.module_prefix}/suppliers/{supplier_id}")
    
    # ==================== Invoice Methods ====================
    
    def create_invoice(self, invoice_data: Dict) -> requests.Response:
        """
        Create a new invoice
        
        Args:
            invoice_data: Invoice information
            
        Returns:
            Response object
        """
        return self.post(f"{self.module_prefix}/invoices", json_data=invoice_data)
    
    def get_invoices(self, status: Optional[str] = None, params: Optional[Dict] = None) -> requests.Response:
        """
        Get list of invoices
        
        Args:
            status: Filter by status (unpaid, paid, overdue)
            params: Additional query parameters
            
        Returns:
            Response object
        """
        if status:
            if params is None:
                params = {}
            params['status'] = status
        
        return self.get(f"{self.module_prefix}/invoices", params=params)
    
    def get_invoice_by_id(self, invoice_id: int) -> requests.Response:
        """
        Get invoice by ID
        
        Args:
            invoice_id: Invoice ID
            
        Returns:
            Response object
        """
        return self.get(f"{self.module_prefix}/invoices/{invoice_id}")
    
    def update_invoice(self, invoice_id: int, invoice_data: Dict) -> requests.Response:
        """
        Update invoice
        
        Args:
            invoice_id: Invoice ID
            invoice_data: Updated invoice information
            
        Returns:
            Response object
        """
        return self.put(f"{self.module_prefix}/invoices/{invoice_id}", json_data=invoice_data)
    
    def mark_invoice_as_paid(self, invoice_id: int, payment_data: Dict) -> requests.Response:
        """
        Mark invoice as paid
        
        Args:
            invoice_id: Invoice ID
            payment_data: Payment information
            
        Returns:
            Response object
        """
        return self.post(f"{self.module_prefix}/invoices/{invoice_id}/pay", json_data=payment_data)
    
    def delete_invoice(self, invoice_id: int) -> requests.Response:
        """
        Delete invoice
        
        Args:
            invoice_id: Invoice ID
            
        Returns:
            Response object
        """
        return self.delete(f"{self.module_prefix}/invoices/{invoice_id}")
    
    # ==================== Payment Methods ====================
    
    def create_payment(self, payment_data: Dict) -> requests.Response:
        """
        Create a payment
        
        Args:
            payment_data: Payment information
            
        Returns:
            Response object
        """
        return self.post(f"{self.module_prefix}/payments", json_data=payment_data)
    
    def get_payments(self, params: Optional[Dict] = None) -> requests.Response:
        """
        Get list of payments
        
        Args:
            params: Query parameters
            
        Returns:
            Response object
        """
        return self.get(f"{self.module_prefix}/payments", params=params)
    
    # ==================== Report Methods ====================
    
    def get_aging_report(self, params: Optional[Dict] = None) -> requests.Response:
        """
        Get accounts payable aging report
        
        Args:
            params: Report parameters (date range, etc.)
            
        Returns:
            Response object
        """
        return self.get(f"{self.module_prefix}/reports/aging", params=params)
    
    def get_summary_report(self, params: Optional[Dict] = None) -> requests.Response:
        """
        Get accounts payable summary
        
        Args:
            params: Report parameters
            
        Returns:
            Response object
        """
        return self.get(f"{self.module_prefix}/reports/summary", params=params)
