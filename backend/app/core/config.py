from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test_management.db"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    ALLOWED_EMAIL_DOMAIN: str = "centime.com"
    
    # JIRA Integration
    JIRA_SERVER: str = ""
    JIRA_EMAIL: str = ""
    JIRA_API_TOKEN: str = ""
    
    model_config = SettingsConfigDict(env_file=".env")
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS as comma-separated string"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

settings = Settings()
