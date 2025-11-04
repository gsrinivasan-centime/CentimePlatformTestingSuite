"""
Suppliers Page Object
Page object for Suppliers tab in Account Payable module
Demonstrates scalable pattern for feature-specific pages
"""

from selenium.webdriver.common.by import By
from page_objects.common.base_page import BasePage


class SuppliersPage(BasePage):
    """Page object for Suppliers feature in Account Payable"""
    
    # ==================== Locators ====================
    
    # Tab navigation
    SUPPLIERS_TAB = (By.XPATH, "//button[contains(., 'Suppliers')]")
    
    # List view
    SUPPLIERS_TABLE = (By.CSS_SELECTOR, ".suppliers-table")
    TABLE_ROWS = (By.CSS_SELECTOR, ".suppliers-table tbody tr")
    SEARCH_INPUT = (By.ID, "supplier-search")
    FILTER_BUTTON = (By.CSS_SELECTOR, "button[aria-label='Filter']")
    
    # Create accordion
    CREATE_ACCORDION = (By.XPATH, "//div[contains(text(), 'Create Supplier')]")
    SUPPLIER_NAME_INPUT = (By.ID, "supplier-name")
    SUPPLIER_EMAIL_INPUT = (By.ID, "supplier-email")
    SUPPLIER_PHONE_INPUT = (By.ID, "supplier-phone")
    SUPPLIER_ADDRESS_INPUT = (By.ID, "supplier-address")
    SUPPLIER_TAX_ID_INPUT = (By.ID, "supplier-tax-id")
    PAYMENT_TERMS_SELECT = (By.ID, "payment-terms")
    SAVE_SUPPLIER_BUTTON = (By.XPATH, "//button[contains(text(), 'Save Supplier')]")
    CANCEL_BUTTON = (By.XPATH, "//button[contains(text(), 'Cancel')]")
    
    # Edit/View
    EDIT_BUTTONS = (By.CSS_SELECTOR, "button[aria-label='Edit']")
    DELETE_BUTTONS = (By.CSS_SELECTOR, "button[aria-label='Delete']")
    VIEW_BUTTONS = (By.CSS_SELECTOR, "button[aria-label='View']")
    
    # Messages
    SUCCESS_MESSAGE = (By.CSS_SELECTOR, ".MuiAlert-standardSuccess")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".MuiAlert-standardError")
    
    # Confirmation dialog
    CONFIRM_DELETE_BUTTON = (By.XPATH, "//button[contains(text(), 'Confirm')]")
    
    def __init__(self, driver, base_url="http://localhost:3000"):
        """Initialize Suppliers page"""
        super().__init__(driver, base_url)
        self.page_path = "/account-payable"
    
    # ==================== Navigation Actions ====================
    
    def navigate(self):
        """Navigate to Account Payable page"""
        self.navigate_to(self.page_path)
        return self
    
    def click_suppliers_tab(self):
        """Click on Suppliers tab"""
        self.click_element(self.SUPPLIERS_TAB)
        return self
    
    # ==================== Create Accordion Actions ====================
    
    def expand_create_accordion(self):
        """Expand the Create Supplier accordion"""
        if not self.is_create_accordion_expanded():
            self.click_element(self.CREATE_ACCORDION)
        return self
    
    def is_create_accordion_expanded(self):
        """Check if create accordion is expanded"""
        element = self.find_element(self.CREATE_ACCORDION, timeout=5)
        if element:
            return element.get_attribute("aria-expanded") == "true"
        return False
    
    def fill_supplier_form(self, supplier_data):
        """
        Fill supplier creation form
        
        Args:
            supplier_data: Dictionary with supplier fields
        """
        self.expand_create_accordion()
        
        if "name" in supplier_data:
            self.enter_text(self.SUPPLIER_NAME_INPUT, supplier_data["name"])
        
        if "email" in supplier_data:
            self.enter_text(self.SUPPLIER_EMAIL_INPUT, supplier_data["email"])
        
        if "phone" in supplier_data:
            self.enter_text(self.SUPPLIER_PHONE_INPUT, supplier_data["phone"])
        
        if "address" in supplier_data:
            self.enter_text(self.SUPPLIER_ADDRESS_INPUT, supplier_data["address"])
        
        if "tax_id" in supplier_data:
            self.enter_text(self.SUPPLIER_TAX_ID_INPUT, supplier_data["tax_id"])
        
        if "payment_terms" in supplier_data:
            # TODO: Handle dropdown selection
            pass
        
        return self
    
    def click_save_supplier(self):
        """Click Save Supplier button"""
        self.click_element(self.SAVE_SUPPLIER_BUTTON)
        return self
    
    def click_cancel(self):
        """Click Cancel button"""
        self.click_element(self.CANCEL_BUTTON)
        return self
    
    def create_supplier(self, supplier_data):
        """
        Complete workflow to create a supplier
        
        Args:
            supplier_data: Dictionary with supplier information
        """
        self.expand_create_accordion()
        self.fill_supplier_form(supplier_data)
        self.click_save_supplier()
        return self
    
    # ==================== List View Actions ====================
    
    def search_supplier(self, search_term):
        """
        Search for supplier
        
        Args:
            search_term: Search text
        """
        self.enter_text(self.SEARCH_INPUT, search_term)
        return self
    
    def get_suppliers_count(self):
        """
        Get count of suppliers in table
        
        Returns:
            Number of supplier rows
        """
        rows = self.find_elements(self.TABLE_ROWS, timeout=5)
        return len(rows)
    
    def is_supplier_in_list(self, supplier_name):
        """
        Check if supplier exists in list
        
        Args:
            supplier_name: Name of supplier to find
            
        Returns:
            True if found, False otherwise
        """
        locator = (By.XPATH, f"//td[contains(text(), '{supplier_name}')]")
        return self.is_element_present(locator, timeout=5)
    
    def click_edit_supplier(self, supplier_name):
        """
        Click edit button for specific supplier
        
        Args:
            supplier_name: Name of supplier to edit
        """
        # Find the row with supplier name, then click edit button in that row
        row_locator = (By.XPATH, f"//td[contains(text(), '{supplier_name}')]/ancestor::tr")
        row = self.find_element(row_locator)
        if row:
            edit_button = row.find_element(By.CSS_SELECTOR, "button[aria-label='Edit']")
            edit_button.click()
        return self
    
    def click_delete_supplier(self, supplier_name):
        """
        Click delete button for specific supplier
        
        Args:
            supplier_name: Name of supplier to delete
        """
        row_locator = (By.XPATH, f"//td[contains(text(), '{supplier_name}')]/ancestor::tr")
        row = self.find_element(row_locator)
        if row:
            delete_button = row.find_element(By.CSS_SELECTOR, "button[aria-label='Delete']")
            delete_button.click()
        return self
    
    def confirm_delete(self):
        """Confirm deletion in confirmation dialog"""
        self.click_element(self.CONFIRM_DELETE_BUTTON)
        return self
    
    # ==================== Verification Methods ====================
    
    def is_suppliers_page_displayed(self):
        """Check if on suppliers page"""
        return self.is_element_visible(self.SUPPLIERS_TAB, timeout=5)
    
    def is_success_message_displayed(self):
        """Check if success message is shown"""
        return self.is_element_visible(self.SUCCESS_MESSAGE, timeout=5)
    
    def is_error_message_displayed(self):
        """Check if error message is shown"""
        return self.is_element_visible(self.ERROR_MESSAGE, timeout=5)
    
    def get_success_message(self):
        """Get success message text"""
        return self.get_text(self.SUCCESS_MESSAGE, timeout=5)
    
    def get_error_message(self):
        """Get error message text"""
        return self.get_text(self.ERROR_MESSAGE, timeout=5)
