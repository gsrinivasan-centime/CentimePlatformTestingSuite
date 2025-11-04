"""
Base API Client
Provides common HTTP methods for API testing
"""

import requests
from typing import Dict, Optional, Any
import json


class BaseAPIClient:
    """Base class for all API clients"""
    
    def __init__(self, base_url: str):
        """
        Initialize API client
        
        Args:
            base_url: Base URL for the API
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.token = None
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def set_token(self, token: str):
        """
        Set authentication token
        
        Args:
            token: JWT token or API key
        """
        self.token = token
        self.headers["Authorization"] = f"Bearer {token}"
        self.session.headers.update(self.headers)
    
    def clear_token(self):
        """Clear authentication token"""
        self.token = None
        if "Authorization" in self.headers:
            del self.headers["Authorization"]
        self.session.headers.update(self.headers)
    
    def _build_url(self, endpoint: str) -> str:
        """
        Build full URL from endpoint
        
        Args:
            endpoint: API endpoint path
            
        Returns:
            Full URL
        """
        endpoint = endpoint.lstrip('/')
        return f"{self.base_url}/{endpoint}"
    
    def get(self, endpoint: str, params: Optional[Dict] = None, **kwargs) -> requests.Response:
        """
        Send GET request
        
        Args:
            endpoint: API endpoint
            params: Query parameters
            **kwargs: Additional arguments for requests
            
        Returns:
            Response object
        """
        url = self._build_url(endpoint)
        response = self.session.get(url, params=params, headers=self.headers, **kwargs)
        return response
    
    def post(self, endpoint: str, data: Optional[Dict] = None, 
             json_data: Optional[Dict] = None, **kwargs) -> requests.Response:
        """
        Send POST request
        
        Args:
            endpoint: API endpoint
            data: Form data (for form-urlencoded)
            json_data: JSON data
            **kwargs: Additional arguments for requests
            
        Returns:
            Response object
        """
        url = self._build_url(endpoint)
        
        if json_data:
            response = self.session.post(url, json=json_data, headers=self.headers, **kwargs)
        else:
            response = self.session.post(url, data=data, headers=self.headers, **kwargs)
        
        return response
    
    def put(self, endpoint: str, data: Optional[Dict] = None,
            json_data: Optional[Dict] = None, **kwargs) -> requests.Response:
        """
        Send PUT request
        
        Args:
            endpoint: API endpoint
            data: Form data
            json_data: JSON data
            **kwargs: Additional arguments for requests
            
        Returns:
            Response object
        """
        url = self._build_url(endpoint)
        
        if json_data:
            response = self.session.put(url, json=json_data, headers=self.headers, **kwargs)
        else:
            response = self.session.put(url, data=data, headers=self.headers, **kwargs)
        
        return response
    
    def patch(self, endpoint: str, data: Optional[Dict] = None,
              json_data: Optional[Dict] = None, **kwargs) -> requests.Response:
        """
        Send PATCH request
        
        Args:
            endpoint: API endpoint
            data: Form data
            json_data: JSON data
            **kwargs: Additional arguments for requests
            
        Returns:
            Response object
        """
        url = self._build_url(endpoint)
        
        if json_data:
            response = self.session.patch(url, json=json_data, headers=self.headers, **kwargs)
        else:
            response = self.session.patch(url, data=data, headers=self.headers, **kwargs)
        
        return response
    
    def delete(self, endpoint: str, **kwargs) -> requests.Response:
        """
        Send DELETE request
        
        Args:
            endpoint: API endpoint
            **kwargs: Additional arguments for requests
            
        Returns:
            Response object
        """
        url = self._build_url(endpoint)
        response = self.session.delete(url, headers=self.headers, **kwargs)
        return response
    
    # ==================== Helper Methods ====================
    
    def verify_status_code(self, response: requests.Response, expected_code: int) -> bool:
        """
        Verify response status code
        
        Args:
            response: Response object
            expected_code: Expected status code
            
        Returns:
            True if matches, False otherwise
        """
        return response.status_code == expected_code
    
    def verify_response_contains(self, response: requests.Response, key: str) -> bool:
        """
        Verify response JSON contains a key
        
        Args:
            response: Response object
            key: Key to check for
            
        Returns:
            True if key exists, False otherwise
        """
        try:
            data = response.json()
            return key in data
        except:
            return False
    
    def get_response_value(self, response: requests.Response, key: str) -> Any:
        """
        Get value from response JSON
        
        Args:
            response: Response object
            key: Key to retrieve
            
        Returns:
            Value or None
        """
        try:
            data = response.json()
            return data.get(key)
        except:
            return None
    
    def print_response(self, response: requests.Response):
        """
        Print response details (for debugging)
        
        Args:
            response: Response object
        """
        print(f"\nStatus Code: {response.status_code}")
        print(f"Headers: {response.headers}")
        try:
            print(f"Body: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Body: {response.text}")
