# Quick Start Guide

This guide will help you get the Centime QA Portal up and running in minutes.

## Prerequisites Check

```bash
# Check Python version (need 3.9+)
python3 --version

# Check Node.js version (need 16+)
node --version

# Check npm version
npm --version
```

## Quick Setup (5 minutes)

### Step 1: Clone and Navigate
```bash
cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite
```

### Step 2: Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env and set a secure SECRET_KEY

# Start backend server
uvicorn app.main:app --reload
```

The backend will be running at: http://localhost:8000
API Docs available at: http://localhost:8000/docs

### Step 3: Create Initial Data

Open a new terminal and run:

```bash
cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite/backend
source venv/bin/activate

python3 << 'EOF'
import requests

BASE_URL = "http://localhost:8000"

# Register admin user
admin_data = {
    "email": "admin@centime.com",
    "password": "Admin123!",
    "full_name": "Admin User",
    "role": "admin"
}
response = requests.post(f"{BASE_URL}/api/auth/register", json=admin_data)
print(f"Admin created: {response.status_code}")

# Login to get token
login_data = {"username": "admin@centime.com", "password": "Admin123!"}
response = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create modules
modules = [
    {"name": "Account Payable", "description": "Invoice and payment processing"},
    {"name": "Account Receivable", "description": "Receivables and collections"},
    {"name": "Cash Flow Forecasting", "description": "Cash flow prediction"},
    {"name": "Banking Integrations", "description": "Bank integrations"}
]

for module in modules:
    response = requests.post(f"{BASE_URL}/api/modules", json=module, headers=headers)
    print(f"Module '{module['name']}' created: {response.status_code}")

print("\n✅ Initial data created successfully!")
print(f"Login at http://localhost:8000/docs")
print(f"Email: admin@centime.com")
print(f"Password: Admin123!")
EOF
```

### Step 4: Run Sample Tests

```bash
cd ../test_suite

# Create virtual environment (or use backend's)
python3 -m venv test_venv
source test_venv/bin/activate  # On Windows: test_venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest -v --tb=short

# Generate HTML report
pytest -v --html=reports/report.html --self-contained-html
```

## What's Included

### Backend (FastAPI)
- ✅ User authentication with JWT
- ✅ Test case management API
- ✅ Module and release tracking
- ✅ Test execution endpoints
- ✅ PDF report generation
- ✅ Interactive API docs at /docs

### Test Suite (pytest)
- ✅ Sample UI test (Selenium) - `test_login_ui.py`
- ✅ Sample API test (requests) - `test_account_payable_api.py`
- ✅ HTML test reports
- ✅ Organized by modules

### Documentation
- ✅ Setup guide
- ✅ Implementation plan
- ✅ Project README

## Verify Installation

1. **Backend Health Check**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"healthy"}`

2. **API Documentation**
   Open browser: http://localhost:8000/docs

3. **Run Sample Test**
   ```bash
   cd test_suite
   pytest -v api_tests/test_account_payable_api.py::TestAccountPayableAPI::test_unauthorized_access
   ```

## Common Commands

```bash
# Start backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Run all tests
cd test_suite && source test_venv/bin/activate && pytest -v

# Run only UI tests
pytest -v -m ui

# Run only API tests
pytest -v -m api

# Generate test report
pytest -v --html=reports/report.html --self-contained-html
```

## Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Create Test Cases**: Use the API to add more test cases
3. **Create a Release**: Track test execution across releases
4. **Generate Reports**: Get PDF reports for releases
5. **Build Frontend**: Follow IMPLEMENTATION_PLAN.md Phase 3

## Need Help?

- 📖 Read [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed setup
- 📋 Check [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for full roadmap
- 🐛 Check troubleshooting section in SETUP_GUIDE.md
- 📧 Contact: qa@centime.com

## Key Features to Try

1. **Register Users**: POST /api/auth/register (only @centime.com emails)
2. **Create Test Cases**: POST /api/test-cases
3. **Execute Tests**: POST /api/executions/execute/{test_case_id}
4. **Generate Reports**: GET /api/reports/pdf/{release_id}

Enjoy using the Centime QA Portal! 🚀
