# AWS RDS PostgreSQL Setup Guide

## Benefits Over Supabase

✅ **Much Lower Latency** - Host in your region (India, US-East, etc.)  
✅ **Free Tier** - 12 months free (750 hours/month)  
✅ **Better Performance** - Dedicated instance  
✅ **AWS Integration** - Easy integration with other AWS services  
✅ **More Control** - Full PostgreSQL configuration access  

## Step-by-Step Setup

### Step 1: Create RDS PostgreSQL Instance

1. **Login to AWS Console**: https://console.aws.amazon.com/

2. **Go to RDS Service**:
   - Search for "RDS" in the AWS Console
   - Click "Create database"

3. **Database Creation Configuration**:

   **Choose a database creation method:**
   - ☑️ Standard create (NOT Easy create - to stay in free tier)

   **Engine options:**
   - Engine type: **PostgreSQL**
   - Version: **PostgreSQL 16.x** (latest)

   **Templates:**
   - ☑️ **Free tier** (IMPORTANT! This ensures free tier settings)

   **Settings:**
   - DB instance identifier: `centime-test-db`
   - Master username: `postgres` (default)
   - Master password: `YourSecurePassword123!` (save this!)
   - Confirm password: `YourSecurePassword123!`

   **Instance configuration:**
   - Burstable classes: **db.t3.micro** or **db.t4g.micro** (pre-selected with Free Tier)

   **Storage:**
   - Storage type: **General Purpose (SSD)**
   - Allocated storage: **20 GB** (max for free tier)
   - ☐ Enable storage autoscaling (uncheck to stay in free tier)

   **Connectivity:**
   - Compute resource: **Don't connect to an EC2 compute resource**
   - VPC: Default VPC
   - Public access: **Yes** (to connect from your laptop)
   - VPC security group: Create new
   - Security group name: `centime-db-sg`

   **Additional configuration:**
   - Initial database name: `test_management` (IMPORTANT! Create the database)
   - ☐ Enable automated backups (optional - uses free tier backup quota)
   - Backup retention period: 1 day (if enabled)
   - ☐ Enable encryption (optional)
   - ☑️ Enable deletion protection (recommended)

4. **Click "Create database"**
   - Takes 5-10 minutes to create

### Step 2: Configure Security Group

1. **After DB is created**, click on the DB instance name
2. **Go to "Connectivity & security" tab**
3. **Click on the VPC security group** link (e.g., `sg-xxxxx`)
4. **Click "Edit inbound rules"**
5. **Add rule**:
   - Type: **PostgreSQL**
   - Protocol: **TCP**
   - Port: **5432**
   - Source: **My IP** (for development)
     - OR **0.0.0.0/0** (for accessing from anywhere - less secure)
   - Description: `PostgreSQL access for Centime Test Management`
6. **Save rules**

### Step 3: Get Connection Details

1. **Go to RDS Console** → Databases → Select your instance
2. **Copy the Endpoint** (under "Connectivity & security"):
   ```
   centime-test-db.xxxxxxxxxxxxx.us-east-1.rds.amazonaws.com
   ```
3. **Note the Port**: Usually `5432`
4. **Master username**: `postgres`
5. **Password**: The password you set earlier
6. **Database name**: `test_management`

### Step 4: Test Connection from Your Laptop

```bash
# Install PostgreSQL client if not already installed
brew install postgresql  # macOS

# Test connection (replace with your values)
psql "postgresql://postgres:YourSecurePassword123!@centime-test-db.xxxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/test_management"

# If successful, you'll see:
# psql (16.x)
# SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256, compression: off)
# Type "help" for help.
# 
# test_management=>
```

### Step 5: Update Your Application

1. **Update `backend/.env`**:

```bash
cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite/backend

# Edit .env file
nano .env
```

Replace the DATABASE_URL with your RDS connection string:

```env
# Database - AWS RDS PostgreSQL (Free Tier)
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@centime-test-db.xxxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/test_management
```

2. **Run Migrations**:

```bash
cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite/backend
source venv/bin/activate

# Apply database schema
alembic upgrade head

# Initialize with seed data
python3 init_db_postgres.py
```

3. **Start Backend**:

```bash
cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite
./start_backend.sh
```

### Step 6: Verify Performance

Test the query performance:

```bash
cd backend
source venv/bin/activate

python3 -c "
import time
from sqlalchemy import create_engine, text
from app.core.config import settings

print('Testing AWS RDS Performance...')
print('=' * 60)

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# First connection
start = time.time()
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM users'))
    count = result.fetchone()[0]
elapsed = time.time() - start
print(f'First connection + query: {elapsed*1000:.2f}ms')

# Subsequent query
start = time.time()
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM jira_stories'))
    count = result.fetchone()[0]
elapsed = time.time() - start
print(f'Subsequent query: {elapsed*1000:.2f}ms')

print(f'\n✅ Connected to AWS RDS')
"
```

**Expected Performance:**
- First connection: **50-200ms** (much faster than Supabase!)
- Subsequent queries: **5-50ms** (excellent!)

## Region Selection for Best Performance

Choose RDS region based on your location:

| Your Location | Recommended AWS Region | Typical Latency |
|---------------|----------------------|-----------------|
| India | ap-south-1 (Mumbai) | 5-20ms |
| US East Coast | us-east-1 (N. Virginia) | 10-30ms |
| US West Coast | us-west-2 (Oregon) | 10-30ms |
| Europe | eu-west-1 (Ireland) | 10-40ms |
| Singapore | ap-southeast-1 | 5-20ms |

