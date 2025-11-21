from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test_management.db"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    ALLOWED_EMAIL_DOMAIN: str = "centime.com"
    
    # Email Configuration (Gmail SMTP - Free)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""  # Your Gmail address
    SMTP_PASSWORD: str = ""  # Gmail app password (not regular password)
    SMTP_FROM_EMAIL: str = ""  # Sender email
    SMTP_FROM_NAME: str = "Centime Test Management"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    
    # JIRA Integration
    JIRA_SERVER: str = ""
    JIRA_EMAIL: str = ""
    JIRA_API_TOKEN: str = ""

    # Google Drive Integration (Optional)
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GOOGLE_DRIVE_FOLDER_ID: str = ""
    
    # Confluence Integration (Alternative to Google Drive)
    CONFLUENCE_URL: str = ""  # e.g., https://your-company.atlassian.net/wiki
    CONFLUENCE_EMAIL: str = ""  # Same as JIRA email usually
    CONFLUENCE_API_TOKEN: str = ""  # Same as JIRA token if using Atlassian Cloud
    CONFLUENCE_SPACE_KEY: str = ""  # Space where attachments will be stored
    CONFLUENCE_PAGE_ID: str = ""  # Page ID where attachments will be uploaded
    
    # File Storage Backend Selection
    FILE_STORAGE_BACKEND: str = "confluence"  # Options: "confluence" or "google_drive"
    
    model_config = SettingsConfigDict(env_file=".env")
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS as comma-separated string"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

settings = Settings()
