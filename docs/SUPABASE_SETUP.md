# Supabase PostgreSQL Setup

This project uses **Supabase** (cloud-hosted PostgreSQL) for the database, making deployment and collaboration easier.

## Current Configuration

**Project URL**: https://mskrrxsixxflavjuxiun.supabase.co  
**Database**: PostgreSQL 17.6 on Supabase  
**Connection**: Configured in `backend/.env`

## Database Connection

The database connection string is stored in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:Testcentime$100@db.mskrrxsixxflavjuxiun.supabase.co:5432/postgres
```

## Database Schema

The database has **17 tables** created via Alembic migrations:

1. `users` - User accounts and authentication
2. `modules` - Test modules organization
3. `sub_modules` - Sub-modules within modules
4. `features` - Feature definitions
5. `test_cases` - Test case details
6. `test_executions` - Test execution history
7. `releases` - Release management
8. `release_test_cases` - Test cases linked to releases
9. `release_approvals` - Release approval workflow
10. `release_history` - Release change history
11. `jira_stories` - JIRA story integration
12. `jira_defects` - JIRA defect tracking
13. `test_case_stories` - Test case to story mapping
14. `step_catalog` - Reusable test steps
15. `feature_files` - BDD feature files
16. `issues` - Issue tracking
17. `alembic_version` - Migration version tracking

## User Accounts

Default users created during initialization:

| Email | Password | Role | Status |
|-------|----------|------|--------|
| admin@centime.com | Admin123! | ADMIN | ✓ Verified |
| tester@centime.com | Tester123! | TESTER | ✓ Verified |
| gsrinivasan@centime.com | Admin123! | ADMIN | ✓ Verified |

## Accessing Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Login with your account
3. Select project: **mskrrxsixxflavjuxiun**
4. Access features:
   - **Table Editor**: View/edit data directly
   - **SQL Editor**: Run custom queries
   - **Database**: Connection settings and backups
   - **API**: Auto-generated REST APIs (not used in this project)

## Running Migrations

To apply database schema changes:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

To create a new migration after model changes:

```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## Initializing Fresh Database

If you need to reset or initialize a fresh Supabase database:

```bash
cd backend
source venv/bin/activate

# Run migrations
alembic upgrade head

# Seed initial data (users, modules, etc.)
python3 init_db_postgres.py
```

## Connection Pooling

The application uses SQLAlchemy connection pooling:

- **pool_pre_ping**: `True` (validates connections before use)
- **pool_size**: `10` (base connection pool size)
- **max_overflow**: `20` (additional connections when needed)

This is configured in `backend/app/core/database.py`.

## Advantages of Supabase

✅ **No local PostgreSQL installation required**  
✅ **Free tier includes**: 500MB database, 2GB bandwidth, 50MB file storage  
✅ **Automatic backups** (daily for paid plans)  
✅ **Easy collaboration** - share the same database across team  
✅ **Built-in monitoring** and logging  
✅ **SSL/TLS encryption** by default  
✅ **Auto-scaling** connection pooling  

## Development Workflow

1. **Local Development**: Backend connects to Supabase (no local DB needed)
2. **Database Changes**: Create Alembic migrations
3. **Team Collaboration**: Everyone uses the same Supabase database
4. **Deployment**: Same connection string works in production

## Troubleshooting

### Connection Issues

Check connection to Supabase:

```bash
cd backend
source venv/bin/activate
python3 -c "
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    result = conn.execute(text('SELECT version()'))
    print('✅ Connected:', result.fetchone()[0])
"
```

### View All Tables

```bash
cd backend
source venv/bin/activate
python3 -c "
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    result = conn.execute(text(
        \"SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename\"
    ))
    for row in result:
        print(row[0])
"
```

### Reset Password

If you forget the database password:

1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset database password"
3. Update the password in `backend/.env`

## Security Notes

⚠️ **Important**: Never commit `.env` file to Git (it's in `.gitignore`)  
⚠️ The database password should be kept secret  
⚠️ For production, use environment variables instead of `.env` file  

## Backup Strategy

**Automatic Backups** (Supabase handles this):
- Point-in-time recovery available
- Daily automated backups on paid plans

**Manual Backup** (if needed):

```bash
# Dump database
pg_dump "postgresql://postgres:Testcentime\$100@db.mskrrxsixxflavjuxiun.supabase.co:5432/postgres" > backup.sql

# Restore from backup
psql "postgresql://postgres:Testcentime\$100@db.mskrrxsixxflavjuxiun.supabase.co:5432/postgres" < backup.sql
```

## Migration from Local PostgreSQL

✅ **Completed**: Successfully migrated from local PostgreSQL to Supabase
- All tables created via Alembic migration
- User data initialized
- Sample modules and releases created
- Backend running successfully with Supabase

---

**Last Updated**: November 23, 2025  
**Database Version**: PostgreSQL 17.6  
**Migration Version**: 2991bee55e91 (Initial PostgreSQL migration)
