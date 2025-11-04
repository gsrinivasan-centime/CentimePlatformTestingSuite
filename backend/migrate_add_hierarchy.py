"""
Database Migration Script: Add Hierarchical Fields to Test Cases
Adds sub_module and feature_section columns to the test_cases table

Usage:
    python backend/migrate_add_hierarchy.py

This migration adds:
- sub_module (TEXT): Organizes test cases by sub-module (e.g., "Suppliers", "Invoices")
- feature_section (TEXT): Organizes by feature/section (e.g., "Supplier Profile", "List View")

Creates indexes on both new columns for query performance.
"""

import sqlite3
import os
from datetime import datetime

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "test_management.db")

def backup_database():
    """Create a backup of the database before migration"""
    backup_path = f"{DB_PATH}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    import shutil
    shutil.copy2(DB_PATH, backup_path)
    print(f"✅ Database backed up to: {backup_path}")
    return backup_path

def check_columns_exist(cursor):
    """Check if the new columns already exist"""
    cursor.execute("PRAGMA table_info(test_cases)")
    columns = [row[1] for row in cursor.fetchall()]
    
    has_sub_module = "sub_module" in columns
    has_feature_section = "feature_section" in columns
    
    return has_sub_module, has_feature_section

def migrate():
    """Run the migration to add hierarchical fields"""
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at: {DB_PATH}")
        print("Please ensure the database exists and init_db.py has been run.")
        return False
    
    try:
        # Backup first
        backup_path = backup_database()
        
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if columns already exist
        has_sub_module, has_feature_section = check_columns_exist(cursor)
        
        if has_sub_module and has_feature_section:
            print("✅ Migration already applied - columns exist")
            conn.close()
            return True
        
        print("🚀 Starting migration...")
        
        # Add sub_module column if not exists
        if not has_sub_module:
            cursor.execute("""
                ALTER TABLE test_cases 
                ADD COLUMN sub_module TEXT
            """)
            print("✅ Added sub_module column")
            
            # Create index for sub_module
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_test_cases_sub_module 
                ON test_cases(sub_module)
            """)
            print("✅ Created index on sub_module")
        else:
            print("⚠️  sub_module column already exists, skipping")
        
        # Add feature_section column if not exists
        if not has_feature_section:
            cursor.execute("""
                ALTER TABLE test_cases 
                ADD COLUMN feature_section TEXT
            """)
            print("✅ Added feature_section column")
            
            # Create index for feature_section
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_test_cases_feature_section 
                ON test_cases(feature_section)
            """)
            print("✅ Created index on feature_section")
        else:
            print("⚠️  feature_section column already exists, skipping")
        
        # Create composite index for efficient hierarchical queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_test_cases_hierarchy 
            ON test_cases(module_id, sub_module, feature_section)
        """)
        print("✅ Created composite index on (module_id, sub_module, feature_section)")
        
        # Commit changes
        conn.commit()
        
        # Verify migration
        has_sub_module, has_feature_section = check_columns_exist(cursor)
        if has_sub_module and has_feature_section:
            print("\n✅ Migration completed successfully!")
            print("\nNew columns added to test_cases table:")
            print("  - sub_module (TEXT, indexed)")
            print("  - feature_section (TEXT, indexed)")
            print("\nYou can now organize test cases hierarchically:")
            print("  Module → Sub-Module → Feature/Section → Test Case")
            print("\nExample hierarchy:")
            print("  Account Payable → Suppliers → Supplier Profile → TC001")
            success = True
        else:
            print("❌ Migration verification failed")
            success = False
        
        conn.close()
        return success
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        print(f"Database backup is available at: {backup_path}")
        return False

def rollback(backup_path):
    """Rollback migration by restoring from backup"""
    if not os.path.exists(backup_path):
        print(f"❌ Backup file not found: {backup_path}")
        return False
    
    try:
        import shutil
        shutil.copy2(backup_path, DB_PATH)
        print(f"✅ Database restored from: {backup_path}")
        return True
    except Exception as e:
        print(f"❌ Rollback failed: {str(e)}")
        return False

def show_current_schema():
    """Display current test_cases table schema"""
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\nCurrent test_cases table schema:")
    print("=" * 60)
    cursor.execute("PRAGMA table_info(test_cases)")
    for row in cursor.fetchall():
        col_id, name, type_, notnull, default, pk = row
        nullable = "NOT NULL" if notnull else "NULL"
        pk_str = "PRIMARY KEY" if pk else ""
        print(f"  {name:25} {type_:10} {nullable:10} {pk_str}")
    
    print("\nIndexes on test_cases:")
    print("=" * 60)
    cursor.execute("""
        SELECT name, sql 
        FROM sqlite_master 
        WHERE type='index' AND tbl_name='test_cases'
    """)
    for row in cursor.fetchall():
        if row[1]:  # Skip auto-created indexes
            print(f"  {row[0]}")
    
    conn.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--show-schema":
            show_current_schema()
        elif sys.argv[1] == "--rollback" and len(sys.argv) > 2:
            rollback(sys.argv[2])
        else:
            print("Usage:")
            print("  python backend/migrate_add_hierarchy.py              # Run migration")
            print("  python backend/migrate_add_hierarchy.py --show-schema # Show current schema")
            print("  python backend/migrate_add_hierarchy.py --rollback <backup_path> # Rollback")
    else:
        migrate()
