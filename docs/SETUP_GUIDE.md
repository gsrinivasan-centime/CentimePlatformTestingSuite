# Setup Guide - Centime QA Portal

Complete setup instructions for the Centime QA Portal (Quality Assurance Portal).

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Python 3.9 or higher**
- **Node.js 16 or higher** and npm
- **Git**
- **Chrome or Firefox browser** (for Selenium tests)
- **SQLite** (usually comes pre-installed)

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use any text editor
```

Update the following in `.env`:
```env
SECRET_KEY=your-super-secret-key-change-this-in-production
DATABASE_URL=sqlite:///./test_management.db
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=centime.com
```

### 5. Initialize Database

The database will be automatically created when you first run the application. The tables will be created based on the models defined.

### 6. Create Initial Admin User

Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

Then use the API to register an admin user:
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@centime.com",
    "password": "Admin123!",
    "full_name": "Admin User",
    "role": "admin"
  }'
```

### 7. Create Initial Modules

```bash
curl -X POST "http://localhost:8000/api/modules" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Account Payable", "description": "Invoice and payment processing module"}'

curl -X POST "http://localhost:8000/api/modules" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Account Receivable", "description": "Receivables and collections module"}'

curl -X POST "http://localhost:8000/api/modules" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Cash Flow Forecasting", "description": "Cash flow prediction and analysis module"}'

curl -X POST "http://localhost:8000/api/modules" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Banking Integrations", "description": "Bank account and transaction integration module"}'
```

### 8. Verify Backend is Running

Open your browser and navigate to:
- API Documentation: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc
- Health Check: http://localhost:8000/health

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd ../frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file
nano .env
```

Update the following in `.env`:
```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_APP_NAME=Centime QA Portal
```

### 4. Start Development Server

```bash
npm start
```

The application should open automatically at http://localhost:3000

## Test Suite Setup

### 1. Navigate to Test Suite Directory

```bash
cd ../test_suite
```

### 2. Create Virtual Environment (if not using backend's venv)

```bash
python3 -m venv test_venv
source test_venv/bin/activate  # On Windows: test_venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Test Environment

Create a `.env` file in test_suite directory:
```env
API_BASE_URL=http://localhost:8000
WEB_BASE_URL=http://localhost:3000
TEST_EMAIL=test.user@centime.com
TEST_PASSWORD=TestPassword123!
```

### 5. Run Tests

```bash
# Run all tests
pytest -v

# Run only UI tests
pytest -v -m ui

# Run only API tests
pytest -v -m api

# Run with HTML report
pytest -v --html=reports/report.html --self-contained-html

# Run specific test file
pytest -v ui_tests/test_login_ui.py
```

## Database Management

### View Database Contents

```bash
# Install sqlite3 if not already installed
# On macOS: brew install sqlite3

# Open database
sqlite3 backend/test_management.db

# Common SQL commands
.tables                  # List all tables
SELECT * FROM users;     # View users
SELECT * FROM test_cases;  # View test cases
.exit                    # Exit sqlite3
```

### Reset Database

To start fresh:
```bash
cd backend
rm test_management.db
# Restart the server to recreate tables
uvicorn app.main:app --reload
```

## Troubleshooting

### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'fastapi'`
```bash
# Make sure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**Issue**: `Database is locked`
```bash
# Close all connections to the database
# Restart the FastAPI server
```

### Frontend Issues

**Issue**: `npm ERR! ENOENT: no such file or directory`
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Issue**: CORS errors in browser console
- Verify backend `ALLOWED_ORIGINS` includes your frontend URL
- Restart both backend and frontend

### Test Issues

**Issue**: Selenium WebDriver not found
```bash
# The webdriver-manager should handle this automatically
# If issues persist, manually download ChromeDriver
```

**Issue**: Tests failing due to authentication
- Verify test credentials in `.env` file
- Ensure user exists in database
- Check token is not expired

## Production Deployment

### Backend Deployment

1. **Set secure environment variables**:
   - Generate strong SECRET_KEY: `openssl rand -hex 32`
   - Set production database URL
   - Configure CORS for production domains

2. **Use production server**:
   ```bash
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. **Enable HTTPS** with reverse proxy (nginx/Apache)

### Frontend Deployment

1. **Build production bundle**:
   ```bash
   npm run build
   ```

2. **Serve static files** with nginx or deploy to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront

### Security Considerations

- Change default SECRET_KEY
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement rate limiting
- Regular security updates
- Backup database regularly

## Next Steps

1. Review [USER_GUIDE.md](USER_GUIDE.md) for application usage
2. Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API details
3. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand system design
4. Start creating test cases and running tests!

## Support

For issues or questions:
- Check documentation in `/docs` directory
- Contact QA team at qa@centime.com
- Review API docs at http://localhost:8000/docs
