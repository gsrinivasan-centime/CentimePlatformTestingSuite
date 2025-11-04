#!/usr/bin/env python3
"""
Migration script to add automation_status column to test_cases table
This field tracks whether automated tests are working or broken
Manual tests will have NULL for this field
"""

import sqlite3
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import engine
from app.models.models import Base

def migrate_database():
    """Add automation_status column to test_cases table"""
    db_path = "test_management.db"
    
    print("Starting migration: Add automation_status column...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(test_cases)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'automation_status' in columns:
            print("✓ Column 'automation_status' already exists. Skipping migration.")
            conn.close()
            return
        
        # Add the automation_status column
        print("Adding automation_status column to test_cases table...")
        cursor.execute("""
            ALTER TABLE test_cases 
            ADD COLUMN automation_status VARCHAR(10) 
            CHECK(automation_status IN ('working', 'broken') OR automation_status IS NULL)
        """)
        
        # Set default values: working for existing automated tests, NULL for manual
        print("Setting default values for existing test cases...")
        cursor.execute("""
            UPDATE test_cases 
            SET automation_status = 'working' 
            WHERE test_type = 'automated'
        """)
        
        conn.commit()
        print("✓ Successfully added automation_status column")
        print(f"✓ Set default status 'working' for {cursor.rowcount} automated test cases")
        
        # Verify the migration
        cursor.execute("SELECT COUNT(*) FROM test_cases WHERE test_type = 'automated' AND automation_status = 'working'")
        count = cursor.fetchone()[0]
        print(f"✓ Verified: {count} automated tests have 'working' status")
        
        cursor.execute("SELECT COUNT(*) FROM test_cases WHERE test_type = 'manual' AND automation_status IS NULL")
        count = cursor.fetchone()[0]
        print(f"✓ Verified: {count} manual tests have NULL status")
        
        conn.close()
        print("\n✓ Migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
        if conn:
            conn.rollback()
            conn.close()
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_database()
