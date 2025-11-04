"""
Base Page Object
Contains common methods used by all page objects
"""

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time


class BasePage:
    """Base class for all page objects"""
    
    def __init__(self, driver, base_url="http://localhost:3000"):
        """
        Initialize base page
        
        Args:
            driver: Selenium WebDriver instance
            base_url: Base URL of the application
        """
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)
        self.short_wait = WebDriverWait(driver, 5)
    
    # ==================== Navigation Methods ====================
    
    def navigate_to(self, path):
        """
        Navigate to a specific path
        
        Args:
            path: URL path (e.g., '/login', '/dashboard')
        """
        url = f"{self.base_url}{path}"
        self.driver.get(url)
        time.sleep(1)  # Allow page to load
    
    def get_current_url(self):
        """Get current URL"""
        return self.driver.current_url
    
    def get_page_title(self):
        """Get page title"""
        return self.driver.title
    
    def refresh_page(self):
        """Refresh current page"""
        self.driver.refresh()
        time.sleep(1)
    
    # ==================== Element Interaction Methods ====================
    
    def find_element(self, locator, timeout=10):
        """
        Find element with wait
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            timeout: Wait timeout in seconds
            
        Returns:
            WebElement or None
        """
        try:
            wait = WebDriverWait(self.driver, timeout)
            element = wait.until(EC.presence_of_element_located(locator))
            return element
        except TimeoutException:
            print(f"Element not found: {locator}")
            return None
    
    def find_elements(self, locator, timeout=10):
        """
        Find multiple elements with wait
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            timeout: Wait timeout in seconds
            
        Returns:
            List of WebElements
        """
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.presence_of_element_located(locator))
            return self.driver.find_elements(*locator)
        except TimeoutException:
            print(f"Elements not found: {locator}")
            return []
    
    def click_element(self, locator, timeout=10):
        """
        Click on element with wait
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            timeout: Wait timeout in seconds
        """
        element = self.wait_for_clickable(locator, timeout)
        if element:
            element.click()
            time.sleep(0.5)  # Small delay after click
    
    def enter_text(self, locator, text, clear_first=True, timeout=10):
        """
        Enter text into input field
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            text: Text to enter
            clear_first: Clear field before entering text
            timeout: Wait timeout in seconds
        """
        element = self.find_element(locator, timeout)
        if element:
            if clear_first:
                element.clear()
            element.send_keys(text)
    
    def get_text(self, locator, timeout=10):
        """
        Get text from element
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            timeout: Wait timeout in seconds
            
        Returns:
            Element text or None
        """
        element = self.find_element(locator, timeout)
        return element.text if element else None
    
    def get_attribute(self, locator, attribute, timeout=10):
        """
        Get attribute value from element
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            attribute: Attribute name
            timeout: Wait timeout in seconds
            
        Returns:
            Attribute value or None
        """
        element = self.find_element(locator, timeout)
        return element.get_attribute(attribute) if element else None
    
    # ==================== Wait Methods ====================
    
    def wait_for_element(self, locator, timeout=10):
        """Wait for element to be present"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            return wait.until(EC.presence_of_element_located(locator))
        except TimeoutException:
            return None
    
    def wait_for_visible(self, locator, timeout=10):
        """Wait for element to be visible"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            return wait.until(EC.visibility_of_element_located(locator))
        except TimeoutException:
            return None
    
    def wait_for_clickable(self, locator, timeout=10):
        """Wait for element to be clickable"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            return wait.until(EC.element_to_be_clickable(locator))
        except TimeoutException:
            return None
    
    def wait_for_url_contains(self, text, timeout=10):
        """Wait for URL to contain specific text"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.url_contains(text))
            return True
        except TimeoutException:
            return False
    
    def wait_for_text_in_element(self, locator, text, timeout=10):
        """Wait for specific text to appear in element"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.text_to_be_present_in_element(locator, text))
            return True
        except TimeoutException:
            return False
    
    # ==================== Verification Methods ====================
    
    def is_element_present(self, locator, timeout=5):
        """
        Check if element is present
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            timeout: Wait timeout in seconds
            
        Returns:
            True if element present, False otherwise
        """
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.presence_of_element_located(locator))
            return True
        except TimeoutException:
            return False
    
    def is_element_visible(self, locator, timeout=5):
        """
        Check if element is visible
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            timeout: Wait timeout in seconds
            
        Returns:
            True if element visible, False otherwise
        """
        try:
            wait = WebDriverWait(self.driver, timeout)
            element = wait.until(EC.visibility_of_element_located(locator))
            return element.is_displayed()
        except (TimeoutException, NoSuchElementException):
            return False
    
    def is_element_clickable(self, locator, timeout=5):
        """
        Check if element is clickable
        
        Args:
            locator: Tuple of (By.TYPE, "locator_value")
            timeout: Wait timeout in seconds
            
        Returns:
            True if element clickable, False otherwise
        """
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.element_to_be_clickable(locator))
            return True
        except TimeoutException:
            return False
    
    # ==================== Screenshot Methods ====================
    
    def take_screenshot(self, filename):
        """
        Take screenshot and save to file
        
        Args:
            filename: Full path to save screenshot
        """
        try:
            self.driver.save_screenshot(filename)
            print(f"Screenshot saved: {filename}")
        except Exception as e:
            print(f"Failed to save screenshot: {e}")
    
    # ==================== Alert/Modal Methods ====================
    
    def accept_alert(self, timeout=5):
        """Accept browser alert"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            alert = wait.until(EC.alert_is_present())
            alert.accept()
            return True
        except TimeoutException:
            return False
    
    def dismiss_alert(self, timeout=5):
        """Dismiss browser alert"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            alert = wait.until(EC.alert_is_present())
            alert.dismiss()
            return True
        except TimeoutException:
            return False
    
    def get_alert_text(self, timeout=5):
        """Get alert text"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            alert = wait.until(EC.alert_is_present())
            return alert.text
        except TimeoutException:
            return None
    
    # ==================== Scroll Methods ====================
    
    def scroll_to_element(self, locator):
        """Scroll to element"""
        element = self.find_element(locator)
        if element:
            self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
            time.sleep(0.5)
    
    def scroll_to_bottom(self):
        """Scroll to bottom of page"""
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(0.5)
    
    def scroll_to_top(self):
        """Scroll to top of page"""
        self.driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(0.5)



