# PostgreSQL Database Setup Guide

This application uses **PostgreSQL** as the database backend with **Alembic** for migrations.

## Prerequisites

### 1. Install PostgreSQL

#### macOS (using Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

### 2. Create Database

After installing PostgreSQL, create a database for the application:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE test_management;

# Create user (optional, if you want a dedicated user)
CREATE USER test_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE test_management TO test_user;

# Exit psql
\q
```

## Configuration

### 1. Update .env File

Copy the example environment file and update the database URL:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_management
```

**Connection String Format:**
```
postgresql://username:password@host:port/database_name
```

**Examples:**
- Local development: `postgresql://postgres:postgres@localhost:5432/test_management`
- Docker: `postgresql://postgres:postgres@db:5432/test_management`
- Cloud (Heroku): `postgresql://user:pass@host:5432/dbname?sslmode=require`
- Cloud (AWS RDS): `postgresql://user:pass@rds-instance.region.rds.amazonaws.com:5432/dbname`

### 2. Install Python Dependencies

```bash
cd backend
source venv/bin/activate  # or 'venv\Scripts\activate' on Windows
pip install -r requirements.txt
```

## Database Initialization

### Option 1: Automated Setup (Recommended)

Run the initialization script to create tables and seed initial data:

```bash
cd backend
source venv/bin/activate
python init_db_postgres.py
```

This will:
- Run all Alembic migrations to create tables
- Create admin and test users
- Create sample modules
- Create a sample release and test case

**Default Credentials:**
- Admin: `admin@centime.com` / `Admin123!`
- Tester: `tester@centime.com` / `Tester123!`

### Option 2: Manual Setup

If you prefer manual control:

```bash
cd backend
source venv/bin/activate

# Run migrations
alembic upgrade head

# Then run the application and use the API to create users
```

## Database Migrations

### Creating New Migrations

When you modify models in `app/models/models.py`, create a new migration:

```bash
cd backend
source venv/bin/activate

# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration file in alembic/versions/
# Edit if necessary, then apply it
alembic upgrade head
```

### Common Migration Commands

```bash
# View current migration status
alembic current

# View migration history
alembic history

# Upgrade to latest
alembic upgrade head

# Upgrade one version
alembic upgrade +1

# Downgrade one version
alembic downgrade -1

# Downgrade to specific revision
alembic downgrade <revision_id>

# View SQL without executing
alembic upgrade head --sql
```

## Connecting to PostgreSQL

### Using psql CLI

```bash
# Connect to database
psql -U postgres -d test_management

# Useful commands:
\dt          # List tables
\d+ users    # Describe users table
\l           # List databases
\du          # List users
\q           # Quit
```

### Using pgAdmin

1. Download from: https://www.pgadmin.org/download/
2. Add server with your connection details
3. Browse database structure and data

### Using DBeaver (Cross-platform)

1. Download from: https://dbeaver.io/download/
2. Create new PostgreSQL connection
3. Use your connection string details

## Docker Setup (Optional)

If you prefer using Docker for PostgreSQL:

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test_management
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Troubleshooting

### Connection Refused

**Problem:** `connection refused` error

**Solutions:**
1. Check if PostgreSQL is running: `brew services list` (macOS) or `systemctl status postgresql` (Linux)
2. Verify port 5432 is not in use: `lsof -i :5432`
3. Check firewall settings

### Authentication Failed

**Problem:** `authentication failed for user` error

**Solutions:**
1. Verify username/password in DATABASE_URL
2. Check `pg_hba.conf` file for authentication settings
3. Reset password: `ALTER USER postgres PASSWORD 'newpassword';`

### Database Does Not Exist

**Problem:** `database "test_management" does not exist`

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE test_management;"
```

### Migration Conflicts

**Problem:** Alembic reports conflicting migration heads

**Solution:**
```bash
# View branches
alembic branches

# Merge branches
alembic merge -m "merge heads" head1 head2

# Apply merged migration
alembic upgrade head
```

## Production Deployment

### Environment Variables

For production, use environment variables instead of .env file:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export SECRET_KEY="your-production-secret-key"
# ... other variables
```

### Connection Pooling

The application is configured with connection pooling:
- `pool_size=10`: Keep 10 connections open
- `max_overflow=20`: Allow 20 additional connections when needed
- `pool_pre_ping=True`: Verify connections before use

Adjust these in `app/core/database.py` based on your load.

### SSL/TLS

For cloud deployments, enable SSL:

```python
# Update database.py
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"sslmode": "require"}
)
```

### Backups

Set up regular backups:

```bash
# Backup
pg_dump -U postgres test_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -U postgres test_management < backup_20231122_120000.sql
```

### Monitoring

Monitor database performance:
- Use pg_stat_statements extension
- Monitor connection pool usage
- Set up alerts for slow queries
- Regular VACUUM and ANALYZE

## Migration from SQLite

If you have existing SQLite data, you can export and import:

### Export from SQLite

```bash
sqlite3 test_management.db .dump > sqlite_dump.sql
```

### Convert and Import

Use tools like `pgloader` or manually convert SQL:

```bash
# Install pgloader
brew install pgloader

# Convert
pgloader test_management.db postgresql://postgres:postgres@localhost/test_management
```

## Additional Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Alembic Documentation: https://alembic.sqlalchemy.org/
- SQLAlchemy Documentation: https://docs.sqlalchemy.org/
- Connection String Format: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
