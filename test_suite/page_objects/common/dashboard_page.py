"""
Dashboard Page Object
Contains all elements and methods for dashboard page
"""

from selenium.webdriver.common.by import By
from test_suite.page_objects.common.base_page import BasePage


class DashboardPage(BasePage):
    """Page object for dashboard page"""
    
    # ==================== Locators ====================
    
    PAGE_TITLE = (By.XPATH, "//h1[contains(text(), 'Dashboard')]")
    USER_PROFILE = (By.CSS_SELECTOR, ".user-profile")
    LOGOUT_BUTTON = (By.XPATH, "//button[contains(text(), 'Logout')]")
    
    # Module cards
    ACCOUNT_PAYABLE_CARD = (By.XPATH, "//*[contains(text(), 'Account Payable')]")
    ACCOUNT_RECEIVABLE_CARD = (By.XPATH, "//*[contains(text(), 'Account Receivable')]")
    CASH_FLOW_CARD = (By.XPATH, "//*[contains(text(), 'Cash Flow')]")
    BANKING_CARD = (By.XPATH, "//*[contains(text(), 'Banking')]")
    
    # Stats/metrics
    TOTAL_TEST_CASES = (By.XPATH, "//*[contains(text(), 'Total Test Cases')]/following-sibling::*")
    PASSED_TESTS = (By.XPATH, "//*[contains(text(), 'Passed')]/following-sibling::*")
    FAILED_TESTS = (By.XPATH, "//*[contains(text(), 'Failed')]/following-sibling::*")
    
    def __init__(self, driver, base_url="http://localhost:3000"):
        """Initialize dashboard page"""
        super().__init__(driver, base_url)
        self.page_path = "/dashboard"
    
    # ==================== Actions ====================
    
    def navigate(self):
        """Navigate to dashboard page"""
        self.navigate_to(self.page_path)
        return self
    
    def click_account_payable_module(self):
        """Click on Account Payable module"""
        self.click_element(self.ACCOUNT_PAYABLE_CARD)
        return self
    
    def click_account_receivable_module(self):
        """Click on Account Receivable module"""
        self.click_element(self.ACCOUNT_RECEIVABLE_CARD)
        return self
    
    def click_cash_flow_module(self):
        """Click on Cash Flow module"""
        self.click_element(self.CASH_FLOW_CARD)
        return self
    
    def click_banking_module(self):
        """Click on Banking module"""
        self.click_element(self.BANKING_CARD)
        return self
    
    def logout(self):
        """Logout from dashboard"""
        self.click_element(self.LOGOUT_BUTTON)
        return self
    
    # ==================== Verifications ====================
    
    def is_dashboard_displayed(self):
        """
        Check if dashboard page is displayed
        
        Returns:
            True if on dashboard, False otherwise
        """
        return ("/dashboard" in self.get_current_url() and
                self.is_element_visible(self.PAGE_TITLE, timeout=5))
    
    def is_user_logged_in(self):
        """
        Check if user is logged in (dashboard accessible)
        
        Returns:
            True if logged in, False otherwise
        """
        return self.is_dashboard_displayed()
    
    def get_page_title_text(self):
        """
        Get dashboard page title
        
        Returns:
            Title text or None
        """
        return self.get_text(self.PAGE_TITLE)
    
    # ==================== Data Retrieval ====================
    
    def get_total_test_cases_count(self):
        """
        Get total test cases count from dashboard
        
        Returns:
            Test cases count as string
        """
        return self.get_text(self.TOTAL_TEST_CASES)
    
    def get_passed_tests_count(self):
        """
        Get passed tests count from dashboard
        
        Returns:
            Passed tests count as string
        """
        return self.get_text(self.PASSED_TESTS)
    
    def get_failed_tests_count(self):
        """
        Get failed tests count from dashboard
        
        Returns:
            Failed tests count as string
        """
        return self.get_text(self.FAILED_TESTS)
