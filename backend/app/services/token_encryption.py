"""
Token Encryption Service
Provides secure encryption/decryption for OAuth tokens using Fernet symmetric encryption
"""
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class TokenEncryptionService:
    """Service for encrypting and decrypting OAuth tokens"""
    
    def __init__(self):
        self._fernet = None
        self._initialize_fernet()
    
    def _initialize_fernet(self):
        """Initialize Fernet cipher with encryption key from settings"""
        if settings.TOKEN_ENCRYPTION_KEY:
            try:
                self._fernet = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())
                logger.info("Token encryption service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Fernet cipher: {e}")
                self._fernet = None
        else:
            logger.warning("TOKEN_ENCRYPTION_KEY not configured - token encryption disabled")
    
    @property
    def is_configured(self) -> bool:
        """Check if encryption is properly configured"""
        return self._fernet is not None
    
    def encrypt(self, plain_text: str) -> str:
        """
        Encrypt a plain text string (e.g., OAuth token)
        
        Args:
            plain_text: The string to encrypt
            
        Returns:
            Base64-encoded encrypted string
            
        Raises:
            ValueError: If encryption is not configured
        """
        if not self.is_configured:
            raise ValueError("Token encryption is not configured. Set TOKEN_ENCRYPTION_KEY in environment.")
        
        if not plain_text:
            return ""
        
        try:
            encrypted = self._fernet.encrypt(plain_text.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise ValueError(f"Failed to encrypt token: {e}")
    
    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt an encrypted string back to plain text
        
        Args:
            encrypted_text: Base64-encoded encrypted string
            
        Returns:
            Decrypted plain text string
            
        Raises:
            ValueError: If decryption fails or encryption is not configured
        """
        if not self.is_configured:
            raise ValueError("Token encryption is not configured. Set TOKEN_ENCRYPTION_KEY in environment.")
        
        if not encrypted_text:
            return ""
        
        try:
            decrypted = self._fernet.decrypt(encrypted_text.encode())
            return decrypted.decode()
        except InvalidToken:
            logger.error("Decryption failed: Invalid token or wrong key")
            raise ValueError("Failed to decrypt token: Invalid token or encryption key mismatch")
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError(f"Failed to decrypt token: {e}")


# Singleton instance
token_encryption_service = TokenEncryptionService()
