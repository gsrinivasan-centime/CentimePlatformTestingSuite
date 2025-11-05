"""
Migration script to add release field to jira_stories table
"""
import sqlite3
from pathlib import Path

def migrate():
    db_path = Path(__file__).parent / "test_management.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if release column already exists
        cursor.execute("PRAGMA table_info(jira_stories)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'release' in columns:
            print("✓ Release column already exists in jira_stories table")
        else:
            # Add release column
            cursor.execute("""
                ALTER TABLE jira_stories 
                ADD COLUMN release VARCHAR(100) DEFAULT NULL
            """)
            conn.commit()
            print("✓ Successfully added release column to jira_stories table")
        
    except Exception as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Add release field to jira_stories table")
    migrate()
    print("Migration completed!")
