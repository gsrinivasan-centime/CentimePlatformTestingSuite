"""
Migration script to add test_case_stories junction table for many-to-many relationship
"""
import sqlite3
from datetime import datetime

def migrate():
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    try:
        # Create test_case_stories junction table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_case_stories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_case_id INTEGER NOT NULL,
                story_id VARCHAR(50) NOT NULL,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                linked_by INTEGER,
                FOREIGN KEY (test_case_id) REFERENCES test_cases (id) ON DELETE CASCADE,
                FOREIGN KEY (story_id) REFERENCES jira_stories (story_id) ON DELETE CASCADE,
                FOREIGN KEY (linked_by) REFERENCES users (id) ON DELETE SET NULL,
                UNIQUE(test_case_id, story_id)
            )
        ''')
        
        # Create indexes for faster queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_test_case_stories_test_case ON test_case_stories(test_case_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_test_case_stories_story ON test_case_stories(story_id)')
        
        # Migrate existing data from test_cases.jira_story_id to the new table
        cursor.execute('''
            INSERT OR IGNORE INTO test_case_stories (test_case_id, story_id, linked_at)
            SELECT id, jira_story_id, created_at
            FROM test_cases
            WHERE jira_story_id IS NOT NULL AND jira_story_id != ''
        ''')
        
        conn.commit()
        print("✓ Successfully created test_case_stories table and migrated existing data")
        print("Note: The jira_story_id column in test_cases table is kept for backward compatibility")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error during migration: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting migration: Add test_case_stories junction table...")
    migrate()
    print("Migration completed!")
