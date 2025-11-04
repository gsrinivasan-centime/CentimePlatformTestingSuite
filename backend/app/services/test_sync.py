"""
Test Case Sync Service
Syncs test cases between database and actual pytest test files
"""
import os
import ast
import re
from typing import Optional, Dict, Any
from pathlib import Path

# Base path for test suite
TEST_SUITE_PATH = Path(__file__).parent.parent.parent.parent / "test_suite"


class TestCaseSync:
    """Handles syncing between DB test cases and pytest files"""
    
    @staticmethod
    def get_test_file_path(test_type: str, module_name: str, test_case_id: str) -> str:
        """
        Generate file path for a test case
        test_type: 'UI', 'API', 'MANUAL'
        module_name: 'Account Payable', etc.
        test_case_id: 'TC_UI_001', etc.
        """
        # Determine test directory based on type
        if test_type.upper() == 'UI':
            test_dir = TEST_SUITE_PATH / "ui_tests"
        elif test_type.upper() == 'API':
            test_dir = TEST_SUITE_PATH / "api_tests"
        else:
            # Manual tests don't have files
            return None
        
        # Create safe filename from module name
        module_safe = module_name.lower().replace(' ', '_')
        test_file = f"test_{module_safe}.py"
        
        return str(test_dir / test_file)
    
    @staticmethod
    def extract_test_info_from_file(file_path: str) -> Dict[str, Any]:
        """Extract test case information from pytest file"""
        if not os.path.exists(file_path):
            return None
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            tree = ast.parse(content)
            test_methods = []
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                    docstring = ast.get_docstring(node)
                    test_methods.append({
                        'method_name': node.name,
                        'docstring': docstring or ''
                    })
            
            return {
                'file_path': file_path,
                'test_methods': test_methods
            }
        except Exception as e:
            print(f"Error parsing file {file_path}: {e}")
            return None
    
    @staticmethod
    def create_test_file(file_path: str, test_case_id: str, title: str, 
                        description: str, test_type: str, module_name: str) -> bool:
        """Create a new pytest file with test case"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Generate test method name from test_case_id
            method_name = test_case_id.lower().replace('-', '_')
            
            if test_type.upper() == 'UI':
                template = TestCaseSync._get_ui_test_template(
                    method_name, test_case_id, title, description, module_name
                )
            else:  # API
                template = TestCaseSync._get_api_test_template(
                    method_name, test_case_id, title, description, module_name
                )
            
            # Check if file exists, if so, append to it
            if os.path.exists(file_path):
                with open(file_path, 'a') as f:
                    f.write(f"\n\n{template}")
            else:
                # Create new file with imports and class
                full_content = TestCaseSync._get_file_header(test_type, module_name)
                full_content += template
                full_content += "\n"
                
                with open(file_path, 'w') as f:
                    f.write(full_content)
            
            return True
        except Exception as e:
            print(f"Error creating test file: {e}")
            return False
    
    @staticmethod
    def _get_file_header(test_type: str, module_name: str) -> str:
        """Get file header with imports"""
        if test_type.upper() == 'UI':
            return f'''"""
UI Tests for {module_name}
Auto-generated test file from Centime Test Management System
"""
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@pytest.fixture
def driver():
    """Setup WebDriver"""
    driver = webdriver.Chrome()
    driver.implicitly_wait(10)
    yield driver
    driver.quit()


class Test{module_name.replace(' ', '')}:
    """Test class for {module_name}"""

'''
        else:  # API
            return f'''"""
API Tests for {module_name}
Auto-generated test file from Centime Test Management System
"""
import pytest
import requests


BASE_URL = "http://localhost:8000/api"


class Test{module_name.replace(' ', '')}API:
    """API test class for {module_name}"""

'''
    
    @staticmethod
    def _get_ui_test_template(method_name: str, test_id: str, 
                             title: str, description: str, module_name: str) -> str:
        """Generate UI test method template"""
        return f'''    def test_{method_name}(self, driver):
        """
        Test ID: {test_id}
        Title: {title}
        Description: {description}
        Module: {module_name}
        """
        # TODO: Implement test steps
        # Step 1: Navigate to page
        # driver.get("URL")
        
        # Step 2: Interact with elements
        # element = driver.find_element(By.ID, "element_id")
        # element.click()
        
        # Step 3: Assert results
        # assert expected == actual
        
        pytest.skip("Test implementation pending")
'''
    
    @staticmethod
    def _get_api_test_template(method_name: str, test_id: str,
                               title: str, description: str, module_name: str) -> str:
        """Generate API test method template"""
        return f'''    def test_{method_name}(self):
        """
        Test ID: {test_id}
        Title: {title}
        Description: {description}
        Module: {module_name}
        """
        # TODO: Implement API test
        # response = requests.get(f"{{BASE_URL}}/endpoint")
        # assert response.status_code == 200
        # assert "expected_field" in response.json()
        
        pytest.skip("Test implementation pending")
'''
    
    @staticmethod
    def update_test_docstring(file_path: str, test_case_id: str, 
                             title: str, description: str) -> bool:
        """Update test method docstring when test case is edited"""
        if not os.path.exists(file_path):
            return False
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Find the test method and update its docstring
            method_name = test_case_id.lower().replace('-', '_')
            pattern = rf'(def test_{method_name}\(.*?\):)\s*""".*?"""'
            
            new_docstring = f'''\\1
        """
        Test ID: {test_case_id}
        Title: {title}
        Description: {description}
        """'''
            
            updated_content = re.sub(pattern, new_docstring, content, flags=re.DOTALL)
            
            with open(file_path, 'w') as f:
                f.write(updated_content)
            
            return True
        except Exception as e:
            print(f"Error updating test docstring: {e}")
            return False
    
    @staticmethod
    def delete_test_method(file_path: str, test_case_id: str) -> bool:
        """Delete test method from file when test case is deleted"""
        if not os.path.exists(file_path):
            return False
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Find and remove the test method
            method_name = test_case_id.lower().replace('-', '_')
            # Pattern to match entire method including docstring and body
            pattern = rf'\s*def test_{method_name}\(.*?\):.*?(?=\n    def |\n\nclass |\Z)'
            
            updated_content = re.sub(pattern, '', content, flags=re.DOTALL)
            
            with open(file_path, 'w') as f:
                f.write(updated_content)
            
            return True
        except Exception as e:
            print(f"Error deleting test method: {e}")
            return False
    
    @staticmethod
    def scan_test_suite() -> Dict[str, list]:
        """
        Scan test_suite directory and return all test files with their test methods
        This can be used to sync DB with existing test files
        """
        result = {
            'ui_tests': [],
            'api_tests': []
        }
        
        # Scan UI tests
        ui_dir = TEST_SUITE_PATH / "ui_tests"
        if ui_dir.exists():
            for file in ui_dir.glob("test_*.py"):
                if file.name != "test_conftest.py":
                    info = TestCaseSync.extract_test_info_from_file(str(file))
                    if info:
                        result['ui_tests'].append(info)
        
        # Scan API tests
        api_dir = TEST_SUITE_PATH / "api_tests"
        if api_dir.exists():
            for file in api_dir.glob("test_*.py"):
                if file.name != "test_conftest.py":
                    info = TestCaseSync.extract_test_info_from_file(str(file))
                    if info:
                        result['api_tests'].append(info)
        
        return result
