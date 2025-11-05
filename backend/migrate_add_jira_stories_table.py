"""
Migration script to create jira_stories table
This enables managing JIRA stories and linking test cases to them
"""

from sqlalchemy import create_engine, text
from datetime import datetime

# Database configuration
DATABASE_URL = "sqlite:///./test_management.db"

def migrate():
    """Create jira_stories table"""
    engine = create_engine(DATABASE_URL)
    
    print("Starting migration to create jira_stories table...")
    
    with engine.connect() as conn:
        try:
            # Create jira_stories table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS jira_stories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    story_id VARCHAR(50) UNIQUE NOT NULL,
                    epic_id VARCHAR(50),
                    title VARCHAR NOT NULL,
                    description TEXT,
                    status VARCHAR(50),
                    priority VARCHAR(20),
                    assignee VARCHAR,
                    sprint VARCHAR,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """))
            conn.commit()
            print("✓ Created jira_stories table")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("✓ jira_stories table already exists")
            else:
                print(f"✗ Error creating jira_stories table: {e}")
        
        try:
            # Create indexes for better query performance
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jira_stories_story_id ON jira_stories(story_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jira_stories_epic_id ON jira_stories(epic_id)"))
            conn.commit()
            print("✓ Created indexes for jira_stories table")
        except Exception as e:
            print(f"✗ Error creating indexes: {e}")
    
    print("\n✓ Migration completed successfully!")
    print("\nJIRA Stories table created with fields:")
    print("  • story_id: Unique JIRA story ID (e.g., 'CTP-1234')")
    print("  • epic_id: JIRA epic ID (e.g., 'CTP-100')")
    print("  • title: Story title/summary")
    print("  • description: Detailed description")
    print("  • status: Story status (To Do, In Progress, Done)")
    print("  • priority: Priority level (High, Medium, Low)")
    print("  • assignee: Person assigned to the story")
    print("  • sprint: Sprint name/number")
    print("\nYou can now:")
    print("  1. Create and manage JIRA stories in the system")
    print("  2. Link test cases to stories")
    print("  3. View test cases organized by stories")
    print("  4. Add test cases to releases by story")

if __name__ == "__main__":
    migrate()
