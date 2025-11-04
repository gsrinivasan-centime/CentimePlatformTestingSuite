"""
Consolidated Pytest Configuration for Test Suite
Single conftest.py for all UI and API tests
"""

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import requests
import os
import sys

# Add test_suite to path for imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import test data
from fixtures.test_data import VALID_USERS, API_ENDPOINTS


# ==================== Configuration ====================

@pytest.fixture(scope="session")
def base_url():
    """Base URL for the frontend application"""
    return os.getenv("BASE_URL", "http://localhost:3000")


@pytest.fixture(scope="session")
def api_base_url():
    """Base URL for API endpoints"""
    return os.getenv("API_BASE_URL", "http://localhost:8000")


# ==================== Browser Configuration ====================

@pytest.fixture(scope="session")
def browser_options():
    """Configure Chrome browser options"""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    # Uncomment for headless mode (useful for CI/CD)
    # chrome_options.add_argument("--headless")
    
    return chrome_options


@pytest.fixture(scope="function")
def driver(browser_options):
    """
    Create and configure Selenium WebDriver instance
    Scope: Function - new driver for each test
    """
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=browser_options)
    driver.implicitly_wait(10)
    
    yield driver
    
    # Teardown
    driver.quit()


@pytest.fixture(scope="class")
def driver_class(browser_options):
    """
    Create WebDriver instance with class scope
    Use this when multiple tests in a class can share the same browser session
    """
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=browser_options)
    driver.implicitly_wait(10)
    
    yield driver
    
    # Teardown
    driver.quit()


# ==================== Test Credentials ====================

@pytest.fixture(scope="session")
def admin_credentials():
    """Admin user credentials"""
    return VALID_USERS["admin"]


@pytest.fixture(scope="session")
def tester_credentials():
    """Tester user credentials"""
    return VALID_USERS["tester"]


@pytest.fixture(scope="session")
def test_credentials():
    """Default test credentials (admin)"""
    return VALID_USERS["admin"]


# ==================== Page Object Fixtures ====================

@pytest.fixture
def login_page(driver, base_url):
    """Create LoginPage instance"""
    from page_objects.common.login_page import LoginPage
    return LoginPage(driver, base_url)


@pytest.fixture
def dashboard_page(driver, base_url):
    """Create DashboardPage instance"""
    from page_objects.common.dashboard_page import DashboardPage
    return DashboardPage(driver, base_url)


@pytest.fixture
def navigation(driver, base_url):
    """Create Navigation helper instance"""
    from page_objects.common.navigation import Navigation
    return Navigation(driver, base_url)


@pytest.fixture
def suppliers_page(driver, base_url):
    """Create SuppliersPage instance"""
    from page_objects.account_payable.suppliers_page import SuppliersPage
    return SuppliersPage(driver, base_url)


# ==================== Authentication Fixtures ====================

@pytest.fixture
def logged_in_driver(driver, login_page, admin_credentials):
    """
    Fixture that returns a driver with user already logged in
    Useful for tests that don't need to test login itself
    """
    login_page.navigate()
    login_page.login(
        admin_credentials["email"],
        admin_credentials["password"]
    )
    
    # Wait for dashboard to load
    login_page.wait_for_url_contains("/dashboard", timeout=10)
    
    yield driver
    
    # No need to logout, driver will be cleaned up


@pytest.fixture
def logged_in_as_admin(driver, login_page, admin_credentials):
    """Login as admin user"""
    login_page.navigate()
    login_page.login(
        admin_credentials["email"],
        admin_credentials["password"]
    )
    login_page.wait_for_url_contains("/dashboard", timeout=10)
    return driver


@pytest.fixture
def logged_in_as_tester(driver, login_page, tester_credentials):
    """Login as tester user"""
    login_page.navigate()
    login_page.login(
        tester_credentials["email"],
        tester_credentials["password"]
    )
    login_page.wait_for_url_contains("/dashboard", timeout=10)
    return driver


# ==================== API Fixtures ====================

@pytest.fixture(scope="session")
def api_headers():
    """Common headers for API requests"""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }


