#!/bin/bash

# Centime QA Portal - Stop Script
# This script stops the running application

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_message "========================================="
print_message "Stopping Centime QA Portal"
print_message "========================================="

# Stop backend
if [ -f "$LOG_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat $LOG_DIR/backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        print_message "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm $LOG_DIR/backend.pid
        print_message "✓ Backend stopped"
    else
        print_warning "Backend process not running"
        rm $LOG_DIR/backend.pid
    fi
else
    # Try to find process by port
    if lsof -ti:8000 &> /dev/null; then
        print_warning "Backend PID file not found, but process found on port 8000"
        kill -9 $(lsof -ti:8000) 2>/dev/null || true
        print_message "✓ Backend stopped"
    else
        print_warning "Backend not running"
    fi
fi

# Stop frontend
if [ -f "$LOG_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat $LOG_DIR/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        print_message "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm $LOG_DIR/frontend.pid
        print_message "✓ Frontend stopped"
    else
        print_warning "Frontend process not running"
        rm $LOG_DIR/frontend.pid
    fi
else
    # Try to find process by port
    if lsof -ti:3000 &> /dev/null; then
        print_warning "Frontend PID file not found, but process found on port 3000"
        kill -9 $(lsof -ti:3000) 2>/dev/null || true
        print_message "✓ Frontend stopped"
    else
        print_warning "Frontend not running"
    fi
fi

print_message "========================================="
print_message "Application stopped successfully"
print_message "========================================="

exit 0
