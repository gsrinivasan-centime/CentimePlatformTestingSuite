#!/usr/bin/env python3
"""
RDS to Supabase Migration Script
================================

This script migrates all data from AWS RDS PostgreSQL to Supabase PostgreSQL.
Both databases use pgvector, so embeddings transfer seamlessly.

Usage:
    python scripts/migrate_rds_to_supabase.py --dry-run     # Preview what will be migrated
    python scripts/migrate_rds_to_supabase.py               # Execute migration
    python scripts/migrate_rds_to_supabase.py --tables users,test_cases  # Migrate specific tables

Requirements:
    - Source (RDS) and Target (Supabase) connection strings
    - pgvector extension enabled on both databases
    - Tables must exist on target (run Alembic migrations first)

Notes:
    - Passwords are hashed, not encrypted - they transfer as-is
    - pgvector embeddings (Vector type) transfer without issues
    - Foreign key constraints are handled via deferred constraints
"""

import argparse
import os
import sys
from datetime import datetime
from typing import List, Dict, Any, Optional
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    from sqlalchemy import create_engine, text, MetaData, Table, inspect
    from sqlalchemy.orm import sessionmaker
    from dotenv import load_dotenv
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install sqlalchemy psycopg2-binary python-dotenv")
    sys.exit(1)


# Table migration order (respects foreign key dependencies)
MIGRATION_ORDER = [
    "users",
    "modules",
    "sub_modules",
    "features",
    "releases",
    "test_cases",
    "test_executions",
    "jira_defects",
    "release_test_cases",
    "release_approvals",
    "release_history",
    "jira_stories",
    "test_case_stories",
    "feature_files",
    "step_catalog",
    "issues",
    "application_settings",
    "smart_search_logs",
    "llm_response_cache",
    "navigation_registry",
]

# Tables with special handling (e.g., auto-generated IDs, sequences)
TABLES_WITH_IDENTITY = [
    "users", "modules", "sub_modules", "features", "releases", 
    "test_cases", "test_executions", "jira_defects", "release_test_cases",
    "release_approvals", "release_history", "jira_stories", "test_case_stories",
    "feature_files", "step_catalog", "issues", "smart_search_logs", "llm_response_cache"
]


