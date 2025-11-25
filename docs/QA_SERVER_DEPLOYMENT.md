# QA Server Deployment Guide

## Current Setup
✅ Application is running with **Supabase** (cloud PostgreSQL)  
✅ No local database installation required

## Deployment Options

### Option 1: Use Supabase (Recommended) ⭐

**Advantages**:
- No PostgreSQL installation on QA server
- Same database accessible from dev and QA
- Minimal setup time
- Easy maintenance

#### Steps:

1. **Copy Project to QA Server**:
   ```bash
   # On your local machine
   cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite
   
   # Create deployment package (excludes venv, node_modules, etc.)
   tar -czf centime-test-mgmt.tar.gz \
     --exclude='backend/venv' \
     --exclude='backend/__pycache__' \
     --exclude='backend/app/__pycache__' \
     --exclude='frontend/node_modules' \
     --exclude='frontend/build' \
     --exclude='.git' \
     backend/ frontend/ docs/ *.sh *.md
   
   # Transfer to QA server
   scp centime-test-mgmt.tar.gz user@qa-server:/path/to/deployment/
   ```

2. **On QA Server - Extract and Setup**:
   ```bash
   # Extract
   cd /path/to/deployment
   tar -xzf centime-test-mgmt.tar.gz
   
   # Install Python dependencies
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment**:
   ```bash
   # Copy .env file (or create new one)
   cd backend
   cat > .env << 'EOF'
   # Database - Supabase (Cloud PostgreSQL)
   DATABASE_URL=postgresql://postgres:Testcentime$100@db.mskrrxsixxflavjuxiun.supabase.co:5432/postgres
   
   # Security
   SECRET_KEY=fcc8666eb89ef8acbf80cdbecfda51eaa1549f2d6b90033be9c8d33159dc8a2b
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   
   # CORS - Update with QA server URLs
   ALLOWED_ORIGINS=http://qa-server:3000,http://qa-server:8000
   
   # Email Domain
   ALLOWED_EMAIL_DOMAIN=centime.com
   
   # SMTP (Gmail)
   SMTP_USER=gsrinivasan@centime.com
   SMTP_PASSWORD=zajdwdgjmorieigz
   SMTP_FROM_EMAIL=gsrinivasan@centime.com
   
   # JIRA Integration
   JIRA_SERVER=https://centime.atlassian.net
   JIRA_EMAIL=gsrinivasan@centime.com
   JIRA_API_TOKEN=ATATT3xFfGF0Cwih9YVoZ1x0mWdnO2HccUpBX8sWiZx8wSOJE1MID09EPRoNpcCj4C4Uc2sRc90BCUxuOEQtwkes3ZvUEirBKjFcqL-Tvi0wGZukTx_fjy5Z25NrzQggsQkNzgH1LZGp5VT4xH1xziy5iIl5B5yg0s7COkdiorwW7lZaAkz2RaE=8FA663C8
   
   # File Storage
   FILE_STORAGE_BACKEND=confluence
   CONFLUENCE_URL=https://centime.atlassian.net/wiki
   CONFLUENCE_EMAIL=gsrinivasan@centime.com
   CONFLUENCE_API_TOKEN=ATATT3xFfGF0Cwih9YVoZ1x0mWdnO2HccUpBX8sWiZx8wSOJE1MID09EPRoNpcCj4C4Uc2sRc90BCUxuOEQtwkes3ZvUEirBKjFcqL-Tvi0wGZukTx_fjy5Z25NrzQggsQkNzgH1LZGp5VT4xH1xziy5iIl5B5yg0s7COkdiorwW7lZaAkz2RaE=8FA663C8
   CONFLUENCE_SPACE_KEY=CTD
   CONFLUENCE_PAGE_ID=1133838341
   EOF
   ```

4. **Start Backend**:
   ```bash
   cd /path/to/deployment
   ./start_backend.sh
   ```

5. **Setup Frontend** (if needed):
   ```bash
   cd frontend
   npm install
   npm start
   ```

6. **Verify Deployment**:
   ```bash
   # Test backend
   curl http://localhost:8000/health
   
   # Should return: {"status":"healthy"}
   ```

---

### Option 2: Local PostgreSQL on QA Server

**When to use**: If company policy requires local database on QA server

#### Prerequisites:
- PostgreSQL 16+ installed on QA server
- Sufficient disk space for database
- Database backup/maintenance plan

#### Steps:

1. **Install PostgreSQL on QA Server**:
   
   **Ubuntu/Debian**:
   ```bash
   sudo apt update
   sudo apt install postgresql-16 postgresql-contrib-16
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```
   
   **RHEL/CentOS/AlmaLinux**:
   ```bash
   sudo dnf install postgresql-server postgresql-contrib
   sudo postgresql-setup --initdb
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Create Database and User**:
   ```bash
   sudo -u postgres psql
   ```
   
   ```sql
   -- Create database
   CREATE DATABASE test_management;
   
   -- Create user
   CREATE USER qa_admin WITH PASSWORD 'SecureQaPassword123!';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE test_management TO qa_admin;
   
   -- Connect to database
   \c test_management
   
   -- Grant schema privileges
   GRANT ALL ON SCHEMA public TO qa_admin;
   
   \q
   ```

