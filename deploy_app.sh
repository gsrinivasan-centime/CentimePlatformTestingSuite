#!/bin/bash

###############################################################################
# Centime QA Portal - Unified Deployment Script
# Supports both development (local) and production (EC2) deployments
###############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✅ ${NC}$1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${NC}$1"
}

print_error() {
    echo -e "${RED}❌ ${NC}$1"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

###############################################################################
# Configuration
###############################################################################

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# EC2 Configuration
EC2_HOST="18.191.180.118"
EC2_USER="ubuntu"
EC2_KEY="$HOME/.ssh/centime-qa-portal-ec2-key.pem"
EC2_BACKEND_PATH="/home/ubuntu/CentimePlatformTestingSuite/backend"
EC2_FRONTEND_PATH="/home/ubuntu/CentimePlatformTestingSuite/frontend"

# Production domain
PROD_DOMAIN="qa-portal.ddns.net"

# Database Configurations
# DEVELOPMENT: Supabase PostgreSQL (cloud)
DEV_DB_HOST="db.mskrrxsixxflavjuxiun.supabase.co"
# PRODUCTION: AWS RDS PostgreSQL
PROD_DB_HOST="rds.amazonaws.com"

###############################################################################
# Helper Functions
###############################################################################

show_usage() {
    cat << EOF
Usage: $0 [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
  dev         Deploy to local development environment (localhost:3000, localhost:8000)
              Database: Supabase PostgreSQL (db.mskrrxsixxflavjuxiun.supabase.co)
              
  prod        Deploy to production EC2 environment (qa-portal.ddns.net)
              Database: AWS RDS PostgreSQL
              Backend: Pulls latest code from git (default: main branch)
              Frontend: Builds locally and syncs static files to EC2

OPTIONS:
  --backend-only    Deploy only backend
  --frontend-only   Deploy only frontend
  --migrate         Run database migrations (alembic upgrade head)
  --skip-build      Skip frontend build (prod only)
  --branch <name>   Git branch to deploy (prod only, default: main)
  --help            Show this help message

DATABASE CONFIGURATION:
  LOCAL/DEVELOPMENT (.env on local machine):
    DATABASE_URL=postgresql://postgres:Testcentime\$100@db.mskrrxsixxflavjuxiun.supabase.co:5432/postgres
    
  PRODUCTION (.env on EC2):
    DATABASE_URL=postgresql://postgres:YourPassword@centime-test-db.xxxxx.us-east-1.rds.amazonaws.com:5432/test_management

EXAMPLES:
  $0 dev                        # Deploy both frontend and backend locally (uses Supabase)
  $0 prod                       # Deploy both to EC2, pulls main branch from git
  $0 prod --branch develop      # Deploy from develop branch
  $0 prod --backend-only        # Deploy only backend to EC2
  $0 prod --frontend-only       # Deploy only frontend to EC2

EOF
}

check_ec2_connection() {
    print_info "Checking EC2 connection..."
    if ! ssh -i "$EC2_KEY" -o ConnectTimeout=5 "$EC2_USER@$EC2_HOST" "echo 'Connected'" &>/dev/null; then
        print_error "Cannot connect to EC2. Please check your SSH key and network connection."
        exit 1
    fi
    print_success "EC2 connection verified"
}

###############################################################################
# Backend Deployment Functions
###############################################################################

deploy_backend_dev() {
    print_header "Deploying Backend - Development"
    
    cd "$BACKEND_DIR"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_info "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    print_info "Activating virtual environment..."
    source venv/bin/activate
    
    # Install/update dependencies
    print_info "Installing dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    
    # Check .env file
    if [ ! -f ".env" ]; then
        print_error ".env file not found in backend directory"
        exit 1
    fi
    
    # Verify database connection and check it's pointing to Supabase for dev
    print_info "Verifying database connection..."
    DB_HOST=$(python3 -c "from app.core.config import settings; print(settings.DATABASE_URL.split('@')[1].split(':')[0])" 2>/dev/null || echo "unknown")
    print_info "Database Host: $DB_HOST"
    
    if [[ "$DB_HOST" == *"supabase"* ]]; then
        print_success "✓ Using Supabase PostgreSQL (Development)"
    elif [[ "$DB_HOST" == *"rds.amazonaws.com"* ]]; then
        print_warning "⚠️  Using AWS RDS PostgreSQL - This is typically for PRODUCTION!"
        print_warning "    For development, consider using Supabase: db.mskrrxsixxflavjuxiun.supabase.co"
    elif [[ "$DB_HOST" == "localhost" ]]; then
        print_info "Using local PostgreSQL database"
    else
        print_info "Database: $DB_HOST"
    fi
    
    # Run database migrations (only if --migrate flag is set)
    if [ "$RUN_MIGRATE" = "true" ]; then
        print_info "Running database migrations..."
        if alembic upgrade head; then
            print_success "✓ Database migrations applied successfully"
        else
            print_warning "⚠️  Migration failed or no new migrations to apply"
        fi
    fi
    
    # Kill any existing backend process
    print_info "Stopping existing backend process..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
    
    # Start backend
    print_info "Starting backend server..."
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/backend.log 2>&1 &
    
    sleep 3
    
    if lsof -ti:8000 > /dev/null; then
        print_success "Backend deployed successfully on http://localhost:8000"
        print_info "API Documentation: http://localhost:8000/docs"
    else
        print_error "Backend failed to start. Check /tmp/backend.log"
        exit 1
    fi
}

deploy_backend_prod() {
    print_header "Deploying Backend - Production (EC2)"
    
    check_ec2_connection
    
    # Check for production .env file (needed to copy to EC2)
    if [ ! -f "$BACKEND_DIR/.env.prod" ]; then
        print_error "Production environment file not found: $BACKEND_DIR/.env.prod"
        print_info "Please create .env.prod with AWS RDS DATABASE_URL"
        exit 1
    fi
    
    # Verify production .env has AWS RDS (not Supabase)
    if grep -q "supabase" "$BACKEND_DIR/.env.prod"; then
        print_error "Production .env.prod appears to point to Supabase!"
        print_error "Please update DATABASE_URL to use AWS RDS"
        exit 1
    fi
    
    # Copy production .env to EC2
    print_info "Deploying production environment configuration..."
    scp -i "$EC2_KEY" "$BACKEND_DIR/.env.prod" "$EC2_USER@$EC2_HOST:$EC2_BACKEND_PATH/.env"
    
    # Deploy on EC2 - pull from git and restart service
    print_info "Pulling latest code from git and configuring backend on EC2..."
    ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "RUN_MIGRATE=$RUN_MIGRATE GIT_BRANCH=${GIT_BRANCH:-main} bash -s" << 'EOFBACKEND'
        set -e
        cd ~/CentimePlatformTestingSuite
        
        # Fetch and pull latest code from git
        echo "Pulling latest code from branch: $GIT_BRANCH"
        git fetch origin
        git checkout $GIT_BRANCH
        git pull origin $GIT_BRANCH
        
        echo "✅ Code updated from git"
        
        cd backend
        
        # Ensure .env file is preserved (it was copied before git pull)
        if [ ! -f ".env" ]; then
            echo "❌ .env file missing after git pull!"
            exit 1
        fi
        
        # Update environment
        source venv/bin/activate
        pip install -q --upgrade pip
        pip install -q -r requirements.txt
        
        # Update systemd service file (ensures workers count is synced)
        echo "Updating systemd service configuration..."
        sudo tee /etc/systemd/system/centime-backend.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Centime QA Portal Backend
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/CentimePlatformTestingSuite/backend
Environment="PATH=/home/ubuntu/CentimePlatformTestingSuite/backend/venv/bin"
ExecStart=/home/ubuntu/CentimePlatformTestingSuite/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF
        sudo systemctl daemon-reload
        
        # Verify configuration and database
        echo "Verifying configuration..."
        python3 -c "from app.core.config import settings; print(f'FRONTEND_URL: {settings.FRONTEND_URL}')"
        
        # Check database host - Production should use AWS RDS
        DB_HOST=$(python3 -c "from app.core.config import settings; print(settings.DATABASE_URL.split('@')[1].split(':')[0])" 2>/dev/null || echo "unknown")
        echo "Database Host: $DB_HOST"
        
        if [[ "$DB_HOST" == *"rds.amazonaws.com"* ]]; then
            echo "✅ Using AWS RDS PostgreSQL (Production)"
        elif [[ "$DB_HOST" == *"supabase"* ]]; then
            echo "⚠️  WARNING: Using Supabase - This is typically for DEVELOPMENT!"
            echo "    For production, consider using AWS RDS"
        else
            echo "Database: $DB_HOST"
        fi
        
        # Run database migrations (only if --migrate flag is set)
        if [ "$RUN_MIGRATE" = "true" ]; then
            echo "Running database migrations..."
            if alembic upgrade head; then
                echo "✅ Database migrations applied successfully"
            else
                echo "⚠️  Migration failed or no new migrations to apply"
            fi
        fi
        
        # Restart backend service
        echo "Restarting backend service..."
        sudo systemctl restart centime-backend
        sleep 3
        
        # Check service status
        if sudo systemctl is-active --quiet centime-backend; then
            echo "✅ Backend service is running"
            sudo systemctl status centime-backend --no-pager | head -10
        else
            echo "❌ Backend service failed to start"
            sudo journalctl -u centime-backend -n 20 --no-pager
            exit 1
        fi
EOFBACKEND
    
    print_success "Backend deployed to production"
    print_info "Backend API: https://$PROD_DOMAIN/api"
    print_info "API Docs: https://$PROD_DOMAIN/docs"
}

###############################################################################
# Frontend Deployment Functions
###############################################################################

deploy_frontend_dev() {
    print_header "Deploying Frontend - Development"
    
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing npm dependencies..."
        npm install
    fi
    
    # Check .env file
    if [ ! -f ".env" ]; then
        print_error ".env file not found in frontend directory"
        exit 1
    fi
    
    # Verify environment variables
    if ! grep -q "REACT_APP_API_BASE_URL" .env; then
        print_warning "REACT_APP_API_BASE_URL not found in .env"
    fi
    
    # Kill any existing frontend process
    print_info "Stopping existing frontend process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
    
    # Start frontend
    print_info "Starting frontend development server..."
    nohup npm start > /tmp/frontend.log 2>&1 &
    
    sleep 5
    
    if lsof -ti:3000 > /dev/null; then
        print_success "Frontend deployed successfully on http://localhost:3000"
    else
        print_error "Frontend failed to start. Check /tmp/frontend.log"
        exit 1
    fi
}

deploy_frontend_prod() {
    print_header "Deploying Frontend - Production (EC2)"
    
    check_ec2_connection
    
    cd "$FRONTEND_DIR"
    
    if [ "$SKIP_BUILD" != "true" ]; then
        # Build frontend
        print_info "Building frontend for production..."
        
        # Verify .env has production settings
        if ! grep -q "REACT_APP_API_BASE_URL=https://$PROD_DOMAIN" .env; then
            print_warning "Updating .env with production URL..."
            sed -i.bak "s|REACT_APP_API_BASE_URL=.*|REACT_APP_API_BASE_URL=https://$PROD_DOMAIN|" .env
        fi
        
        # Clean and build
        rm -rf build
        npm run build
        
        if [ ! -d "build" ]; then
            print_error "Build failed - build directory not found"
            exit 1
        fi
        
        print_success "Frontend build completed"
    else
        print_info "Skipping build (--skip-build flag)"
    fi
    
    # Deploy to EC2
    print_info "Deploying frontend to EC2..."
    rsync -avz --delete \
        -e "ssh -i $EC2_KEY" \
        build/ "$EC2_USER@$EC2_HOST:$EC2_FRONTEND_PATH/build/"
    
    # Configure Nginx (if needed)
    print_info "Verifying Nginx configuration..."
    ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOFFRONTEND'
        set -e
        
        # Check if client_max_body_size is set
        if ! sudo grep -q "client_max_body_size" /etc/nginx/sites-available/centime-qa-portal; then
            echo "Adding client_max_body_size to Nginx config..."
            sudo sed -i '/server_name qa-portal.ddns.net;/a\    client_max_body_size 100M;' /etc/nginx/sites-available/centime-qa-portal
            sudo nginx -t && sudo systemctl reload nginx
            echo "✅ Nginx configuration updated"
        else
            echo "✅ Nginx already configured"
        fi
        
        # Verify frontend files
        if [ -f ~/CentimePlatformTestingSuite/frontend/build/index.html ]; then
            echo "✅ Frontend files deployed successfully"
        else
            echo "❌ Frontend deployment failed"
            exit 1
        fi
EOFFRONTEND
    
    print_success "Frontend deployed to production"
    print_info "Application URL: https://$PROD_DOMAIN"
}

###############################################################################
# Full EC2 Infrastructure Setup (First-time only)
###############################################################################

setup_ec2_infrastructure() {
    print_header "Setting up EC2 Infrastructure"
    
    check_ec2_connection
    
    print_info "This will set up the complete infrastructure on EC2..."
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborted"
        exit 0
    fi
    
    ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOFSETUP'
        set -e
        
        echo "Installing system dependencies..."
        sudo apt update -qq
        sudo apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx
        
        echo "Creating project directory..."
        mkdir -p ~/CentimePlatformTestingSuite/backend
        mkdir -p ~/CentimePlatformTestingSuite/frontend/build
        
        echo "Setting up Python virtual environment..."
        cd ~/CentimePlatformTestingSuite/backend
        python3 -m venv venv
        
        echo "Creating systemd service..."
        sudo tee /etc/systemd/system/centime-backend.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Centime QA Portal Backend
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/CentimePlatformTestingSuite/backend
Environment="PATH=/home/ubuntu/CentimePlatformTestingSuite/backend/venv/bin"
ExecStart=/home/ubuntu/CentimePlatformTestingSuite/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable centime-backend
        
        echo "✅ EC2 infrastructure setup complete"
        echo "Next steps:"
        echo "1. Copy .env file to backend directory"
        echo "2. Run: ./deploy_app.sh prod"
EOFSETUP
    
    print_success "EC2 infrastructure setup complete"
}

###############################################################################
# Main Deployment Logic
###############################################################################

main() {
    # Parse arguments
    ENVIRONMENT=""
    BACKEND_ONLY=false
    FRONTEND_ONLY=false
    SKIP_BUILD=false
    SETUP_INFRA=false
    RUN_MIGRATE=false
    GIT_BRANCH="main"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|prod)
                ENVIRONMENT="$1"
                shift
                ;;
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --migrate)
                RUN_MIGRATE=true
                shift
                ;;
            --branch)
                GIT_BRANCH="$2"
                shift 2
                ;;
            --setup-infra)
                SETUP_INFRA=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [ -z "$ENVIRONMENT" ] && [ "$SETUP_INFRA" != "true" ]; then
        print_error "Environment not specified"
        show_usage
        exit 1
    fi
    
    # Setup infrastructure if requested
    if [ "$SETUP_INFRA" = "true" ]; then
        setup_ec2_infrastructure
        exit 0
    fi
    
    # Print deployment info
    print_header "Centime QA Portal Deployment"
    print_info "Environment: $ENVIRONMENT"
    print_info "Backend: $([ "$FRONTEND_ONLY" = true ] && echo "Skip" || echo "Deploy")"
    print_info "Frontend: $([ "$BACKEND_ONLY" = true ] && echo "Skip" || echo "Deploy")"
    [ "$ENVIRONMENT" = "prod" ] && print_info "Git Branch: $GIT_BRANCH"
    print_info "Migrate: $([ "$RUN_MIGRATE" = true ] && echo "Yes" || echo "No")"
    echo ""
    
    # Deploy based on environment and options
    if [ "$ENVIRONMENT" = "dev" ]; then
        # Development deployment
        if [ "$FRONTEND_ONLY" != "true" ]; then
            deploy_backend_dev
        fi
        
        if [ "$BACKEND_ONLY" != "true" ]; then
            deploy_frontend_dev
        fi
        
        print_header "Deployment Complete"
        print_success "Development environment is ready!"
        [ "$FRONTEND_ONLY" != "true" ] && print_info "Backend: http://localhost:8000"
        [ "$FRONTEND_ONLY" != "true" ] && print_info "API Docs: http://localhost:8000/docs"
        [ "$BACKEND_ONLY" != "true" ] && print_info "Frontend: http://localhost:3000"
        
    elif [ "$ENVIRONMENT" = "prod" ]; then
        # Production deployment
        if [ "$FRONTEND_ONLY" != "true" ]; then
            deploy_backend_prod
        fi
        
        if [ "$BACKEND_ONLY" != "true" ]; then
            deploy_frontend_prod
        fi
        
        print_header "Deployment Complete"
        print_success "Production environment is ready!"
        print_info "Application: https://$PROD_DOMAIN"
        print_info "API Docs: https://$PROD_DOMAIN/docs"
        print_info "Backend Status: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'sudo systemctl status centime-backend'"
        
    fi
    
    echo ""
}

# Run main function
main "$@"
