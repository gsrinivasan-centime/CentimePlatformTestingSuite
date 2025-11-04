"""
Migration script to add features table and migrate existing features from test_cases
"""
import sqlite3
from datetime import datetime

DB_PATH = "test_management.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Create features table
        print("Creating features table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL,
                description TEXT,
                sub_module_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sub_module_id) REFERENCES sub_modules(id) ON DELETE CASCADE,
                UNIQUE(name, sub_module_id)
            )
        """)
        
        # 2. Find all unique features from test_cases (excluding placeholders)
        print("\nFinding existing features in test_cases...")
        cursor.execute("""
            SELECT DISTINCT 
                tc.feature_section,
                tc.sub_module,
                sm.id as sub_module_id,
                tc.description
            FROM test_cases tc
            JOIN sub_modules sm ON tc.sub_module = sm.name
            WHERE tc.feature_section IS NOT NULL 
            AND tc.feature_section != ''
            ORDER BY sm.id, tc.feature_section
        """)
        
        features_data = cursor.fetchall()
        print(f"Found {len(features_data)} unique features")
        
        # 3. Insert features into the new table
        if features_data:
            print("\nMigrating features to features table...")
            for feature_name, sub_module_name, sub_module_id, description in features_data:
                # Check if this is a placeholder test case
                cursor.execute("""
                    SELECT test_id FROM test_cases 
                    WHERE feature_section = ? 
                    AND sub_module = ?
                    AND test_id LIKE '%PLACEHOLDER%'
                """, (feature_name, sub_module_name))
                
                placeholder = cursor.fetchone()
                
                # Use description from placeholder or empty string
                feature_desc = description if placeholder else ""
                
                try:
                    cursor.execute("""
                        INSERT INTO features (name, description, sub_module_id)
                        VALUES (?, ?, ?)
                    """, (feature_name, feature_desc, sub_module_id))
                    print(f"  ✓ Migrated feature: {feature_name} (sub_module_id: {sub_module_id})")
                except sqlite3.IntegrityError:
                    print(f"  ⚠ Feature already exists: {feature_name} (sub_module_id: {sub_module_id})")
        
        # 4. Find and delete placeholder test cases for features
        print("\nFinding placeholder test cases for features...")
        cursor.execute("""
            SELECT id, test_id, title, feature_section 
            FROM test_cases 
            WHERE test_id LIKE '%PLACEHOLDER%'
            AND feature_section IS NOT NULL
        """)
        
        placeholders = cursor.fetchall()
        print(f"Found {len(placeholders)} placeholder test cases")
        
        if placeholders:
            print("\nDeleting placeholder test cases...")
            for test_id, test_case_id, title, feature in placeholders:
                cursor.execute("DELETE FROM test_cases WHERE id = ?", (test_id,))
                print(f"  ✓ Deleted: {test_case_id} - {title} (feature: {feature})")
        
        # 5. Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # 6. Show summary
        cursor.execute("SELECT COUNT(*) FROM features")
        feature_count = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM test_cases 
            WHERE feature_section IS NOT NULL
        """)
        test_cases_with_features = cursor.fetchone()[0]
        
        print(f"\nSummary:")
        print(f"  - Features table: {feature_count} features")
        print(f"  - Test cases with features: {test_cases_with_features}")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("FEATURES TABLE MIGRATION")
    print("=" * 60)
    migrate()
