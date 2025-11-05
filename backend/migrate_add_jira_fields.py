"""
Migration script to add JIRA integration fields to test_cases table
This enables linking test cases to JIRA stories and epics for dual-view support
"""

import sqlite3
from sqlalchemy import create_engine, text
from datetime import datetime
import os

# Database configuration
DATABASE_URL = "sqlite:///./test_management.db"

def migrate():
    """Add JIRA integration fields to test_cases table"""
    engine = create_engine(DATABASE_URL)
    
    print("Starting migration to add JIRA integration fields...")
    
    with engine.connect() as conn:
        try:
            # Add jira_story_id column
            conn.execute(text("ALTER TABLE test_cases ADD COLUMN jira_story_id VARCHAR(50)"))
            conn.commit()
            print("✓ Added jira_story_id column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ jira_story_id column already exists")
            else:
                print(f"✗ Error adding jira_story_id: {e}")
        
        try:
            # Add jira_epic_id column
            conn.execute(text("ALTER TABLE test_cases ADD COLUMN jira_epic_id VARCHAR(50)"))
            conn.commit()
            print("✓ Added jira_epic_id column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ jira_epic_id column already exists")
            else:
                print(f"✗ Error adding jira_epic_id: {e}")
        
        try:
            # Add jira_labels column (stored as JSON text)
            conn.execute(text("ALTER TABLE test_cases ADD COLUMN jira_labels TEXT"))
            conn.commit()
            print("✓ Added jira_labels column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("✓ jira_labels column already exists")
            else:
                print(f"✗ Error adding jira_labels: {e}")
        
        try:
            # Create indexes for better query performance
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_test_cases_jira_story_id ON test_cases(jira_story_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_test_cases_jira_epic_id ON test_cases(jira_epic_id)"))
            conn.commit()
            print("✓ Created indexes for JIRA fields")
        except Exception as e:
            print(f"✗ Error creating indexes: {e}")
    
    print("\n✓ Migration completed successfully!")
    print("\nJIRA Integration fields added:")
    print("  • jira_story_id: Links test case to a JIRA story (e.g., 'CTP-1234')")
    print("  • jira_epic_id: Links test case to a JIRA epic (e.g., 'CTP-100')")
    print("  • jira_labels: Stores JIRA labels as JSON array")
    print("\nYou can now:")
    print("  1. Assign JIRA story IDs to test cases")
    print("  2. View test cases by Module hierarchy or by JIRA stories")
    print("  3. Track test coverage for JIRA stories")

if __name__ == "__main__":
    migrate()