class DatabaseMigrator:
    def __init__(self, source_url: str, target_url: str, dry_run: bool = False):
        self.source_url = source_url
        self.target_url = target_url
        self.dry_run = dry_run
        
        # Create engines
        self.source_engine = create_engine(source_url, echo=False)
        self.target_engine = create_engine(target_url, echo=False)
        
        # Create sessions
        self.SourceSession = sessionmaker(bind=self.source_engine)
        self.TargetSession = sessionmaker(bind=self.target_engine)
        
        # Stats
        self.stats = {
            "tables_processed": 0,
            "rows_migrated": 0,
            "errors": [],
            "skipped": []
        }
    
    def verify_connections(self) -> bool:
        """Verify both database connections work"""
        print("\n" + "="*60)
        print("🔌 Verifying Database Connections")
        print("="*60)
        
        try:
            with self.source_engine.connect() as conn:
                result = conn.execute(text("SELECT version()"))
                version = result.scalar()
                print(f"✅ Source (RDS): Connected")
                print(f"   PostgreSQL: {version[:50]}...")
        except Exception as e:
            print(f"❌ Source (RDS): Connection failed - {e}")
            return False
        
        try:
            with self.target_engine.connect() as conn:
                result = conn.execute(text("SELECT version()"))
                version = result.scalar()
                print(f"✅ Target (Supabase): Connected")
                print(f"   PostgreSQL: {version[:50]}...")
        except Exception as e:
            print(f"❌ Target (Supabase): Connection failed - {e}")
            return False
        
        return True
    
    def verify_pgvector(self) -> bool:
        """Verify pgvector extension is enabled on both databases"""
        print("\n" + "="*60)
        print("🧮 Verifying pgvector Extension")
        print("="*60)
        
        for name, engine in [("Source (RDS)", self.source_engine), ("Target (Supabase)", self.target_engine)]:
            try:
                with engine.connect() as conn:
                    result = conn.execute(text(
                        "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
                    ))
                    row = result.fetchone()
                    if row:
                        print(f"✅ {name}: pgvector v{row[1]} installed")
                    else:
                        print(f"⚠️  {name}: pgvector NOT installed")
                        if "Supabase" in name:
                            print("   Run: CREATE EXTENSION IF NOT EXISTS vector;")
                            return False
            except Exception as e:
                print(f"❌ {name}: Error checking pgvector - {e}")
                return False
        
        return True
    
    def get_table_info(self, engine, table_name: str) -> Dict:
        """Get table column info and row count"""
        inspector = inspect(engine)
        
        try:
            columns = inspector.get_columns(table_name)
            with engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = result.scalar()
            
            return {
                "exists": True,
                "columns": [c["name"] for c in columns],
                "row_count": count
            }
        except Exception as e:
            return {
                "exists": False,
                "columns": [],
                "row_count": 0,
                "error": str(e)
            }
    
    def preview_migration(self) -> None:
        """Preview what will be migrated"""
        print("\n" + "="*60)
        print("📋 Migration Preview (Dry Run)")
        print("="*60)
        
        total_rows = 0
        
        print(f"\n{'Table':<30} {'Source Rows':<15} {'Target Rows':<15} {'Status'}")
        print("-" * 75)
        
        for table in MIGRATION_ORDER:
            source_info = self.get_table_info(self.source_engine, table)
            target_info = self.get_table_info(self.target_engine, table)
            
            if not source_info["exists"]:
                status = "⚠️  Not in source"
            elif not target_info["exists"]:
                status = "❌ Not in target"
            elif target_info["row_count"] > 0:
                status = "⚠️  Target has data"
            else:
                status = "✅ Ready"
            
            source_rows = source_info["row_count"] if source_info["exists"] else "N/A"
            target_rows = target_info["row_count"] if target_info["exists"] else "N/A"
            
            print(f"{table:<30} {str(source_rows):<15} {str(target_rows):<15} {status}")
            
            if source_info["exists"]:
                total_rows += source_info["row_count"]
        
        print("-" * 75)
        print(f"{'TOTAL':<30} {total_rows:<15}")
    
    def migrate_table(self, table_name: str, batch_size: int = 1000) -> int:
        """Migrate a single table"""
        source_info = self.get_table_info(self.source_engine, table_name)
        target_info = self.get_table_info(self.target_engine, table_name)
        
        if not source_info["exists"]:
            print(f"  ⚠️  Table {table_name} not found in source, skipping")
            self.stats["skipped"].append(table_name)
            return 0
        
        if not target_info["exists"]:
            print(f"  ❌ Table {table_name} not found in target, skipping")
            self.stats["errors"].append(f"{table_name}: not in target")
            return 0
        
        if source_info["row_count"] == 0:
            print(f"  ⏭️  Table {table_name} is empty, skipping")
            return 0
        
        # Get common columns (in case schemas differ slightly)
        common_columns = set(source_info["columns"]) & set(target_info["columns"])
        columns_list = ", ".join(common_columns)
        
        if not common_columns:
            print(f"  ❌ No common columns between source and target for {table_name}")
            return 0
        
        rows_migrated = 0
        
        try:
            with self.source_engine.connect() as source_conn:
                with self.target_engine.connect() as target_conn:
                    # Disable triggers and constraints temporarily
                    if table_name in TABLES_WITH_IDENTITY:
                        target_conn.execute(text(f"ALTER TABLE {table_name} DISABLE TRIGGER ALL"))
                    
                    # Get all data from source
                    result = source_conn.execute(text(f"SELECT {columns_list} FROM {table_name}"))
                    rows = result.fetchall()
                    column_names = result.keys()
                    
                    if not rows:
                        return 0
                    
                    # Build insert statement
                    placeholders = ", ".join([f":{col}" for col in column_names])
                    insert_sql = f"INSERT INTO {table_name} ({columns_list}) VALUES ({placeholders})"
                    
                    # Insert in batches
                    for i in range(0, len(rows), batch_size):
                        batch = rows[i:i + batch_size]
                        
                        for row in batch:
                            row_dict = dict(zip(column_names, row))
                            
                            # Handle special types
                            for key, value in row_dict.items():
                                # Convert numpy arrays or pgvector to list for embedding columns
                                if key == "embedding" and value is not None:
                                    if hasattr(value, 'tolist'):
                                        row_dict[key] = value.tolist()
                                    elif isinstance(value, str):
                                        # If it's already a string representation, use as-is
                                        pass
                                
                                # Handle JSONB fields
                                if key in ["filters", "response_json", "capabilities", 
                                          "example_queries", "searchable_fields"]:
                                    if value is not None and not isinstance(value, str):
                                        row_dict[key] = json.dumps(value)
                            
                            try:
                                target_conn.execute(text(insert_sql), row_dict)
                                rows_migrated += 1
                            except Exception as e:
                                if "duplicate key" in str(e).lower():
                                    # Skip duplicates (already exists)
                                    pass
                                else:
                                    raise e
                        
                        target_conn.commit()
                    
                    # Re-enable triggers
                    if table_name in TABLES_WITH_IDENTITY:
                        target_conn.execute(text(f"ALTER TABLE {table_name} ENABLE TRIGGER ALL"))
                    
                    # Reset sequence if table has SERIAL/IDENTITY column
                    if table_name in TABLES_WITH_IDENTITY and rows_migrated > 0:
                        try:
                            # Get max ID
                            max_id_result = target_conn.execute(
                                text(f"SELECT COALESCE(MAX(id), 0) + 1 FROM {table_name}")
                            )
                            max_id = max_id_result.scalar()
                            
                            # Reset sequence
                            seq_name = f"{table_name}_id_seq"
                            target_conn.execute(
                                text(f"SELECT setval('{seq_name}', {max_id}, false)")
                            )
                            target_conn.commit()
                        except Exception as e:
                            # Sequence might not exist for all tables
                            pass
        
        except Exception as e:
            print(f"  ❌ Error migrating {table_name}: {e}")
            self.stats["errors"].append(f"{table_name}: {str(e)[:100]}")
            return 0
        
        return rows_migrated
    
    def migrate_all(self, tables: Optional[List[str]] = None) -> None:
        """Migrate all tables in order"""
        print("\n" + "="*60)
        print("🚀 Starting Migration")
        print("="*60)
        
        if self.dry_run:
            print("\n⚠️  DRY RUN MODE - No data will be modified\n")
            self.preview_migration()
            return
        
        tables_to_migrate = tables if tables else MIGRATION_ORDER
        
        for table in tables_to_migrate:
            if table not in MIGRATION_ORDER and not tables:
                continue
            
            print(f"\n📦 Migrating: {table}")
            
            source_info = self.get_table_info(self.source_engine, table)
            print(f"   Source rows: {source_info['row_count']}")
            
            rows = self.migrate_table(table)
            
            if rows > 0:
                print(f"   ✅ Migrated: {rows} rows")
                self.stats["rows_migrated"] += rows
                self.stats["tables_processed"] += 1
            elif table not in self.stats["skipped"]:
                print(f"   ⏭️  No rows migrated")
        
        self.print_summary()
    
    def print_summary(self) -> None:
        """Print migration summary"""
        print("\n" + "="*60)
        print("📊 Migration Summary")
        print("="*60)
        
        print(f"\n✅ Tables Processed: {self.stats['tables_processed']}")
        print(f"📝 Total Rows Migrated: {self.stats['rows_migrated']}")
        
        if self.stats["skipped"]:
            print(f"\n⏭️  Skipped Tables: {', '.join(self.stats['skipped'])}")
        
        if self.stats["errors"]:
            print(f"\n❌ Errors:")
            for error in self.stats["errors"]:
                print(f"   - {error}")
        
        print("\n" + "="*60)
        if not self.stats["errors"]:
            print("✅ Migration completed successfully!")
        else:
            print("⚠️  Migration completed with errors")
        print("="*60)


