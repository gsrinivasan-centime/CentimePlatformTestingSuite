#!/usr/bin/env python3
"""
Migration script to create sub_modules table and migrate existing sub-module data
from test_cases to the new sub_modules table.
"""

import sqlite3
from datetime import datetime

def migrate_add_submodules_table():
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    try:
        print("Starting migration: Adding sub_modules table...")
        
        # Step 1: Create sub_modules table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sub_modules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL,
                description TEXT,
                module_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
            )
        """)
        print("✓ Created sub_modules table")
        
        # Step 2: Create index on module_id for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS ix_sub_modules_module_id 
            ON sub_modules(module_id)
        """)
        print("✓ Created index on module_id")
        
        # Step 3: Migrate existing sub-module data from test_cases
        # Get unique sub-modules with their module_id
        cursor.execute("""
            SELECT DISTINCT module_id, sub_module
            FROM test_cases
            WHERE sub_module IS NOT NULL AND sub_module != ''
            ORDER BY module_id, sub_module
        """)
        
        existing_submodules = cursor.fetchall()
        print(f"\nFound {len(existing_submodules)} unique sub-modules to migrate")
        
        # Insert into sub_modules table
        migrated_count = 0
        for module_id, sub_module_name in existing_submodules:
            # Check if this combination already exists
            cursor.execute("""
                SELECT id FROM sub_modules 
                WHERE module_id = ? AND name = ?
            """, (module_id, sub_module_name))
            
            if cursor.fetchone() is None:
                cursor.execute("""
                    INSERT INTO sub_modules (name, module_id, created_at)
                    VALUES (?, ?, ?)
                """, (sub_module_name, module_id, datetime.utcnow()))
                migrated_count += 1
                print(f"  ✓ Migrated: Module {module_id} -> {sub_module_name}")
        
        print(f"\n✓ Migrated {migrated_count} sub-modules to new table")
        
        # Step 4: Delete placeholder test cases (those created just for sub-modules)
        cursor.execute("""
            DELETE FROM test_cases
            WHERE title LIKE '%Sub-Module Placeholder%'
            OR title LIKE '%PLACEHOLDER%'
        """)
        deleted_count = cursor.rowcount
        print(f"✓ Deleted {deleted_count} placeholder test cases")
        
        conn.commit()
        
        # Verify the migration
        cursor.execute("SELECT COUNT(*) FROM sub_modules")
        total_submodules = cursor.fetchone()[0]
        
        print("\n" + "="*60)
        print("Migration completed successfully!")
        print("="*60)
        print(f"Total sub-modules in new table: {total_submodules}")
        print(f"Placeholder test cases removed: {deleted_count}")
        
        # Show sample data
        cursor.execute("""
            SELECT sm.id, m.name as module_name, sm.name as submodule_name
            FROM sub_modules sm
            JOIN modules m ON sm.module_id = m.id
            LIMIT 5
        """)
        
        print("\nSample sub-modules:")
        for row in cursor.fetchall():
            print(f"  ID {row[0]}: {row[1]} -> {row[2]}")
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_add_submodules_table()
