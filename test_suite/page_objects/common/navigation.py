"""
Navigation Helper
Contains reusable navigation methods across the application
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class Navigation:
    """Helper class for navigation across the application"""
    
    def __init__(self, driver, base_url="http://localhost:3000"):
        """
        Initialize navigation helper
        
        Args:
            driver: Selenium WebDriver instance
            base_url: Base URL of the application
        """
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)
    
    # ==================== Main Navigation ====================
    
    def go_to_login(self):
        """Navigate to login page"""
        self.driver.get(f"{self.base_url}/login")
        time.sleep(1)
    
    def go_to_dashboard(self):
        """Navigate to dashboard"""
        self.driver.get(f"{self.base_url}/dashboard")
        time.sleep(1)
    
    def go_to_test_cases(self):
        """Navigate to test cases page"""
        self.driver.get(f"{self.base_url}/test-cases")
        time.sleep(1)
    
    def go_to_modules(self):
        """Navigate to modules page"""
        self.driver.get(f"{self.base_url}/modules")
        time.sleep(1)
    
    def go_to_releases(self):
        """Navigate to releases page"""
        self.driver.get(f"{self.base_url}/releases")
        time.sleep(1)
    
    def go_to_executions(self):
        """Navigate to executions page"""
        self.driver.get(f"{self.base_url}/executions")
        time.sleep(1)
    
    def go_to_reports(self):
        """Navigate to reports page"""
        self.driver.get(f"{self.base_url}/reports")
        time.sleep(1)
    
    def go_to_users(self):
        """Navigate to users page (admin only)"""
        self.driver.get(f"{self.base_url}/users")
        time.sleep(1)
    
    # ==================== Sidebar Navigation ====================
    
    def click_sidebar_menu(self, menu_name):
        """
        Click on sidebar menu item
        
        Args:
            menu_name: Name of the menu (Dashboard, Test Cases, Modules, etc.)
        """
        locator = (By.XPATH, f"//nav//a[contains(text(), '{menu_name}')]")
        try:
            menu = self.wait.until(EC.element_to_be_clickable(locator))
            menu.click()
            time.sleep(1)
        except Exception as e:
            print(f"Failed to click sidebar menu '{menu_name}': {e}")
    
    # ==================== Module Navigation ====================
    
    def navigate_to_module(self, module_name):
        """
        Navigate to specific module
        
        Args:
            module_name: Module name (Account Payable, Account Receivable, etc.)
        """
        # First go to dashboard or modules page
        self.go_to_dashboard()
        
        # Click on the module card or link
        locator = (By.XPATH, f"//*[contains(text(), '{module_name}')]")
        try:
            module = self.wait.until(EC.element_to_be_clickable(locator))
            module.click()
            time.sleep(1)
        except Exception as e:
            print(f"Failed to navigate to module '{module_name}': {e}")
    
    # ==================== Tab Navigation (within modules) ====================
    
    def click_tab(self, tab_name):
        """
        Click on tab within a page
        
        Args:
            tab_name: Tab name (Suppliers, Unpaid Invoices, Paid, etc.)
        """
        # Material UI tabs
        locator = (By.XPATH, f"//button[contains(@class, 'MuiTab') and contains(., '{tab_name}')]")
        try:
            tab = self.wait.until(EC.element_to_be_clickable(locator))
            tab.click()
            time.sleep(1)
        except Exception as e:
            print(f"Failed to click tab '{tab_name}': {e}")
    
    # ==================== Accordion Navigation ====================
    
    def expand_accordion(self, accordion_title):
        """
        Expand accordion by title
        
        Args:
            accordion_title: Title of the accordion to expand
        """
        locator = (By.XPATH, f"//div[contains(@class, 'MuiAccordion')]//div[contains(text(), '{accordion_title}')]")
        try:
            accordion = self.wait.until(EC.element_to_be_clickable(locator))
            # Check if already expanded
            is_expanded = accordion.get_attribute("aria-expanded") == "true"
            if not is_expanded:
                accordion.click()
                time.sleep(0.5)
        except Exception as e:
            print(f"Failed to expand accordion '{accordion_title}': {e}")
    
    def collapse_accordion(self, accordion_title):
        """
        Collapse accordion by title
        
        Args:
            accordion_title: Title of the accordion to collapse
        """
        locator = (By.XPATH, f"//div[contains(@class, 'MuiAccordion')]//div[contains(text(), '{accordion_title}')]")
        try:
            accordion = self.wait.until(EC.element_to_be_clickable(locator))
            # Check if expanded
            is_expanded = accordion.get_attribute("aria-expanded") == "true"
            if is_expanded:
                accordion.click()
                time.sleep(0.5)
        except Exception as e:
            print(f"Failed to collapse accordion '{accordion_title}': {e}")
    
    # ==================== Logout ====================
    
    def logout(self):
        """Logout from application"""
        try:
            # Look for logout button (usually in header/menu)
            logout_locators = [
                (By.XPATH, "//button[contains(text(), 'Logout')]"),
                (By.XPATH, "//a[contains(text(), 'Logout')]"),
                (By.ID, "logout-button")
            ]
            
            for locator in logout_locators:
                try:
                    logout_btn = self.wait.until(EC.element_to_be_clickable(locator))
                    logout_btn.click()
                    time.sleep(1)
                    return True
                except:
                    continue
            
            print("Logout button not found")
            return False
        except Exception as e:
            print(f"Failed to logout: {e}")
            return False