def is_supabase_url(url: str) -> bool:
    """Check if URL is a Supabase database URL"""
    if not url:
        return False
    return 'supabase.co' in url or 'supabase.com' in url


def get_database_urls() -> tuple:
    """Get database URLs from environment or prompt"""
    
    # Try to load from .env files
    backend_env = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    if os.path.exists(backend_env):
        load_dotenv(backend_env)
        print(f"✅ Loaded environment from: {backend_env}")
    
    # Check all possible environment variables
    database_url = os.getenv('DATABASE_URL')
    rds_url = os.getenv('RDS_DATABASE_URL')
    supabase_url = os.getenv('SUPABASE_DATABASE_URL')
    
    # Smart detection: if DATABASE_URL is Supabase, use it as target
    if database_url and is_supabase_url(database_url):
        supabase_url = supabase_url or database_url
        print(f"✅ Detected Supabase URL from DATABASE_URL")
    elif database_url and not rds_url:
        rds_url = database_url
    
    # Source: RDS
    if not rds_url:
        print("\n⚠️  RDS_DATABASE_URL not found in environment")
        print("This is your SOURCE database (AWS RDS)")
        while True:
            rds_url = input("Enter RDS connection string: ").strip()
            if rds_url:
                if not rds_url.startswith(('postgresql://', 'postgres://')):
                    print("❌ Invalid URL format. Must start with postgresql:// or postgres://")
                    continue
                break
            print("❌ RDS connection string cannot be empty. Please enter a valid URL.")
    else:
        # Mask password for display
        masked = rds_url.split('@')[0].rsplit(':', 1)[0] + ':****@' + rds_url.split('@')[1] if '@' in rds_url else rds_url
        print(f"✅ RDS Source: {masked}")
    
    # Target: Supabase
    if not supabase_url:
        print("\n⚠️  SUPABASE_DATABASE_URL not found in environment")
        print("This is your TARGET database (Supabase)")
        print("Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres")
        while True:
            supabase_url = input("Enter Supabase connection string: ").strip()
            if supabase_url:
                if not supabase_url.startswith(('postgresql://', 'postgres://')):
                    print("❌ Invalid URL format. Must start with postgresql:// or postgres://")
                    continue
                break
            print("❌ Supabase connection string cannot be empty. Please enter a valid URL.")
    else:
        # Mask password for display
        masked = supabase_url.split('@')[0].rsplit(':', 1)[0] + ':****@' + supabase_url.split('@')[1] if '@' in supabase_url else supabase_url
        print(f"✅ Supabase Target: {masked}")
    
    return rds_url, supabase_url


