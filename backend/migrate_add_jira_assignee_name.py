"""
Migration script to add jira_assignee_name column to issues table
"""
import sqlite3

def migrate():
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(issues)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'jira_assignee_name' not in columns:
            print("Adding jira_assignee_name column to issues table...")
            cursor.execute("""
                ALTER TABLE issues 
                ADD COLUMN jira_assignee_name VARCHAR(255)
            """)
            conn.commit()
            print("✓ Successfully added jira_assignee_name column")
        else:
            print("✓ jira_assignee_name column already exists")
            
    except Exception as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
