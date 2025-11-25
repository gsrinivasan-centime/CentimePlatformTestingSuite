# Deployment Guide - Centime QA Portal

This guide covers deploying the Centime QA Portal to both development (local) and production (EC2) environments.

## Quick Start

### Development Deployment (Local)
```bash
./deploy_app.sh dev
```

### Production Deployment (EC2)
```bash
./deploy_app.sh prod
```

## 📋 Prerequisites

### Development Environment
- Python 3.10+
- Node.js 18+
- PostgreSQL database (local or cloud)

### Production Environment
- AWS EC2 instance (t2.micro or larger)
- SSH key (`~/.ssh/centime-qa-portal-ec2-key.pem`)
- Domain name configured (qa-portal.ddns.net)
- AWS RDS PostgreSQL database

## 🚀 Deployment Commands

### Full Deployment

**Deploy everything to development:**
```bash
./deploy_app.sh dev
```

**Deploy everything to production:**
```bash
./deploy_app.sh prod
```

### Partial Deployment

**Deploy only backend to production:**
```bash
./deploy_app.sh prod --backend-only
```

**Deploy only frontend to production:**
```bash
./deploy_app.sh prod --frontend-only
```

**Deploy frontend without rebuilding (uses existing build):**
```bash
./deploy_app.sh prod --frontend-only --skip-build
```

### First-Time EC2 Setup

**Setup EC2 infrastructure (run once):**
```bash
./deploy_app.sh --setup-infra
```

This will:
- Install system dependencies (Python, Node.js, Nginx)
- Create project directories
- Set up systemd service
- Configure Nginx

## 📝 Deployment Script Features

### What the script does:

#### Backend Deployment (Dev)
1. ✅ Creates/activates Python virtual environment
2. ✅ Installs/updates Python dependencies
3. ✅ Verifies database connection
4. ✅ Stops existing backend process
5. ✅ Starts backend on port 8000
6. ✅ Verifies backend is running

#### Backend Deployment (Prod)
1. ✅ Syncs backend code to EC2 (excludes venv, cache)
2. ✅ Installs/updates dependencies on EC2
3. ✅ Verifies configuration
4. ✅ Restarts systemd service
5. ✅ Checks service status
6. ✅ Shows recent logs if failed

#### Frontend Deployment (Dev)
1. ✅ Installs npm dependencies if needed
2. ✅ Verifies .env configuration
3. ✅ Stops existing frontend process
4. ✅ Starts development server on port 3000
5. ✅ Verifies frontend is running

#### Frontend Deployment (Prod)
1. ✅ Verifies production .env settings
2. ✅ Builds optimized production bundle
3. ✅ Deploys build to EC2 via rsync
4. ✅ Verifies Nginx configuration (100MB upload limit)
5. ✅ Reloads Nginx if config changed
6. ✅ Verifies deployment success

### Infrastructure Configuration

The script automatically configures:

#### Nginx Settings
- ✅ 100MB upload limit (`client_max_body_size`)
- ✅ HTTPS with Let's Encrypt certificate
- ✅ HTTP to HTTPS redirect
- ✅ Reverse proxy for backend API
- ✅ Static file serving for frontend

#### Systemd Service
- ✅ Auto-start on boot
- ✅ Auto-restart on failure
- ✅ 2 Uvicorn workers
- ✅ Proper user permissions

## 🔧 Configuration Files

### Backend Configuration (.env)

**Development:**
```bash
cat backend/.env
```
Should contain:
- `DATABASE_URL` - PostgreSQL connection
- `FRONTEND_URL=http://localhost:3000`
- `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001`
- JIRA, Confluence, SMTP credentials

**Production (EC2):**
```bash
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'cat ~/CentimePlatformTestingSuite/backend/.env'
```
Should contain:
- `DATABASE_URL` - AWS RDS PostgreSQL
- `FRONTEND_URL=https://qa-portal.ddns.net`
- `ALLOWED_ORIGINS=https://qa-portal.ddns.net,http://localhost:3000`
- Production credentials

### Frontend Configuration (.env)

**Development:**
```dotenv
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_APP_NAME=Centime Test Management
REACT_APP_ALLOWED_EMAIL_DOMAIN=centime.com
```