def main():
    parser = argparse.ArgumentParser(
        description="Migrate data from AWS RDS to Supabase PostgreSQL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python migrate_rds_to_supabase.py --dry-run              # Preview migration
  python migrate_rds_to_supabase.py                        # Full migration
  python migrate_rds_to_supabase.py --tables users,modules # Specific tables
  
Environment Variables:
  RDS_DATABASE_URL       - Source RDS connection string
  SUPABASE_DATABASE_URL  - Target Supabase connection string
        """
    )
    
    parser.add_argument(
        '--dry-run', 
        action='store_true',
        help='Preview migration without making changes'
    )
    
    parser.add_argument(
        '--tables',
        type=str,
        help='Comma-separated list of tables to migrate (default: all)'
    )
    
    parser.add_argument(
        '--source-url',
        type=str,
        help='Source database URL (RDS)'
    )
    
    parser.add_argument(
        '--target-url',
        type=str,
        help='Target database URL (Supabase)'
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🔄 RDS to Supabase Migration Tool")
    print("="*60)
    print(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get database URLs
    if args.source_url and args.target_url:
        source_url = args.source_url
        target_url = args.target_url
    else:
        source_url, target_url = get_database_urls()
    
    # Parse tables if specified
    tables = None
    if args.tables:
        tables = [t.strip() for t in args.tables.split(',')]
        print(f"   Tables: {', '.join(tables)}")
    
    # Create migrator
    migrator = DatabaseMigrator(
        source_url=source_url,
        target_url=target_url,
        dry_run=args.dry_run
    )
    
    # Verify connections
    if not migrator.verify_connections():
        print("\n❌ Connection verification failed. Exiting.")
        sys.exit(1)
    
    # Verify pgvector
    if not migrator.verify_pgvector():
        print("\n⚠️  pgvector verification failed. Embeddings may not transfer correctly.")
        if not args.dry_run:
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                sys.exit(1)
    
    # Run migration
    migrator.migrate_all(tables=tables)
    
    print(f"\n   Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
