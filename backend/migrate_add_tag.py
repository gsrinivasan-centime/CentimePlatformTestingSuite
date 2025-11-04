#!/usr/bin/env python3
"""
Migration script to add tag column to test_cases table
This field categorizes tests as UI, API, or Hybrid
Test IDs will be auto-generated based on tag: TC_UI_{n}, TC_API_{n}, TC_HYBRID_{n}
"""

import sqlite3
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import engine
from app.models.models import Base

def migrate_database():
    """Add tag column to test_cases table"""
    db_path = "test_management.db"
    
    print("Starting migration: Add tag column...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(test_cases)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'tag' in columns:
            print("✓ Column 'tag' already exists. Skipping migration.")
            conn.close()
            return
        
        # Add the tag column
        print("Adding tag column to test_cases table...")
        cursor.execute("""
            ALTER TABLE test_cases 
            ADD COLUMN tag VARCHAR(10) NOT NULL DEFAULT 'ui'
            CHECK(tag IN ('ui', 'api', 'hybrid'))
        """)
        
        # Set default values based on test_id patterns
        print("Setting tag values based on existing test_id patterns...")
        
        # Set 'api' for test IDs containing 'API'
        cursor.execute("""
            UPDATE test_cases 
            SET tag = 'api' 
            WHERE test_id LIKE '%API%' OR test_id LIKE '%api%'
        """)
        api_count = cursor.rowcount
        
        # Set 'ui' for test IDs containing 'UI'  
        cursor.execute("""
            UPDATE test_cases 
            SET tag = 'ui' 
            WHERE test_id LIKE '%UI%' OR test_id LIKE '%ui%'
        """)
        ui_count = cursor.rowcount
        
        # The rest remain 'ui' (default)
        cursor.execute("""
            SELECT COUNT(*) FROM test_cases 
            WHERE tag = 'ui' AND test_id NOT LIKE '%UI%' AND test_id NOT LIKE '%ui%'
        """)
        default_count = cursor.fetchone()[0]
        
        conn.commit()
        print("✓ Successfully added tag column")
        print(f"✓ Set tag='api' for {api_count} test cases")
        print(f"✓ Set tag='ui' for {ui_count} test cases")
        print(f"✓ {default_count} other test cases defaulted to 'ui'")
        
        # Verify the migration
        cursor.execute("SELECT tag, COUNT(*) FROM test_cases GROUP BY tag")
        tag_counts = cursor.fetchall()
        print("\n✓ Tag distribution:")
        for tag, count in tag_counts:
            print(f"  - {tag}: {count} test cases")
        
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
