"""
Migration script to add email verification fields to User model
Run this script once to update the database schema
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, Column, Boolean, DateTime
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import User

# Database URL
DATABASE_URL = "sqlite:///./test_management.db"

def migrate():
    """Add email verification fields to users table"""
    engine = create_engine(DATABASE_URL)
    
    # Add columns using raw SQL (since SQLite doesn't support ALTER TABLE ADD COLUMN with all constraints)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            # Add is_email_verified column
            conn.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0"))
            conn.commit()
            print("✓ Added is_email_verified column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ is_email_verified column already exists")
            else:
                print(f"✗ Error adding is_email_verified: {e}")
        
        try:
            # Add email_verified_at column
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified_at DATETIME"))
            conn.commit()
            print("✓ Added email_verified_at column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ email_verified_at column already exists")
            else:
                print(f"✗ Error adding email_verified_at: {e}")
    
    print("\n✓ Migration completed successfully!")
    print("\nNote: Existing users will have is_email_verified=False by default.")
    print("You may want to manually verify existing users in the database.")

if __name__ == "__main__":
    print("Starting migration to add email verification fields...")
    migrate()