@pytest.fixture(scope="session")
def auth_token(api_base_url, admin_credentials):
    """
    Get authentication token for API tests
    Uses admin credentials by default
    """
    auth_payload = {
        "username": admin_credentials["email"],
        "password": admin_credentials["password"]
    }
    
    try:
        response = requests.post(
            f"{api_base_url}/api/auth/login",
            data=auth_payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            token_data = response.json()
            return token_data.get("access_token")
    except Exception as e:
        print(f"Failed to get auth token: {e}")
    
    return None


@pytest.fixture(scope="function")
def authenticated_headers(api_headers, auth_token):
    """Headers with authentication token"""
    headers = api_headers.copy()
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    return headers


@pytest.fixture(scope="session")
def api_client(api_base_url):
    """Create API client instance"""
    from api_clients.base_api_client import BaseAPIClient
    return BaseAPIClient(api_base_url)


@pytest.fixture(scope="session")
def authenticated_api_client(api_base_url, admin_credentials):
    """
    Create authenticated API client
    Performs login and returns client with token
    """
    from api_clients.base_api_client import BaseAPIClient
    
    client = BaseAPIClient(api_base_url)
    
    # Login to get token
    response = client.post("/api/auth/login", data={
        "username": admin_credentials["email"],
        "password": admin_credentials["password"]
    })
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        client.set_token(token)
    
    return client


@pytest.fixture(scope="session")
def ap_api_client(authenticated_api_client):
    """Account Payable API client"""
    from api_clients.account_payable_api_client import AccountPayableAPIClient
    
    # Create AP client with same base URL and token
    ap_client = AccountPayableAPIClient(authenticated_api_client.base_url)
    ap_client.token = authenticated_api_client.token
    ap_client.headers = authenticated_api_client.headers.copy()
    
    return ap_client


# ==================== Screenshot Fixtures ====================

@pytest.fixture
def screenshot_on_failure(request, driver):
    """
    Take screenshot on test failure
    Usage: Add this fixture to any test
    """
    yield
    
    if hasattr(request.node, 'rep_call') and request.node.rep_call.failed:
        # Create screenshots directory if not exists
        screenshots_dir = "test_suite/reports/screenshots"
        os.makedirs(screenshots_dir, exist_ok=True)
        
        # Generate screenshot filename
        test_name = request.node.name
        screenshot_path = f"{screenshots_dir}/{test_name}_failure.png"
        
        # Take screenshot
        driver.save_screenshot(screenshot_path)
        print(f"Screenshot saved: {screenshot_path}")


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Hook to get test result for screenshot fixture
    """
    outcome = yield
    rep = outcome.get_result()
    setattr(item, "rep_" + rep.when, rep)


# ==================== Test Data Fixtures ====================

@pytest.fixture
def supplier_test_data():
    """Get supplier test data"""
    from fixtures.test_data import SUPPLIERS
    return SUPPLIERS


@pytest.fixture
def invoice_test_data():
    """Get invoice test data"""
    from fixtures.test_data import UNPAID_INVOICES, PAID_INVOICES
    return {
        "unpaid": UNPAID_INVOICES,
        "paid": PAID_INVOICES
    }


@pytest.fixture
def customer_test_data():
    """Get customer test data"""
    from fixtures.test_data import CUSTOMERS
    return CUSTOMERS


# ==================== Database Fixtures ====================

@pytest.fixture(scope="function")
def clean_database():
    """
    Clean database before test
    Use this for tests that need a clean slate
    """
    # TODO: Implement database cleanup
    # from helpers.database_helper import DatabaseHelper
    # db = DatabaseHelper()
    # db.clean_test_data()
    pass


# ==================== Pytest Configuration ====================

def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line("markers", "smoke: Quick smoke tests")
    config.addinivalue_line("markers", "regression: Full regression tests")
    config.addinivalue_line("markers", "ui: UI tests")
    config.addinivalue_line("markers", "api: API tests")
    config.addinivalue_line("markers", "account_payable: Account Payable module tests")
    config.addinivalue_line("markers", "account_receivable: Account Receivable module tests")
    config.addinivalue_line("markers", "cash_flow: Cash Flow module tests")
    config.addinivalue_line("markers", "banking: Banking module tests")
    config.addinivalue_line("markers", "suppliers: Suppliers feature tests")
    config.addinivalue_line("markers", "invoices: Invoices feature tests")
    config.addinivalue_line("markers", "slow: Tests that take longer to execute")


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection
    Add markers dynamically based on test location
    """
    for item in items:
        # Add markers based on directory structure
        if "ui_tests" in str(item.fspath):
            item.add_marker(pytest.mark.ui)
        if "api_tests" in str(item.fspath):
            item.add_marker(pytest.mark.api)
        if "account_payable" in str(item.fspath):
            item.add_marker(pytest.mark.account_payable)


# ==================== Custom Pytest Options ====================

def pytest_addoption(parser):
    """Add custom command line options"""
    parser.addoption(
        "--browser",
        action="store",
        default="chrome",
        help="Browser to run tests: chrome, firefox, edge"
    )
    parser.addoption(
        "--headless",
        action="store_true",
        default=False,
        help="Run browser in headless mode"
    )
    parser.addoption(
        "--slow",
        action="store_true",
        default=False,
        help="Run slow tests"
    )
