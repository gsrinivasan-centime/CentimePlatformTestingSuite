#!/bin/bash

# Centime QA Portal - Deployment Script
# This script deploys the application locally or on server

set -e  # Exit on any error

echo "========================================="
echo "Centime QA Portal - Deployment Started"
echo "========================================="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"
LOG_DIR="$APP_DIR/logs"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running with sudo (not recommended for local)
if [ "$EUID" -eq 0 ]; then 
    print_warning "Running as root. This is not recommended for local deployment."
fi

# 1. Create logs directory
print_message "Step 1: Creating logs directory..."
mkdir -p $LOG_DIR

# 2. Setup Backend
print_message "Step 2: Setting up Backend..."
cd $BACKEND_DIR

# Check Python version
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed. Please install Python 3.11 or later."
    exit 1
fi

print_info "Python version: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    print_message "Creating Python virtual environment..."
    python3 -m venv venv
else
    print_info "Virtual environment already exists"
fi

# Activate virtual environment
print_message "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_message "Upgrading pip..."
pip install --upgrade pip --quiet

# Install Python dependencies
print_message "Installing Python dependencies..."
pip install -r requirements.txt --quiet

# Check if .env file exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        print_info "Please update .env file with your configuration"
    else
        print_error ".env.example not found. Please create .env file manually."
    fi
fi

# Initialize database if it doesn't exist
if [ ! -f "$BACKEND_DIR/test_management.db" ]; then
    print_message "Initializing database..."
    python init_db.py
else
    print_info "Database already exists"
fi

# 3. Stop existing backend process (if running)
print_message "Step 3: Stopping existing backend process..."
if lsof -ti:8000 &> /dev/null; then
    print_warning "Port 8000 is in use. Killing existing process..."
    kill -9 $(lsof -ti:8000) 2>/dev/null || true
    sleep 2
fi

# 4. Start Backend
print_message "Step 4: Starting Backend server..."
print_info "Backend will run on http://localhost:8000"

# Start backend in background
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > $LOG_DIR/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > $LOG_DIR/backend.pid

print_info "Backend PID: $BACKEND_PID"
sleep 3

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    print_message "✓ Backend started successfully"
else
    print_error "✗ Backend failed to start. Check logs at $LOG_DIR/backend.log"
    cat $LOG_DIR/backend.log
    exit 1
fi

# 5. Setup Frontend
print_message "Step 5: Setting up Frontend..."
cd $FRONTEND_DIR

# Check Node.js version
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16 or later."
    exit 1
fi

print_info "Node.js version: $(node --version)"
print_info "npm version: $(npm --version)"

# Install Node dependencies
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    print_message "Installing Node.js dependencies (this may take a few minutes)..."
    npm install
else
    print_message "Updating Node.js dependencies..."
    npm install
fi

# Stop existing frontend process (if running)
print_message "Step 6: Stopping existing frontend process..."
if lsof -ti:3000 &> /dev/null; then
    print_warning "Port 3000 is in use. Killing existing process..."
    kill -9 $(lsof -ti:3000) 2>/dev/null || true
    sleep 2
fi

# 6. Start Frontend
print_message "Step 7: Starting Frontend development server..."
print_info "Frontend will run on http://localhost:3000"

# Start frontend in background
nohup npm start > $LOG_DIR/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > $LOG_DIR/frontend.pid

print_info "Frontend PID: $FRONTEND_PID"
sleep 5

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    print_message "✓ Frontend started successfully"
else
    print_error "✗ Frontend failed to start. Check logs at $LOG_DIR/frontend.log"
    cat $LOG_DIR/frontend.log
    exit 1
fi

# 7. Health check
print_message "Step 8: Running health checks..."
sleep 3

# Check backend health
print_info "Checking backend at http://localhost:8000/api/docs"
if curl -f http://localhost:8000/api/docs > /dev/null 2>&1; then
    print_message "✓ Backend health check passed"
else
    print_warning "✗ Backend health check failed"
    print_info "Backend might still be starting. Check http://localhost:8000/api/docs"
fi

# Check frontend
print_info "Checking frontend at http://localhost:3000"
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_message "✓ Frontend health check passed"
else
    print_warning "✗ Frontend health check failed"
    print_info "Frontend might still be starting. Check http://localhost:3000"
fi

# 8. Display summary
print_message "========================================="
print_message "Deployment Completed Successfully! 🎉"
print_message "========================================="
echo ""
print_info "Application URLs:"
print_info "  📱 Frontend:    http://localhost:3000"
print_info "  🔧 Backend API: http://localhost:8000/api/docs"
print_info "  📊 API Docs:    http://localhost:8000/api/docs"
echo ""
print_info "Process Information:"
print_info "  Backend PID:  $BACKEND_PID (Port 8000)"
print_info "  Frontend PID: $FRONTEND_PID (Port 3000)"
echo ""
print_info "Log Files:"
print_info "  Backend:  $LOG_DIR/backend.log"
print_info "  Frontend: $LOG_DIR/frontend.log"
echo ""
print_info "To stop the application:"
print_info "  Run: ./stop.sh"
echo ""
print_info "To view logs:"
print_info "  Backend:  tail -f $LOG_DIR/backend.log"
print_info "  Frontend: tail -f $LOG_DIR/frontend.log"
echo ""
print_message "========================================="

# Deactivate virtual environment
deactivate 2>/dev/null || true

exit 0
