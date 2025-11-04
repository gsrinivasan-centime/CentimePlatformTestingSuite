"""
Login Page Object
Contains all elements and methods for login page
"""

from selenium.webdriver.common.by import By
from test_suite.page_objects.common.base_page import BasePage
import time


class LoginPage(BasePage):
    """Page object for login page"""
    
    # ==================== Locators ====================
    
    EMAIL_INPUT = (By.ID, "email")
    PASSWORD_INPUT = (By.ID, "password")
    LOGIN_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    ERROR_MESSAGE = (By.CLASS_NAME, "error-message")
    REGISTER_LINK = (By.XPATH, "//a[contains(text(), 'Register')]")
    
    # Alternative error message locators
    ERROR_ALERT = (By.CSS_SELECTOR, ".MuiAlert-message")
    ERROR_TEXT = (By.XPATH, "//*[contains(@class, 'error') or contains(@class, 'Error')]")
    
    def __init__(self, driver, base_url="http://localhost:3000"):
        """Initialize login page"""
        super().__init__(driver, base_url)
        self.page_path = "/login"
    
    # ==================== Actions ====================
    
    def navigate(self):
        """Navigate to login page"""
        self.navigate_to(self.page_path)
        return self
    
    def enter_email(self, email):
        """
        Enter email address
        
        Args:
            email: Email address to enter
        """
        self.enter_text(self.EMAIL_INPUT, email, clear_first=True)
        return self
    
    def enter_password(self, password):
        """
        Enter password
        
        Args:
            password: Password to enter
        """
        self.enter_text(self.PASSWORD_INPUT, password, clear_first=True)
        return self
    
    def click_login(self):
        """Click login button"""
        self.click_element(self.LOGIN_BUTTON)
        time.sleep(1)  # Wait for login processing
        return self
    
    def login(self, email, password):
        """
        Perform complete login action
        
        Args:
            email: Email address
            password: Password
        """
        self.enter_email(email)
        self.enter_password(password)
        self.click_login()
        return self
    
    def click_register_link(self):
        """Click on register link"""
        self.click_element(self.REGISTER_LINK)
        return self
    
    # ==================== Verifications ====================
    
    def is_login_page_displayed(self):
        """
        Check if login page is displayed
        
        Returns:
            True if on login page, False otherwise
        """
        return "/login" in self.get_current_url()
    
    def is_login_button_enabled(self):
        """
        Check if login button is enabled
        
        Returns:
            True if enabled, False otherwise
        """
        return self.is_element_clickable(self.LOGIN_BUTTON)
    
    def is_error_message_displayed(self):
        """
        Check if error message is displayed
        
        Returns:
            True if error message visible, False otherwise
        """
        # Try multiple error message locators
        return (self.is_element_visible(self.ERROR_MESSAGE, timeout=3) or
                self.is_element_visible(self.ERROR_ALERT, timeout=3) or
                self.is_element_visible(self.ERROR_TEXT, timeout=3))
    
    def get_error_message(self):
        """
        Get error message text
        
        Returns:
            Error message text or None
        """
        # Try different error message locators
        error_text = self.get_text(self.ERROR_MESSAGE, timeout=3)
        if error_text:
            return error_text
        
        error_text = self.get_text(self.ERROR_ALERT, timeout=3)
        if error_text:
            return error_text
        
        error_text = self.get_text(self.ERROR_TEXT, timeout=3)
        return error_text
    
    def get_email_validation_message(self):
        """
        Get HTML5 validation message for email field
        
        Returns:
            Validation message or None
        """
        return self.get_attribute(self.EMAIL_INPUT, "validationMessage")
    
    def get_password_validation_message(self):
        """
        Get HTML5 validation message for password field
        
        Returns:
            Validation message or None
        """
        return self.get_attribute(self.PASSWORD_INPUT, "validationMessage")
    
    def is_login_successful(self, timeout=10):
        """
        Check if login was successful (redirected to dashboard)
        
        Args:
            timeout: Wait timeout in seconds
            
        Returns:
            True if redirected to dashboard, False otherwise
        """
        return self.wait_for_url_contains("/dashboard", timeout=timeout)
    
    # ==================== Helper Methods ====================
    
    def clear_email_field(self):
        """Clear email input field"""
        element = self.find_element(self.EMAIL_INPUT)
        if element:
            element.clear()
        return self
    
    def clear_password_field(self):
        """Clear password input field"""
        element = self.find_element(self.PASSWORD_INPUT)
        if element:
            element.clear()
        return self
    
    def clear_all_fields(self):
        """Clear all input fields"""
        self.clear_email_field()
        self.clear_password_field()
        return self
