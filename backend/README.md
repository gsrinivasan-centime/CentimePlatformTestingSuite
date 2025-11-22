# Backend - Centime Test Management System

FastAPI-based backend for the Centime Test Management System with PostgreSQL database.

## Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Virtual environment support

### Setup

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # macOS
   brew install postgresql@16
   brew services start postgresql@16
   
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Run Migration Script** (Automated setup)
   ```bash
   ./migrate_to_postgresql.sh
   ```
   
   This script will:
   - Create virtual environment
   - Install dependencies
   - Create PostgreSQL database
   - Run Alembic migrations
   - Seed initial data

3. **Start the Server**
   ```bash
   ./start_backend.sh
   ```

4. **Access the Application**
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Admin Panel: http://localhost:3000

## Manual Setup

If you prefer manual setup or the automated script fails:

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Create PostgreSQL Database

```bash
psql -U postgres -c "CREATE DATABASE test_management;"
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env and update DATABASE_URL
```

### 5. Run Migrations

```bash
alembic upgrade head
```

### 6. Initialize Data

```bash
python init_db_postgres.py
```

## Project Structure

```
backend/
├── alembic/                 # Database migrations
│   ├── versions/           # Migration scripts
│   ├── env.py             # Alembic configuration
│   └── README.md          # Migration documentation
├── app/
│   ├── api/               # API endpoints
│   │   ├── auth.py       # Authentication
│   │   ├── test_cases.py # Test case management
│   │   ├── issues.py     # Bug/issue tracking
│   │   └── ...
│   ├── core/             # Core functionality
│   │   ├── config.py     # Configuration
│   │   ├── database.py   # Database setup
│   │   └── security.py   # Security utilities
│   ├── models/           # SQLAlchemy models
│   │   └── models.py
│   ├── schemas/          # Pydantic schemas
│   │   └── schemas.py
│   ├── services/         # Business logic
│   │   ├── jira_service.py
│   │   ├── confluence_service.py
│   │   └── file_storage.py
│   └── main.py           # FastAPI application
├── reports/              # Generated reports
├── .env                  # Environment variables (not in git)
├── .env.example         # Environment template
├── requirements.txt     # Python dependencies
├── alembic.ini         # Alembic configuration
├── init_db_postgres.py # Database initialization
└── migrate_to_postgresql.sh # Migration helper
```

## Database Management

### Migrations with Alembic

Create a new migration after model changes:
```bash
alembic revision --autogenerate -m "Description"
```

Apply migrations:
```bash
alembic upgrade head
```

View current version:
```bash
alembic current
```

Rollback one version:
```bash
alembic downgrade -1
```

See [alembic/README.md](alembic/README.md) for detailed migration documentation.

### Database Backup

```bash
# Backup
pg_dump -U postgres test_management > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres test_management < backup_20231122.sql
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Authentication

### Default Users

After initialization:
- **Admin**: admin@centime.com / Admin123!
- **Tester**: tester@centime.com / Tester123!

### Get Access Token

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@centime.com", "password": "Admin123!"}'
```

### Use Token in Requests

```bash
curl -X GET "http://localhost:8000/api/test-cases" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Configuration

Key environment variables in `.env`:

### Database
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_management
```

### Security
```bash
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### JIRA Integration
```bash
JIRA_SERVER=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token
```

### File Storage (Confluence)
```bash
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your-api-token
CONFLUENCE_SPACE_KEY=YourSpace
CONFLUENCE_PAGE_ID=123456789
FILE_STORAGE_BACKEND=confluence
```

### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@company.com
```

## Development

### Running in Development Mode

```bash
./start_backend.sh
# or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# With coverage
pytest --cov=app tests/
```

### Code Quality

```bash
# Linting
flake8 app/

# Type checking
mypy app/

# Formatting
black app/
```

## Production Deployment

### Environment Variables

Set production values:
```bash
export DATABASE_URL="postgresql://user:pass@production-host:5432/dbname"
export SECRET_KEY="strong-random-secret-key"
export ALLOWED_ORIGINS="https://your-domain.com"
```

### Run with Gunicorn

```bash
pip install gunicorn uvicorn[standard]

gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
brew services list  # macOS
systemctl status postgresql  # Linux

# Test connection
psql -U postgres -c "SELECT version();"

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Migration Issues

```bash
# Check current version
alembic current

# View history
alembic history

# Force to specific version (use with caution)
alembic stamp head
```

### Import Errors

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

## Additional Documentation

- [PostgreSQL Setup Guide](../docs/POSTGRESQL_SETUP.md)
- [Alembic Migrations Guide](alembic/README.md)
- [JIRA Integration](../docs/JIRA_INTEGRATION_SETUP.md)
- [API Documentation](../docs/API_DOCUMENTATION.md)

## Support

For issues or questions:
1. Check the documentation in `/docs`
2. Review existing issues
3. Create a new issue with details
