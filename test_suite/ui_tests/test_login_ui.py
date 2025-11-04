"""
Test Case ID: TC_UI_001
Module: Account Payable
Test Type: Automated UI Test
Description: Test login functionality for Cash Management System
Author: QA Team

REFACTORED: Now using Page Object Model for better maintainability
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from page_objects.common.login_page import LoginPage
from page_objects.common.dashboard_page import DashboardPage
from fixtures.test_data import VALID_USERS, INVALID_USERS


@pytest.mark.ui
@pytest.mark.smoke
@pytest.mark.account_payable
class TestLoginFunctionality:
    """Test suite for login functionality using Page Object Model"""
    
    def test_successful_login(self, driver, base_url):
        """
        Test Case: Verify successful login with valid credentials
        
        Steps:
        1. Navigate to login page
        2. Enter valid email address
        3. Enter valid password
        4. Click login button
        5. Verify user is redirected to dashboard
        
        Expected Result:
        - User should be successfully logged in
        - Dashboard page should be displayed
        - User name/email should be visible in header
        """
        # Initialize page objects
        login_page = LoginPage(driver, base_url)
        dashboard_page = DashboardPage(driver, base_url)
        
        # Get test credentials
        admin_user = VALID_USERS["admin"]
        
        # Perform login
        login_page.navigate()
        login_page.login(admin_user["email"], admin_user["password"])
        
        # Verify successful login
        assert login_page.is_login_successful(), "User not redirected to dashboard"
        assert dashboard_page.is_dashboard_displayed(), "Dashboard not displayed"
        
        # Take screenshot for evidence
        login_page.take_screenshot("test_suite/reports/screenshots/login_success.png")
        
    def test_invalid_credentials(self, driver, base_url):
        """
        Test Case: Verify login fails with invalid credentials
        
        Steps:
        1. Navigate to login page
        2. Enter invalid email
        3. Enter invalid password
        4. Click login button
        5. Verify error message is displayed
        
        Expected Result:
        - Login should fail
        - Error message should be displayed
        - User should remain on login page
        """
        # Initialize page object
        login_page = LoginPage(driver, base_url)
        
        # Get invalid credentials
        invalid_user = INVALID_USERS["wrong_password"]
        
        # Perform login with invalid credentials
        login_page.navigate()
        login_page.login(invalid_user["email"], invalid_user["password"])
        
        # Verify error message is displayed
        assert login_page.is_error_message_displayed(), "Error message not displayed"
        
        error_text = login_page.get_error_message()
        if error_text:
            assert "invalid" in error_text.lower() or "incorrect" in error_text.lower(), \
                "Error message doesn't indicate invalid credentials"
        
        # Verify still on login page
        assert login_page.is_login_page_displayed(), "User redirected from login page"
        
        # Take screenshot for evidence
        login_page.take_screenshot("test_suite/reports/screenshots/login_failure.png")
    
    def test_empty_credentials(self, driver, base_url):
        """
        Test Case: Verify validation for empty credentials
        
        Steps:
        1. Navigate to login page
        2. Leave email and password fields empty
        3. Click login button
        4. Verify validation messages are displayed
        
        Expected Result:
        - Validation messages should be displayed
        - Login button should be disabled or form should not submit
        """
        # Initialize page object
        login_page = LoginPage(driver, base_url)
        
        # Navigate to login page
        login_page.navigate()
        
        # Click login without entering credentials
        login_page.click_login()
        
        # Verify still on login page (form validation prevented submission)
        assert login_page.is_login_page_displayed(), "Form submitted with empty fields"
        
        # Check for HTML5 validation messages
        email_validation = login_page.get_email_validation_message()
        button_enabled = login_page.is_login_button_enabled()
        
        assert email_validation or not button_enabled, "No validation for empty fields"
