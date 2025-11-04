# Troubleshooting: UI Not Showing Recent Updates

## Issue
The UI is not displaying the recent automation status updates after implementation.

## Root Causes Identified

### 1. Backend Server Status
- **Issue**: Backend was not running on port 8000
- **Resolution**: Restarted backend server
- **Verification**: Backend now running at http://localhost:8000
- **Health Check**: `curl http://localhost:8000/health` returns `{"status":"healthy"}`

### 2. Frontend Port Configuration
- **Current State**: Frontend running on port 3000 (not 3001)
- **Access**: http://localhost:3000

### 3. Browser Cache
- **Issue**: Browser may be caching old JavaScript files
- **Impact**: New Status column and automation_status field not visible

## Resolution Steps

### Step 1: Verify Backend is Running
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}

# Check if port 8000 is in use:
lsof -ti:8000
# Should return a process ID
```

### Step 2: Verify Frontend is Running
```bash
# Check if port 3000 is in use:
lsof -ti:3000
# Should return a process ID

# Frontend should be accessible at:
# http://localhost:3000
```

### Step 3: Clear Browser Cache
**Option A: Hard Refresh (Recommended)**
- **Chrome/Edge**: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)
- **Firefox**: `Cmd + Shift + R` (Mac) or `Ctrl + F5` (Windows/Linux)
- **Safari**: `Cmd + Option + E` (clear cache), then `Cmd + R` (reload)

**Option B: Clear Cache via Browser DevTools**
1. Open DevTools: `F12` or `Cmd/Ctrl + Shift + I`
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Option C: Incognito/Private Mode**
1. Open a new incognito/private window
2. Navigate to http://localhost:3000
3. This ensures no cache is used

### Step 4: Verify React Dev Server Auto-Reload
The React development server should automatically reload when files change. Check the terminal where `npm start` is running for:
```
Compiling...
Compiled successfully!
```

If you don't see this after saving files:
```bash
# Restart the frontend development server
cd frontend
npm start
```

### Step 5: Check for Console Errors
1. Open browser DevTools (`F12`)
2. Go to Console tab
3. Look for any red error messages
4. Common errors:
   - API connection errors (check backend is running)
   - JavaScript errors (check for typos in code)
   - Network errors (check CORS configuration)

### Step 6: Verify API Response
1. Open browser DevTools (`F12`)
2. Go to Network tab
3. Refresh the page
4. Find the API call to `/api/test-cases`
5. Click on it and check the Response
6. Verify the response includes `automation_status` field:
```json
{
  "id": 1,
  "test_id": "TC-001",
  "title": "Test Case Title",
  "test_type": "automated",
  "automation_status": "working",  // <-- Should be present
  ...
}
```

## Current System Status

### Backend
- ✅ Running on port 8000
- ✅ Health check passing
- ✅ Database migration completed
- ✅ Model updated with automation_status field
- ✅ API schemas updated

### Frontend
- ✅ Running on port 3000
- ✅ Code changes saved
- ✅ No compilation errors
- ⚠️ Browser cache may need clearing

## Quick Fix Commands

### Restart Everything
```bash
# Stop all processes
pkill -f "uvicorn app.main:app"
pkill -f "react-scripts start"

# Start backend
cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

# Start frontend
cd /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite/frontend
npm start
```

### Test Backend API
```bash
# Get all test cases with automation status
curl -s http://localhost:8000/api/test-cases | jq '.[] | {test_id, test_type, automation_status}'
```

### Check Frontend Build
```bash
cd frontend

# Check for any dependency issues
npm install

# Start with verbose logging
npm start --verbose
```

## Expected Behavior After Fix

### Test Cases Table Should Show:
1. **New "Status" column header** between "Type" and "Created" columns
2. **For automated tests**: 
   - Green chip with "working" label, OR
   - Red chip with "broken" label
3. **For manual tests**: 
   - Gray dash "-"

### Create/Edit Test Form Should Show:
1. When "Test Type" is "Automated":
   - "Automation Status" dropdown appears
   - Options: Working / Broken
   - Default: Working
2. When "Test Type" is "Manual":
   - "Automation Status" dropdown is hidden

### View Test Dialog Should Show:
1. For automated tests:
   - "Automation Status" section with colored chip
2. For manual tests:
   - No "Automation Status" section

## Still Not Working?

### Check File Changes Were Saved
```bash
# Verify the Status column was added to TestCases.js
grep -n "Status" /Users/srinivasang/Documents/GitHub/CentimePlatformTestingSuite/frontend/src/pages/TestCases.js | head -5

# Should show multiple matches including the header cell
```

### Check Database Schema
```bash
cd backend
source venv/bin/activate
python -c "from app.core.database import SessionLocal; from app.models.models import TestCase; db = SessionLocal(); tc = db.query(TestCase).first(); print('automation_status' in dir(tc))"

# Should print: True
```

### Check API Endpoint
```bash
# Test creating a new automated test case
curl -X POST http://localhost:8000/api/test-cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "test_id": "TC-TEST-001",
    "title": "Test Automation Status",
    "test_type": "automated",
    "automation_status": "working",
    "module_id": 1
  }'
```

### React DevTools
1. Install React DevTools browser extension
2. Open the extension
3. Inspect the TestCases component
4. Check the `testCases` state
5. Verify objects have `automation_status` property

## Prevention

To avoid similar issues in the future:

1. **Always restart backend** after model changes
2. **Clear browser cache** when testing UI changes
3. **Check DevTools console** for errors
4. **Verify API responses** in Network tab
5. **Use hard refresh** (`Cmd+Shift+R`) when testing

## Contact Points

If the issue persists:

1. Check backend logs: `/tmp/backend.log`
2. Check frontend console in browser DevTools
3. Verify all files were saved correctly
4. Ensure no merge conflicts in modified files
5. Check that migration ran successfully:
   ```bash
   cd backend
   sqlite3 test_management.db "PRAGMA table_info(test_cases);" | grep automation_status
   ```

## Summary

**Most Common Cause**: Browser cache holding old JavaScript files

**Quick Fix**: Hard refresh the browser with `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)

**Verification**:
- Backend: `curl http://localhost:8000/health`
- Frontend: Open http://localhost:3000 in incognito mode
- Database: Check migration ran successfully
- API: Check response includes `automation_status` field
