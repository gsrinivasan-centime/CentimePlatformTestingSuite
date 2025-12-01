#!/bin/bash
# ============================================
# RDS to Supabase Migration Helper
# ============================================
#
# Usage:
#   ./migrate_to_supabase.sh preview    # Dry run - see what will migrate
#   ./migrate_to_supabase.sh migrate    # Execute full migration
#   ./migrate_to_supabase.sh tables "users,test_cases"  # Migrate specific tables
#
# Prerequisites:
#   1. Set environment variables or update values below
#   2. Ensure Supabase has pgvector enabled
#   3. Run Alembic migrations on Supabase first
#

set -e

# ============================================
# Configuration
# ============================================

# Source: AWS RDS PostgreSQL
# Format: postgresql://user:password@host:port/database
RDS_DATABASE_URL="${RDS_DATABASE_URL:-postgresql://postgres:your_password@centime-test-db.crcyycecwv41.us-east-2.rds.amazonaws.com:5432/centime_test}"

# Target: Supabase PostgreSQL
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_DATABASE_URL="${SUPABASE_DATABASE_URL:-}"

# Script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATE_SCRIPT="$SCRIPT_DIR/scripts/migrate_rds_to_supabase.py"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"

# ============================================
# Functions
# ============================================

show_help() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║          RDS to Supabase Migration Tool                  ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage:"
    echo "  $0 preview              Preview what will be migrated (dry run)"
    echo "  $0 migrate              Execute full migration"
    echo "  $0 tables \"t1,t2\"       Migrate specific tables only"
    echo "  $0 setup-supabase       Show Supabase setup instructions"
    echo "  $0 verify               Verify database connections"
    echo ""
    echo "Environment Variables (or edit this script):"
    echo "  RDS_DATABASE_URL        Source database connection string"
    echo "  SUPABASE_DATABASE_URL   Target database connection string"
    echo ""
    echo "Examples:"
    echo "  $0 preview"
    echo "  $0 migrate"
    echo "  $0 tables \"users,test_cases,issues\""
    echo ""
}

check_prerequisites() {
    echo ""
    echo "🔍 Checking prerequisites..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is required but not installed"
        exit 1
    fi
    echo "✅ Python 3 found"
    
    # Check venv
    if [ ! -d "$VENV_DIR" ]; then
        echo "❌ Virtual environment not found at $VENV_DIR"
        echo "   Run: cd backend && python3 -m venv venv && pip install -r requirements.txt"
        exit 1
    fi
    echo "✅ Virtual environment found"
    
    # Check script exists
    if [ ! -f "$MIGRATE_SCRIPT" ]; then
        echo "❌ Migration script not found at $MIGRATE_SCRIPT"
        exit 1
    fi
    echo "✅ Migration script found"
    
    # Check environment variables
    if [ -z "$RDS_DATABASE_URL" ]; then
        echo "❌ RDS_DATABASE_URL is not set"
        echo "   Set it in this script or as an environment variable"
        exit 1
    fi
    echo "✅ RDS_DATABASE_URL is set"
    
    if [ -z "$SUPABASE_DATABASE_URL" ]; then
        echo "⚠️  SUPABASE_DATABASE_URL is not set"
        echo "   You will be prompted to enter it"
    else
        echo "✅ SUPABASE_DATABASE_URL is set"
    fi
}

run_migration() {
    local mode=$1
    local tables=$2
    
    source "$VENV_DIR/bin/activate"
    
    export RDS_DATABASE_URL
    export SUPABASE_DATABASE_URL
    
    case $mode in
        "preview")
            python3 "$MIGRATE_SCRIPT" --dry-run
            ;;
        "migrate")
            echo ""
            echo "⚠️  WARNING: This will migrate data from RDS to Supabase"
            echo "   Source: $RDS_DATABASE_URL"
            echo "   Target: $SUPABASE_DATABASE_URL"
            echo ""
            read -p "Are you sure you want to continue? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                echo "Migration cancelled."
                exit 0
            fi
            python3 "$MIGRATE_SCRIPT"
            ;;
        "tables")
            if [ -z "$tables" ]; then
                echo "❌ No tables specified"
                echo "Usage: $0 tables \"users,test_cases,issues\""
                exit 1
            fi
            echo ""
            echo "⚠️  WARNING: This will migrate specific tables from RDS to Supabase"
            echo "   Tables: $tables"
            echo ""
            read -p "Are you sure you want to continue? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                echo "Migration cancelled."
                exit 0
            fi
            python3 "$MIGRATE_SCRIPT" --tables "$tables"
            ;;
        "verify")
            python3 "$MIGRATE_SCRIPT" --dry-run 2>&1 | head -30
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

show_supabase_setup() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║          Supabase Setup Instructions                     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "1. Create a Supabase project at https://supabase.com"
    echo ""
    echo "2. Enable pgvector extension:"
    echo "   - Go to Database → Extensions"
    echo "   - Search for 'vector' and enable it"
    echo "   - Or run: CREATE EXTENSION IF NOT EXISTS vector;"
    echo ""
    echo "3. Get your connection string:"
    echo "   - Go to Project Settings → Database"
    echo "   - Copy the 'Connection string' (URI format)"
    echo "   - Format: postgresql://postgres.[ref]:[password]@[host]:6543/postgres"
    echo ""
    echo "4. Run Alembic migrations to create tables:"
    echo "   cd backend"
    echo "   export DATABASE_URL='your_supabase_connection_string'"
    echo "   alembic upgrade head"
    echo ""
    echo "5. Set environment variable:"
    echo "   export SUPABASE_DATABASE_URL='your_supabase_connection_string'"
    echo ""
    echo "6. Run migration:"
    echo "   ./migrate_to_supabase.sh preview   # Check first"
    echo "   ./migrate_to_supabase.sh migrate   # Execute"
    echo ""
}

# ============================================
# Main
# ============================================

cd "$(dirname "$0")"

case "${1:-help}" in
    "preview")
        check_prerequisites
        run_migration "preview"
        ;;
    "migrate")
        check_prerequisites
        run_migration "migrate"
        ;;
    "tables")
        check_prerequisites
        run_migration "tables" "$2"
        ;;
    "verify")
        check_prerequisites
        run_migration "verify"
        ;;
    "setup-supabase")
        show_supabase_setup
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