**Production:**
```dotenv
REACT_APP_API_BASE_URL=https://qa-portal.ddns.net
REACT_APP_APP_NAME=Centime Test Management
REACT_APP_ALLOWED_EMAIL_DOMAIN=centime.com
```

## 📊 Post-Deployment Verification

### Development
```bash
# Check backend
curl http://localhost:8000/docs

# Check frontend
open http://localhost:3000
```

### Production
```bash
# Check backend API
curl https://qa-portal.ddns.net/api/auth/health

# Check frontend
open https://qa-portal.ddns.net

# Check backend service status
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo systemctl status centime-backend'

# Check Nginx status
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo systemctl status nginx'
```

## 🔍 Monitoring & Logs

### Development Logs
```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

### Production Logs
```bash
# Backend service logs
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo journalctl -u centime-backend -f'

# Backend last 50 lines
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo journalctl -u centime-backend -n 50'

# Nginx access logs
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo tail -f /var/log/nginx/access.log'

# Nginx error logs
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo tail -f /var/log/nginx/error.log'
```

## 🛠️ Troubleshooting

### Backend won't start (Dev)
```bash
# Check if port 8000 is in use
lsof -ti:8000

# Kill process
lsof -ti:8000 | xargs kill -9

# Check backend log
cat /tmp/backend.log
```

### Backend won't start (Prod)
```bash
# Check service status
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo systemctl status centime-backend'

# Check recent logs
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo journalctl -u centime-backend -n 50'

# Restart service
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo systemctl restart centime-backend'
```

### Frontend build fails
```bash
# Clean and rebuild
cd frontend
rm -rf node_modules build
npm install
npm run build
```

### Nginx 413 Error (File too large)
The deployment script automatically sets `client_max_body_size 100M`. If you need more:
```bash
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo sed -i "s/client_max_body_size 100M/client_max_body_size 500M/" /etc/nginx/sites-available/centime-qa-portal && sudo nginx -t && sudo systemctl reload nginx'
```

### Database connection issues
```bash
# Test database connection
cd backend
source venv/bin/activate
python3 -c "from app.core.config import settings; from sqlalchemy import create_engine; engine = create_engine(settings.DATABASE_URL); conn = engine.connect(); print('✅ Database connected')"
```

## 🔐 Security Notes

### Environment Variables
- Never commit `.env` files to git
- Keep production credentials separate from development
- Rotate API tokens and passwords regularly

### SSH Access
- Keep EC2 SSH key secure (`~/.ssh/centime-qa-portal-ec2-key.pem`)
- Set proper permissions: `chmod 400 ~/.ssh/centime-qa-portal-ec2-key.pem`
- Use key-based authentication only (no passwords)

### SSL Certificate
- Let's Encrypt certificate auto-renews via Certbot
- Certificate valid for 90 days
- Check renewal: `ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo certbot renew --dry-run'`

## 💰 AWS Free Tier Limits

### What's included:
- **EC2**: 750 hours/month (t2.micro)
- **RDS**: 750 hours/month (db.t3.micro)
- **Data Transfer**: 15 GB outbound/month
- **EBS Storage**: 30 GB

### Cost after free tier (~$23.50/month):
- EC2 t2.micro: ~$8.50/month
- RDS db.t3.micro: ~$15/month
- Data transfer: Variable

## 📞 Support

### Common Issues:
1. **Backend not responding**: Check systemd service logs
2. **Frontend 404 errors**: Verify Nginx configuration
3. **Database errors**: Check RDS security group allows EC2
4. **SSL errors**: Verify Let's Encrypt certificate is valid
5. **File upload fails**: Check Nginx `client_max_body_size`

### Quick Commands:
```bash
# Restart everything (Prod)
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo systemctl restart centime-backend nginx'

# View all logs (Prod)
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'sudo journalctl -u centime-backend -u nginx -n 100'

# Check disk space (Prod)
ssh -i ~/.ssh/centime-qa-portal-ec2-key.pem ubuntu@18.217.46.229 'df -h'
```

## 🎯 Best Practices

1. **Always test locally first**: Deploy to dev before prod
2. **Use version control**: Commit changes before deployment
3. **Backup database**: Before major updates
4. **Monitor logs**: Check logs after each deployment
5. **Incremental deployment**: Deploy backend first, then frontend
6. **Rollback plan**: Keep previous build for quick rollback

---

**Last Updated**: November 23, 2025
**Maintained By**: Centime Engineering Team
