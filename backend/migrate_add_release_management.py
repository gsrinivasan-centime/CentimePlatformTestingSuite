"""
Migration: Add Release Management Tables

This migration creates the following tables:
- release_test_cases: Links test cases to releases with execution tracking
- release_approvals: Manages approval workflow for releases
- release_history: Tracks all changes to releases

The releases table already exists, so we'll just add new columns if needed.
"""

import sqlite3
from datetime import datetime

def run_migration():
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    try:
        print("Starting release management migration...")
        
        # Check if releases table needs updates
        print("\n1. Checking releases table...")
        cursor.execute("PRAGMA table_info(releases)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Add missing columns to releases table
        if 'environment' not in columns:
            print("   Adding 'environment' column to releases...")
            cursor.execute("ALTER TABLE releases ADD COLUMN environment VARCHAR(50) DEFAULT 'staging'")
        
        if 'overall_status' not in columns:
            print("   Adding 'overall_status' column to releases...")
            cursor.execute("ALTER TABLE releases ADD COLUMN overall_status VARCHAR(50) DEFAULT 'pending'")
        
        if 'qa_lead_id' not in columns:
            print("   Adding 'qa_lead_id' column to releases...")
            cursor.execute("ALTER TABLE releases ADD COLUMN qa_lead_id INTEGER REFERENCES users(id)")
        
        # Create release_test_cases table
        print("\n2. Creating release_test_cases table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS release_test_cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                release_id INTEGER NOT NULL,
                test_case_id INTEGER NOT NULL,
                
                -- Hierarchy reference (for quick filtering)
                module_id INTEGER,
                sub_module_id INTEGER,
                feature_id INTEGER,
                
                -- Execution details
                priority VARCHAR(20) DEFAULT 'medium',
                execution_status VARCHAR(20) DEFAULT 'pending',
                executed_by_id INTEGER,
                execution_date TIMESTAMP,
                execution_duration INTEGER,
                
                -- Additional info
                comments TEXT,
                bug_ids TEXT,
                screenshots TEXT,
                
                -- Order in release
                display_order INTEGER,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
                FOREIGN KEY (test_case_id) REFERENCES test_cases(id),
                FOREIGN KEY (module_id) REFERENCES modules(id),
                FOREIGN KEY (executed_by_id) REFERENCES users(id),
                
                UNIQUE(release_id, test_case_id)
            )
        """)
        print("   ✓ release_test_cases table created")
        
        # Create release_approvals table
        print("\n3. Creating release_approvals table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS release_approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                release_id INTEGER NOT NULL,
                approver_id INTEGER NOT NULL,
                role VARCHAR(50) NOT NULL,
                approval_status VARCHAR(20) DEFAULT 'pending',
                comments TEXT,
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
                FOREIGN KEY (approver_id) REFERENCES users(id),
                
                UNIQUE(release_id, approver_id, role)
            )
        """)
        print("   ✓ release_approvals table created")
        
        # Create release_history table
        print("\n4. Creating release_history table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS release_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                release_id INTEGER NOT NULL,
                user_id INTEGER,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        print("   ✓ release_history table created")
        
        # Create indexes for performance
        print("\n5. Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_release_test_cases_release ON release_test_cases(release_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_release_test_cases_status ON release_test_cases(execution_status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_release_test_cases_module ON release_test_cases(module_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_release_approvals_release ON release_approvals(release_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_release_history_release ON release_history(release_id)")
        print("   ✓ Indexes created")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Verify tables
        print("\n6. Verifying tables...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'release%' ORDER BY name")
        tables = cursor.fetchall()
        print("   Tables created:")
        for table in tables:
            print(f"   - {table[0]}")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
