"""
Migration: Add Issues Table

This migration creates the 'issues' table for the internal Issue Tracker.
"""

import sqlite3
from datetime import datetime

def run_migration():
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    try:
        print("Starting issues table migration...")
        
        # Create issues table
        print("\n1. Creating issues table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'Open', -- Open, In Progress, Closed, Resolved
                priority VARCHAR(20) DEFAULT 'Medium', -- High, Medium, Low, Critical
                severity VARCHAR(20) DEFAULT 'Major', -- Critical, Major, Minor, Trivial
                
                -- Linkages
                module_id INTEGER,
                release_id INTEGER,
                test_case_id INTEGER,
                
                -- Metadata
                created_by INTEGER,
                assigned_to INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP,
                
                FOREIGN KEY (module_id) REFERENCES modules(id),
                FOREIGN KEY (release_id) REFERENCES releases(id),
                FOREIGN KEY (test_case_id) REFERENCES test_cases(id),
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (assigned_to) REFERENCES users(id)
            )
        """)
        print("   ✓ issues table created")
        
        # Create indexes
        print("\n2. Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_issues_module ON issues(module_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_issues_release ON issues(release_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON issues(assigned_to)")
        print("   ✓ Indexes created")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
