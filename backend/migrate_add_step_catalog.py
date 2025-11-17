"""
Migration script to add step_catalog table for BDD step reusability
"""
import sqlite3
from datetime import datetime

def migrate():
    conn = sqlite3.connect('test_management.db')
    cursor = conn.cursor()
    
    try:
        # Create step_catalog table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS step_catalog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                step_type TEXT NOT NULL,
                step_text TEXT NOT NULL,
                step_pattern TEXT,
                description TEXT,
                parameters TEXT,
                usage_count INTEGER DEFAULT 0,
                module_id INTEGER,
                tags TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (module_id) REFERENCES modules (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')
        
        # Create index for faster searches
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_step_catalog_type 
            ON step_catalog(step_type)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_step_catalog_text 
            ON step_catalog(step_text)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_step_catalog_usage 
            ON step_catalog(usage_count DESC)
        ''')
        
        # Create feature_files table for storing feature file drafts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feature_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                description TEXT,
                module_id INTEGER,
                status TEXT DEFAULT 'draft',
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (module_id) REFERENCES modules (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')
        
        # Insert some sample reusable steps
        sample_steps = [
            ('Given', 'I am logged in as an admin', 'I am logged in as an {role}', 
             'Login with specific role', '{"role": "string"}', 0, None, 'authentication,login'),
            ('Given', 'I navigate to the dashboard', 'I navigate to the {page}', 
             'Navigate to specific page', '{"page": "string"}', 0, None, 'navigation'),
            ('When', 'I click on the "Save" button', 'I click on the "{button}" button', 
             'Click on any button', '{"button": "string"}', 0, None, 'interaction,button'),
            ('When', 'I enter "test@example.com" in the email field', 'I enter "{value}" in the {field} field', 
             'Enter value in any field', '{"value": "string", "field": "string"}', 0, None, 'interaction,input'),
            ('Then', 'I should see a success message', 'I should see a {message_type} message', 
             'Verify message display', '{"message_type": "string"}', 0, None, 'verification,message'),
            ('Then', 'the invoice should be created', 'the {entity} should be {action}', 
             'Verify entity state', '{"entity": "string", "action": "string"}', 0, None, 'verification'),
            ('Given', 'I have an active invoice', 'I have an active {entity}', 
             'Precondition for entity existence', '{"entity": "string"}', 0, None, 'precondition'),
            ('When', 'I select "Draft" from the status dropdown', 'I select "{value}" from the {dropdown} dropdown', 
             'Select from dropdown', '{"value": "string", "dropdown": "string"}', 0, None, 'interaction,dropdown'),
            ('Then', 'the total amount should be "$100.00"', 'the {field} should be "{expected_value}"', 
             'Verify field value', '{"field": "string", "expected_value": "string"}', 0, None, 'verification,value'),
            ('When', 'I upload a file "document.pdf"', 'I upload a file "{filename}"', 
             'Upload file', '{"filename": "string"}', 0, None, 'interaction,file'),
        ]
        
        cursor.executemany('''
            INSERT INTO step_catalog 
            (step_type, step_text, step_pattern, description, parameters, usage_count, module_id, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_steps)
        
        conn.commit()
        print("✅ Successfully created step_catalog and feature_files tables")
        print(f"✅ Inserted {len(sample_steps)} sample reusable steps")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
