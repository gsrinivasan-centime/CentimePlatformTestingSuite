# AWS EC2 Deployment Guide - Backend + Frontend

## Overview

This guide deploys both backend (FastAPI) and frontend (React) on a single EC2 instance.

**Free Tier Coverage:**
- ✅ EC2 t2.micro/t3.micro: 750 hours/month (24/7 for 12 months)
- ✅ 1 vCPU, 1 GB RAM
- ✅ 30 GB EBS storage
- ✅ **Perfect for 20 users** - your app is lightweight (API + static React files)

---

## Step 1: Launch EC2 Instance

### 1.1 Go to EC2 Console

1. Login to AWS Console: https://console.aws.amazon.com/
2. Select **us-east-2 (Ohio)** region (same as your RDS for lower latency)
3. Go to **EC2** service
4. Click **Launch Instance**

### 1.2 Configure Instance

**Name:** `centime-test-management`

**Application and OS Images (AMI):**
- Quick Start: **Ubuntu**
- Ubuntu Server 22.04 LTS (Free tier eligible)
- Architecture: **64-bit (x86)**

**Instance type:**
- **t2.micro** (Free tier eligible)
- 1 vCPU, 1 GB RAM
- ✅ Sufficient for 20 users!

**Key pair:**
- Click **Create new key pair**
- Name: `centime-ec2-key`
- Type: **RSA**
- Format: **.pem** (for macOS/Linux)
- Download and save to `~/.ssh/centime-ec2-key.pem`

**Network settings:**
- Create security group: **Yes**
- Security group name: `centime-sg`
- Description: `Centime Test Management Security Group`

**Inbound rules:**
- ☑️ SSH (port 22) - Your IP
- ☑️ HTTP (port 80) - Anywhere (0.0.0.0/0)
- ☑️ HTTPS (port 443) - Anywhere (0.0.0.0/0)

**Configure storage:**
- 20 GB gp3 (Free tier: up to 30 GB)

**Advanced details:**
- Leave defaults

Click **Launch instance**

### 1.3 Wait for Instance to Start

- Status should show "Running" (takes 2-3 minutes)
- Copy the **Public IPv4 address** (e.g., 18.222.x.x)

---

## Step 2: Connect to EC2 Instance

### 2.1 Set Key Permissions

```bash
# On your local machine
chmod 400 ~/.ssh/centime-ec2-key.pem
```

### 2.2 SSH into Instance

```bash
# Replace <EC2-PUBLIC-IP> with your instance's public IP
ssh -i ~/.ssh/centime-ec2-key.pem ubuntu@<EC2-PUBLIC-IP>

# Example:
# ssh -i ~/.ssh/centime-ec2-key.pem ubuntu@18.222.123.45
```

---

## Step 3: Initial Server Setup

### 3.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Required Software

```bash
# Install Python, Node.js, Nginx, Git
sudo apt install -y python3-pip python3-venv git nginx nodejs npm
```

### 3.3 Install Node.js 18+ (for React build)

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node --version   # Should be v18.x or higher
npm --version    # Should be 9.x or higher
python3 --version  # Should be 3.10+
```

---

## Step 4: Deploy Backend

### 4.1 Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/gsrinivasan-centime/CentimePlatformTestingSuite.git
cd CentimePlatformTestingSuite
```

**OR** if repository is private, use SSH key or transfer files:

```bash
# From your local machine, transfer files
scp -i ~/.ssh/centime-ec2-key.pem -r /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite ubuntu@<EC2-IP>:/home/ubuntu/
```

### 4.2 Setup Backend

```bash
cd /home/ubuntu/CentimePlatformTestingSuite/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 4.3 Create .env File

```bash
nano .env
```

Paste this content (update with your values):

```env
# Database - AWS RDS PostgreSQL
DATABASE_URL=postgresql://postgres:Testcentime$100@centime-test-db.crcyycecwv41.us-east-2.rds.amazonaws.com:5432/centime_qa_portal_db?sslmode=require

# Security
SECRET_KEY=fcc8666eb89ef8acbf80cdbecfda51eaa1549f2d6b90033be9c8d33159dc8a2b
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS - Update with EC2 public IP
ALLOWED_ORIGINS=http://<EC2-PUBLIC-IP>,http://<EC2-PUBLIC-IP>:3000,http://localhost:3000

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

