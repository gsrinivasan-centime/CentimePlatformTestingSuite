import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'test_management.db')

def migrate():
    print(f"Migrating database at {DB_PATH}...")
    
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist to avoid errors
        cursor.execute("PRAGMA table_info(issues)")
        columns = [info[1] for info in cursor.fetchall()]
        
        # Add video_url
        if 'video_url' not in columns:
            print("Adding video_url column...")
            cursor.execute("ALTER TABLE issues ADD COLUMN video_url TEXT")
            
        # Add screenshot_urls
        if 'screenshot_urls' not in columns:
            print("Adding screenshot_urls column...")
            cursor.execute("ALTER TABLE issues ADD COLUMN screenshot_urls TEXT")
            
        # Add jira_assignee_id
        if 'jira_assignee_id' not in columns:
            print("Adding jira_assignee_id column...")
            cursor.execute("ALTER TABLE issues ADD COLUMN jira_assignee_id VARCHAR(100)")
            
        # Add reporter_name
        if 'reporter_name' not in columns:
            print("Adding reporter_name column...")
            cursor.execute("ALTER TABLE issues ADD COLUMN reporter_name VARCHAR(100)")
            
        # Add jira_story_id linkage if not present (though we might use existing link tables, 
        # the user mentioned linking to story. The model already has test_case_id, module_id, release_id.
        # We should add jira_story_id to the issues table for direct linkage if desired, 
        # or we can rely on the text description. 
        # The user said "linked to story or a test case". 
        # Let's add jira_story_id column for direct linking.
        if 'jira_story_id' not in columns:
            print("Adding jira_story_id column...")
            cursor.execute("ALTER TABLE issues ADD COLUMN jira_story_id VARCHAR(50)")
            
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