**For India**: Use **ap-south-1 (Mumbai)** for best performance!

## Cost Optimization Tips

### Stay Within Free Tier:

✅ **DO:**
- Use **db.t3.micro** or **db.t4g.micro** instance
- Keep storage ≤ 20 GB
- Use General Purpose (SSD) storage
- Backup retention ≤ 7 days (uses 20GB free backup quota)
- Single-AZ deployment (Multi-AZ costs extra)

❌ **DON'T:**
- Enable storage autoscaling beyond 20GB
- Use db.t3.small or larger instances
- Enable Multi-AZ deployment
- Use Provisioned IOPS storage
- Keep excessive backups

### Monitor Usage:

1. **AWS Billing Dashboard**: https://console.aws.amazon.com/billing/
2. Set up **Billing Alerts**:
   - Go to Billing → Budgets
   - Create budget: $1 threshold
   - Get email alerts if charges occur

### After 12 Months (Free Tier Ends):

**db.t3.micro costs** (after free tier):
- ~$15-20/month for 24/7 operation
- ~$0.017/hour

**Options:**
1. Continue with RDS (~$15-20/month)
2. Migrate back to Supabase free tier
3. Move to local PostgreSQL on your server
4. Delete RDS and create new AWS account (not recommended)

## Connection String Format

### RDS Connection String:
```
postgresql://[username]:[password]@[endpoint]:[port]/[database]

Example:
postgresql://postgres:MyPassword123!@centime-test-db.c9akciq32.ap-south-1.rds.amazonaws.com:5432/test_management
```

### Security Notes:

⚠️ **IMPORTANT:**
- Never commit `.env` file with credentials to Git
- Use strong passwords (12+ characters, mixed case, numbers, symbols)
- Restrict security group to your IP (not 0.0.0.0/0) for production
- Enable SSL/TLS (RDS supports it by default)
- Rotate passwords periodically
- Enable deletion protection
- Take regular backups before major changes

## Backup & Restore

### Manual Backup (Using pg_dump):

```bash
# Backup
pg_dump "postgresql://postgres:YourPassword@rds-endpoint:5432/test_management" > backup.sql

# Restore
psql "postgresql://postgres:YourPassword@rds-endpoint:5432/test_management" < backup.sql
```

### AWS RDS Automated Backups:

- Enabled by default with Free Tier
- Point-in-time recovery
- Retention: 1-7 days (stay in free tier)
- Restore from AWS RDS Console → Backups

## Troubleshooting

### Can't Connect to RDS

**1. Check Security Group:**
```bash
# Test if port is accessible
nc -zv centime-test-db.xxxxx.rds.amazonaws.com 5432

# Should output: Connection succeeded!
```

**2. Verify Public Access:**
- RDS Console → Your DB → Connectivity & security
- Publicly accessible: **Yes**

**3. Check VPC and Subnet:**
- Must be in a public subnet if accessing from internet
- Route table must have internet gateway

**4. Test with psql:**
```bash
psql "postgresql://postgres:YourPassword@your-rds-endpoint:5432/test_management" -c "SELECT version();"
```

### Slow Queries

**1. Enable Query Performance Insights:**
- RDS Console → Your DB → Configuration → Enable Performance Insights

**2. Check Connection Pooling:**
- Ensure `pool_size` and `max_overflow` are set in `database.py`

**3. Add Indexes:**
```sql
-- Connect to RDS
psql "your-connection-string"

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Add indexes as needed
CREATE INDEX idx_test_cases_module_id ON test_cases(module_id);
```

### Database Full (20GB Limit)

**1. Check Current Usage:**
```sql
SELECT pg_size_pretty(pg_database_size('test_management'));
```

**2. Clean Up:**
```sql
-- Drop old test data
DELETE FROM test_executions WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM FULL;
```

**3. Consider Archiving:**
- Export old data to S3
- Keep only recent data in RDS

## Migration from Supabase to RDS

### Quick Migration Script:

```bash
#!/bin/bash

# 1. Backup from Supabase
pg_dump "postgresql://postgres:Testcentime\$100@db.mskrrxsixxflavjuxiun.supabase.co:5432/postgres" > supabase_backup.sql

# 2. Restore to RDS (replace with your RDS endpoint)
psql "postgresql://postgres:YourPassword@centime-test-db.xxxxx.rds.amazonaws.com:5432/test_management" < supabase_backup.sql

echo "✅ Migration complete!"
```

### OR: Fresh Start with RDS

```bash
cd backend
source venv/bin/activate

# Update .env with RDS connection
# Then run:
alembic upgrade head
python3 init_db_postgres.py
```

## Performance Comparison

| Metric | Supabase | AWS RDS (ap-south-1) |
|--------|----------|---------------------|
| First Connection | 2000-3000ms | 50-200ms |
| Subsequent Queries | 100-500ms | 5-50ms |
| Latency (India) | 150-300ms | 5-20ms |
| Free Tier | Forever (500MB) | 12 months (20GB) |
| Cost After Free | Free | ~$15-20/month |

## Next Steps

1. ✅ Create RDS instance in your preferred region
2. ✅ Configure security group
3. ✅ Update `.env` with RDS connection string
4. ✅ Run migrations
5. ✅ Test performance
6. ✅ Enjoy fast queries! 🚀

---

**Last Updated**: November 23, 2025  
**AWS Free Tier**: 12 months from account creation  
**Recommended Region**: ap-south-1 (Mumbai) for India