# Confluence Configuration
CONFLUENCE_URL=https://centime.atlassian.net/wiki
CONFLUENCE_EMAIL=gsrinivasan@centime.com
CONFLUENCE_API_TOKEN=ATATT3xFfGF0Cwih9YVoZ1x0mWdnO2HccUpBX8sWiZx8wSOJE1MID09EPRoNpcCj4C4Uc2sRc90BCUxuOEQtwkes3ZvUEirBKjFcqL-Tvi0wGZukTx_fjy5Z25NrzQggsQkNzgH1LZGp5VT4xH1xziy5iIl5B5yg0s7COkdiorwW7lZaAkz2RaE=8FA663C8
CONFLUENCE_SPACE_KEY=CTD
CONFLUENCE_PAGE_ID=1133838341
```

Save and exit (Ctrl+O, Enter, Ctrl+X)

### 4.4 Create Systemd Service for Backend

```bash
sudo nano /etc/systemd/system/centime-backend.service
```

Paste this content:

```ini
[Unit]
Description=Centime Test Management Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/CentimePlatformTestingSuite/backend
Environment="PATH=/home/ubuntu/CentimePlatformTestingSuite/backend/venv/bin"
ExecStart=/home/ubuntu/CentimePlatformTestingSuite/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Save and exit.

### 4.5 Start Backend Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable centime-backend

# Start service
sudo systemctl start centime-backend

# Check status
sudo systemctl status centime-backend

# Should show "active (running)" in green
```

**View logs if needed:**
```bash
sudo journalctl -u centime-backend -f
```

---

## Step 5: Deploy Frontend

### 5.1 Setup Frontend

```bash
cd /home/ubuntu/CentimePlatformTestingSuite/frontend

# Install dependencies
npm install

# Create .env file for production
nano .env.production
```

Paste this content (replace with your EC2 IP):

```env
REACT_APP_API_URL=http://<EC2-PUBLIC-IP>/api
```

Save and exit.

### 5.2 Build Frontend

```bash
# Build production-optimized React app
npm run build

# This creates /home/ubuntu/CentimePlatformTestingSuite/frontend/build/
```

---

## Step 6: Configure Nginx

### 6.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/centime
```

Paste this content:

```nginx
server {
    listen 80;
    server_name <EC2-PUBLIC-IP>;  # Replace with your EC2 IP or domain

    # Frontend - Serve React build
    location / {
        root /home/ubuntu/CentimePlatformTestingSuite/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API - Proxy to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend Docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000/redoc;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Increase upload size for file uploads
    client_max_body_size 10M;
}
```

Save and exit.

### 6.2 Enable Site and Restart Nginx

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/centime /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Should output: "syntax is okay" and "test is successful"

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

---

## Step 7: Update Security Group for RDS

Your EC2 instance needs to connect to RDS. Update RDS security group:

1. Go to **RDS Console** → Your database → **Connectivity & security**
2. Click on the **VPC security group** link
3. Click **Edit inbound rules**
4. **Add rule:**
   - Type: PostgreSQL
   - Port: 5432
   - Source: **Custom** → Select the EC2 security group (centime-sg)
   - Description: `Allow EC2 to connect to RDS`
5. **Save rules**

---

## Step 8: Test Deployment

### 8.1 Test Backend

```bash
# From EC2 instance
curl http://localhost:8000/health

# Should return: {"status":"healthy"}
```

### 8.2 Test Frontend

Open browser and go to:
```
http://<EC2-PUBLIC-IP>
```

You should see your React application!

### 8.3 Test API through Nginx

```
http://<EC2-PUBLIC-IP>/api/health
http://<EC2-PUBLIC-IP>/docs
```

### 8.4 Login

- Go to `http://<EC2-PUBLIC-IP>`
- Login with:
  - Email: `gsrinivasan@centime.com`
  - Password: `Admin123!`

---

## Performance Analysis for 20 Users

### Resource Usage Estimation:

**Backend (FastAPI with 2 workers):**
- Memory: ~200-300 MB
- CPU: Minimal (<20% on average)
- Each request: ~10-50ms processing

**Frontend (Static files via Nginx):**
- Memory: Negligible
- CPU: Minimal (Nginx is very efficient)
- Instant delivery (already built)

**Database (RDS):**
- Separate instance (not using EC2 resources)

### Can t2.micro handle 20 users?

