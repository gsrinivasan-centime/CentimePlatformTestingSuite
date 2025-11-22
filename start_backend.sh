#!/bin/bash

# Centime Test Management System - Quick Start Script
# This script helps you quickly start the backend server

set -e  # Exit on error

echo "=================================================="
echo "Centime Test Management System - Quick Start"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/app/main.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite"
    exit 1
fi

# Navigate to backend
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
if [ ! -f "venv/.requirements_installed" ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt -q
    touch venv/.requirements_installed
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    # Generate a random secret key
    SECRET_KEY=$(openssl rand -hex 32)
    if [ "$(uname)" == "Darwin" ]; then
        # macOS
        sed -i '' "s/your-secret-key-here-change-in-production/$SECRET_KEY/" .env
    else
        # Linux
        sed -i "s/your-secret-key-here-change-in-production/$SECRET_KEY/" .env
    fi
    echo "✓ .env file created with secure SECRET_KEY"
fi

# Check if database needs initialization
echo "🗄️  Checking database status..."

# Check if Alembic has been run (check for alembic_version table)
DB_INITIALIZED=$(python -c "
from app.core.database import engine
from sqlalchemy import inspect, text
try:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if 'alembic_version' in tables and 'users' in tables:
        print('true')
    else:
        print('false')
except Exception:
    print('false')
" 2>/dev/null || echo "false")

if [ "$DB_INITIALIZED" = "false" ]; then
    echo "🔄 Running database migrations and initialization..."
    
    # Check if PostgreSQL is accessible
    if ! python -c "from app.core.database import engine; engine.connect()" 2>/dev/null; then
        echo "❌ Error: Cannot connect to PostgreSQL database"
        echo ""
        echo "Please ensure:"
        echo "  1. PostgreSQL is running"
        echo "  2. Database 'test_management' exists: psql -U postgres -c \"CREATE DATABASE test_management;\""
        echo "  3. DATABASE_URL in .env is correct"
        echo ""
        exit 1
    fi
    
    # Run Alembic migrations
    alembic upgrade head
    
    # Initialize with sample data
    python init_db_postgres.py
    
    echo "✓ Database initialized"
else
    echo "✓ Database already initialized"
fi

echo ""
echo "=================================================="
echo "🚀 Starting FastAPI server..."
echo "=================================================="
echo ""
echo "API will be available at:"
echo "  • Main API: http://localhost:8000"
echo "  • API Docs: http://localhost:8000/docs"
echo "  • Redoc: http://localhost:8000/redoc"
echo ""
echo "Default credentials:"
echo "  • Admin: admin@centime.com / Admin123!"
echo "  • Tester: tester@centime.com / Tester123!"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
