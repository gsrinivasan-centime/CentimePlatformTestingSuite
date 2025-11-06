"""
Migration: Add last_synced_at column to jira_stories table
"""
import sqlite3
from datetime import datetime

def migrate():
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(jira_stories)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'last_synced_at' not in columns:
            print("Adding last_synced_at column to jira_stories table...")
            cursor.execute("""
                ALTER TABLE jira_stories 
                ADD COLUMN last_synced_at TIMESTAMP
            """)
            conn.commit()
            print("✓ Migration completed successfully!")
        else:
            print("✓ Column last_synced_at already exists. Skipping migration.")
        
        # Display current table structure
        cursor.execute("PRAGMA table_info(jira_stories)")
        columns = cursor.fetchall()
        print("\nCurrent jira_stories table structure:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