3. **Configure PostgreSQL Access**:
   ```bash
   # Edit pg_hba.conf to allow local connections
   sudo nano /etc/postgresql/16/main/pg_hba.conf
   
   # Add this line (for local connections):
   local   test_management   qa_admin                   md5
   host    test_management   qa_admin   127.0.0.1/32    md5
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

4. **Deploy Application**:
   ```bash
   # Copy project files (same as Option 1 steps 1-2)
   
   # Update .env with local database
   cd backend
   cat > .env << 'EOF'
   DATABASE_URL=postgresql://qa_admin:SecureQaPassword123!@localhost:5432/test_management
   # ... rest of configuration same as Option 1
   EOF
   ```

5. **Run Database Migrations**:
   ```bash
   cd backend
   source venv/bin/activate
   
   # Apply migrations
   alembic upgrade head
   
   # Initialize with seed data
   python3 init_db_postgres.py
   ```

6. **Start Application**:
   ```bash
   ./start_backend.sh
   ```

---

## Systemd Service Setup (Production-Ready)

To run as a system service on QA server:

### Backend Service

```bash
sudo nano /etc/systemd/system/centime-backend.service
```

```ini
[Unit]
Description=Centime Test Management Backend
After=network.target

[Service]
Type=simple
User=qa-user
WorkingDirectory=/path/to/deployment/backend
Environment="PATH=/path/to/deployment/backend/venv/bin"
ExecStart=/path/to/deployment/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable centime-backend
sudo systemctl start centime-backend

# Check status
sudo systemctl status centime-backend
```

### Frontend Service (if needed)

```bash
sudo nano /etc/systemd/system/centime-frontend.service
```

```ini
[Unit]
Description=Centime Test Management Frontend
After=network.target

[Service]
Type=simple
User=qa-user
WorkingDirectory=/path/to/deployment/frontend
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Nginx Reverse Proxy (Optional)

If you want to serve on port 80/443:

```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/centime
```

```nginx
server {
    listen 80;
    server_name qa-server.centime.com;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend docs
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/centime /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Quick Deployment Script

Save this as `deploy_to_qa.sh`:

```bash
#!/bin/bash

# Configuration
QA_SERVER="user@qa-server-ip"
QA_PATH="/opt/centime-test-mgmt"
PROJECT_DIR="/Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite"

echo "📦 Creating deployment package..."
cd "$PROJECT_DIR"
tar -czf centime-deploy.tar.gz \
  --exclude='backend/venv' \
  --exclude='backend/__pycache__' \
  --exclude='backend/app/__pycache__' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/build' \
  --exclude='.git' \
  backend/ frontend/ docs/ *.sh *.md

echo "🚀 Transferring to QA server..."
scp centime-deploy.tar.gz "$QA_SERVER:~/"

echo "⚙️  Setting up on QA server..."
ssh "$QA_SERVER" << 'ENDSSH'
  # Extract
  sudo mkdir -p /opt/centime-test-mgmt
  sudo tar -xzf ~/centime-deploy.tar.gz -C /opt/centime-test-mgmt
  cd /opt/centime-test-mgmt/backend
  
  # Setup Python environment
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  
  # Copy .env if not exists
  if [ ! -f .env ]; then
    echo "⚠️  Please create .env file manually"
  fi
  
  echo "✅ Deployment complete!"
  echo "Next steps:"
  echo "1. Update backend/.env with correct DATABASE_URL"
  echo "2. Run: ./start_backend.sh"
ENDSSH

echo "✅ Deployment script completed!"
```

---

## Comparison: Supabase vs Local PostgreSQL

| Feature | Supabase | Local PostgreSQL |
|---------|----------|-----------------|
| Setup Time | 5 minutes | 30-60 minutes |
| Maintenance | Zero | Regular backups, updates |
| Cost | Free (up to 500MB) | Server resources |
| Scalability | Automatic | Manual |
| Backup | Automatic | Manual setup |
| Network | Requires internet | Local only |
| Shared Access | ✅ Easy | ❌ Complex |
| SSL/TLS | ✅ Built-in | Manual setup |

---

## Recommendation

**Use Supabase** unless:
- You have no internet on QA server
- Company policy requires on-premise database
- Data sensitivity requires local storage

For most QA environments, Supabase is the better choice because:
- Faster deployment
- No maintenance overhead
- Easier troubleshooting (same DB as dev)
- Free for QA workloads

---

## Troubleshooting

### Can't connect to Supabase from QA server
```bash
# Test connection
curl https://db.mskrrxsixxflavjuxiun.supabase.co

# Check firewall
sudo ufw status
sudo ufw allow out 5432/tcp
```

### Backend won't start
```bash
# Check logs
tail -f backend/logs/app.log

# Check port availability
lsof -i :8000

# Check Python environment
source backend/venv/bin/activate
python --version
pip list | grep -i sqlalchemy
```

### Database connection failed
```bash
# Verify connection string
cd backend
source venv/bin/activate
python3 -c "from app.core.config import settings; print(settings.DATABASE_URL)"

# Test direct connection
psql "$DATABASE_URL" -c "SELECT version();"
```

---

**Last Updated**: November 23, 2025  
**Current Database**: Supabase (mskrrxsixxflavjuxiun)  
**Backend Port**: 8000  
**Frontend Port**: 3000