**Yes, easily!** Here's why:

| Metric | t2.micro Capacity | 20 Users Need | Verdict |
|--------|------------------|---------------|---------|
| **Concurrent Users** | 50-100+ | 20 | ✅ 2-5x headroom |
| **RAM** | 1 GB | ~400 MB | ✅ 60% free |
| **CPU** | 1 vCPU | <30% avg | ✅ 70% free |
| **Network** | Good | Low | ✅ Plenty |

**Realistic scenarios:**
- **Normal usage**: 2-5 users active simultaneously → 10-20% resources
- **Peak usage**: All 20 users active → 40-60% resources
- **Load testing**: Can handle 50+ concurrent requests

### When to upgrade?

Upgrade to **t2.small** (2 vCPU, 2 GB) if:
- More than 50 users
- Heavy concurrent usage (10+ users simultaneously)
- Running additional services
- Complex background jobs

---

## Maintenance Commands

### View Backend Logs

```bash
# Real-time logs
sudo journalctl -u centime-backend -f

# Last 100 lines
sudo journalctl -u centime-backend -n 100

# Logs from today
sudo journalctl -u centime-backend --since today
```

### Restart Services

```bash
# Restart backend
sudo systemctl restart centime-backend

# Restart Nginx
sudo systemctl restart nginx

# Restart both
sudo systemctl restart centime-backend nginx
```

### Update Deployment

```bash
# Pull latest code
cd /home/ubuntu/CentimePlatformTestingSuite
git pull

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart centime-backend

# Update frontend
cd ../frontend
npm install
npm run build
sudo systemctl restart nginx
```

### Monitor Resources

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Check running services
sudo systemctl status centime-backend nginx
```

---

## Security Hardening

### 1. Setup Firewall (UFW)

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status
```

### 2. Automatic Security Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 3. Setup SSL/HTTPS (Optional - if you have a domain)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is setup automatically
```

---

## Troubleshooting

### Backend not starting

```bash
# Check logs
sudo journalctl -u centime-backend -n 50

# Check if port 8000 is in use
sudo lsof -i :8000

# Test backend manually
cd /home/ubuntu/CentimePlatformTestingSuite/backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend not loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Check if build exists
ls -la /home/ubuntu/CentimePlatformTestingSuite/frontend/build/
```

### Can't connect to RDS

```bash
# Test RDS connection from EC2
psql "postgresql://postgres:Testcentime\$100@centime-test-db.crcyycecwv41.us-east-2.rds.amazonaws.com:5432/centime_qa_portal_db?sslmode=require"

# Check RDS security group allows EC2 security group
```

### High CPU/Memory usage

```bash
# Check resource usage
htop

# Check which process is using resources
ps aux --sort=-%mem | head -10
ps aux --sort=-%cpu | head -10

# Restart services
sudo systemctl restart centime-backend nginx
```

---

## Cost Breakdown

### Free Tier (12 months):

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| EC2 t2.micro | 750 hrs/month | 720 hrs | **$0** |
| RDS db.t3.micro | 750 hrs/month | 720 hrs | **$0** |
| EBS Storage | 30 GB | 20 GB | **$0** |
| Data Transfer | 1 GB out | <1 GB | **$0** |

**Total:** $0/month for 12 months

### After Free Tier (13+ months):

- EC2 t2.micro: ~$8.50/month
- RDS db.t3.micro: ~$15/month  
- Total: ~$23.50/month

---

## Quick Reference

**EC2 SSH:**
```bash
ssh -i ~/.ssh/centime-ec2-key.pem ubuntu@<EC2-IP>
```

**Application URLs:**
- Frontend: `http://<EC2-IP>`
- Backend API: `http://<EC2-IP>/api`
- API Docs: `http://<EC2-IP>/docs`

**Service Commands:**
```bash
sudo systemctl status centime-backend
sudo systemctl restart centime-backend
sudo systemctl status nginx
sudo systemctl restart nginx
```

**Logs:**
```bash
sudo journalctl -u centime-backend -f
sudo tail -f /var/log/nginx/error.log
```

---

**Setup Time:** ~30-45 minutes  
**User Capacity:** 20-50 users comfortably  
**Free Tier Coverage:** 12 months  
**Recommended For:** Small teams, QA environments, internal tools

Let me know when you're ready to start, and I'll guide you through each step!
