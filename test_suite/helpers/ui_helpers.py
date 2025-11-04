"""
Common Test Steps
Reusable step functions that can be used across multiple tests
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class CommonSteps:
    """Reusable test steps for all tests"""
    
    @staticmethod
    def login(driver, email, password, base_url="http://localhost:3000"):
        """
        Perform login action
        
        Args:
            driver: Selenium WebDriver
            email: User email
            password: User password
            base_url: Application base URL
        """
        # Navigate to login
        driver.get(f"{base_url}/login")
        time.sleep(1)
        
        # Enter credentials
        email_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "email"))
        )
        email_field.send_keys(email)
        
        password_field = driver.find_element(By.ID, "password")
        password_field.send_keys(password)
        
        # Click login
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        login_button.click()
        
        # Wait for dashboard
        WebDriverWait(driver, 10).until(EC.url_contains("/dashboard"))
    
    @staticmethod
    def logout(driver):
        """
        Perform logout action
        
        Args:
            driver: Selenium WebDriver
        """
        try:
            logout_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Logout')]"))
            )
            logout_button.click()
            time.sleep(1)
        except:
            print("Logout button not found")
    
    @staticmethod
    def navigate_to_module(driver, module_name, base_url="http://localhost:3000"):
        """
        Navigate to a specific module
        
        Args:
            driver: Selenium WebDriver
            module_name: Name of the module
            base_url: Application base URL
        """
        driver.get(f"{base_url}/dashboard")
        time.sleep(1)
        
        module_card = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//*[contains(text(), '{module_name}')]"))
        )
        module_card.click()
        time.sleep(1)
    
    @staticmethod
    def click_tab(driver, tab_name):
        """
        Click on a tab
        
        Args:
            driver: Selenium WebDriver
            tab_name: Name of the tab to click
        """
        tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//button[contains(., '{tab_name}')]"))
        )
        tab.click()
        time.sleep(1)
    
    @staticmethod
    def expand_accordion(driver, accordion_title):
        """
        Expand an accordion
        
        Args:
            driver: Selenium WebDriver
            accordion_title: Title of the accordion
        """
        accordion = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//div[contains(text(), '{accordion_title}')]"))
        )
        
        # Check if already expanded
        is_expanded = accordion.get_attribute("aria-expanded") == "true"
        if not is_expanded:
            accordion.click()
            time.sleep(0.5)
    
    @staticmethod
    def fill_form_field(driver, field_id, value):
        """
        Fill a form field
        
        Args:
            driver: Selenium WebDriver
            field_id: Field ID
            value: Value to enter
        """
        field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, field_id))
        )
        field.clear()
        field.send_keys(value)
    
    @staticmethod
    def click_button(driver, button_text):
        """
        Click a button by text
        
        Args:
            driver: Selenium WebDriver
            button_text: Text on the button
        """
        button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, f"//button[contains(text(), '{button_text}')]"))
        )
        button.click()
        time.sleep(0.5)
    
    @staticmethod
    def verify_success_message(driver, message_text=None):
        """
        Verify success message appears
        
        Args:
            driver: Selenium WebDriver
            message_text: Optional specific message text to verify
            
        Returns:
            True if success message found, False otherwise
        """
        try:
            if message_text:
                success_msg = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{message_text}')]"))
                )
            else:
                # Look for generic success indicators
                success_msg = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".success, .MuiAlert-standardSuccess"))
                )
            return success_msg.is_displayed()
        except:
            return False
    
    @staticmethod
    def verify_error_message(driver, message_text=None):
        """
        Verify error message appears
        
        Args:
            driver: Selenium WebDriver
            message_text: Optional specific message text to verify
            
        Returns:
            True if error message found, False otherwise
        """
        try:
            if message_text:
                error_msg = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{message_text}')]"))
                )
            else:
                # Look for generic error indicators
                error_msg = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".error, .MuiAlert-standardError"))
                )
            return error_msg.is_displayed()
        except:
            return False
    
    @staticmethod
    def take_screenshot(driver, filename):
        """
        Take a screenshot
        
        Args:
            driver: Selenium WebDriver
            filename: Path to save screenshot
        """
        try:
            driver.save_screenshot(filename)
            print(f"Screenshot saved: {filename}")
        except Exception as e:
            print(f"Failed to save screenshot: {e}")
    
    @staticmethod
    def wait_for_page_load(driver, timeout=10):
        """
        Wait for page to fully load
        
        Args:
            driver: Selenium WebDriver
            timeout: Timeout in seconds
        """
        WebDriverWait(driver, timeout).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
