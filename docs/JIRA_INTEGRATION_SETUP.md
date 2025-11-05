# JIRA Integration Setup Guide

This guide will help you configure JIRA integration to automatically import story details into the Test Management System.

## Overview

The JIRA integration allows you to:
- Import story details from JIRA using a story URL or ID
- Auto-populate story fields (title, description, status, priority, assignee, sprint, epic)
- Reduce manual data entry and maintain consistency with JIRA

## Prerequisites

1. Access to a JIRA instance (Cloud or Server)
2. JIRA account with appropriate permissions
3. JIRA API token (for JIRA Cloud) or password (for JIRA Server)

---

## Step 1: Generate JIRA API Token

### For JIRA Cloud (Atlassian Cloud)

1. **Log in to your Atlassian account**
   - Go to: https://id.atlassian.com/manage-profile/security/api-tokens
   - Or navigate: Profile → Account Settings → Security → API tokens

2. **Create API Token**
   - Click **"Create API token"**
   - Enter a label (e.g., "Test Management System")
   - Click **"Create"**
   - **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

3. **Save the token securely**
   - Store it in a password manager or secure location
   - You'll need this for the `.env` configuration

### For JIRA Server/Data Center

1. **Use your JIRA password** directly
2. Or configure a **Personal Access Token** if your instance supports it

---

## Step 2: Configure Backend Environment

1. **Open the `.env` file** in the `backend/` directory:
   ```bash
   cd backend/
   nano .env
   ```

2. **Update JIRA configuration** with your credentials:
   ```properties
   # JIRA Integration
   JIRA_SERVER=https://your-company.atlassian.net
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=your-api-token-here
   ```

3. **Configuration Details**:

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `JIRA_SERVER` | Your JIRA instance URL | `https://acme.atlassian.net` |
   | `JIRA_EMAIL` | Your JIRA account email | `john.doe@acme.com` |
   | `JIRA_API_TOKEN` | API token from Step 1 | `ATATxxxxxxxxxxxxx` |

4. **Save and close** the file

---

## Step 3: Install Dependencies

Install the required Python package (if not already installed):

```bash
cd backend/
source venv/bin/activate  # Activate virtual environment
pip install -r requirements.txt
```

This will install:
- `requests` - For making HTTP API calls
- `jira` - JIRA Python library (optional, for advanced features)

---

## Step 4: Verify Configuration

### Backend Verification

1. **Start the backend server**:
   ```bash
   ./start_backend.sh
   ```

2. **Test the configuration** using curl:
   ```bash
   # Get auth token first (use your test management credentials)
   TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@centime.com","password":"Admin123!"}' \
     | jq -r '.access_token')

   # Check JIRA configuration status
   curl -X GET http://localhost:8000/api/jira-stories/jira-config-status \
     -H "Authorization: Bearer $TOKEN"
   ```

   **Expected Response**:
   ```json
   {
     "configured": true,
     "server": "https://your-company.atlassian.net",
     "message": "JIRA integration is configured"
   }
   ```

3. **Test importing a story**:
   ```bash
   curl -X POST http://localhost:8000/api/jira-stories/import-from-jira \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"story_url":"PROJ-123"}'
   ```

### Frontend Verification

1. **Open the application** in your browser: http://localhost:3000

2. **Navigate to Stories** section

3. **Click "Add Story"**

4. **Click "Import from URL"** tab

5. **Paste a JIRA story URL** or ID:
   - Full URL: `https://your-company.atlassian.net/browse/PROJ-123`
   - Short ID: `PROJ-123`

6. **Click "Import"**

7. **Verify** that the form fields are populated with JIRA data

---

## Supported URL Formats

The system recognizes various JIRA URL formats:

- ✅ `https://company.atlassian.net/browse/PROJ-123`
- ✅ `https://jira.company.com/browse/PROJ-123`
- ✅ `PROJ-123` (direct story ID)
- ✅ `https://company.atlassian.net/...?selectedIssue=PROJ-123`

---

## Troubleshooting

### "JIRA authentication failed"

**Problem**: Invalid credentials

**Solution**:
1. Verify `JIRA_EMAIL` is correct
2. Regenerate API token and update `.env`
3. Ensure no extra spaces in `.env` values
4. Restart backend server after changes

### "Story PROJ-123 not found in JIRA"

**Problem**: Story doesn't exist or you don't have access

**Solution**:
1. Verify story ID is correct
2. Check if you have permission to view the story in JIRA
3. Ensure story is not in a different project

### "JIRA integration is not configured"

**Problem**: Missing or incomplete `.env` configuration

**Solution**:
1. Verify all three variables are set in `.env`:
   - `JIRA_SERVER`
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
2. Restart backend server
3. Check for typos in variable names

### "Failed to connect to JIRA"

**Problem**: Network or server URL issue

**Solution**:
1. Verify `JIRA_SERVER` URL is correct
2. Test JIRA URL in browser
3. Check firewall/proxy settings
4. Ensure JIRA instance is accessible from your network

---

## Security Best Practices

### 🔒 Environment Variables

- **Never commit** `.env` file to version control
- `.env` is already in `.gitignore`
- Use different tokens for dev/staging/production

### 🔑 API Token Management

- **Rotate tokens** regularly (every 90 days recommended)
- **Revoke unused tokens** from Atlassian account settings
- **Use least privilege**: Create JIRA user with read-only access if possible

### 👥 Team Setup

For team environments:

1. **Each developer** should have their own API token
2. **Copy `.env.example`** to `.env` (don't share actual tokens)
3. **Document team conventions** for JIRA access

---

## Testing the Integration

### Test Checklist

- [ ] JIRA configuration status shows "configured"
- [ ] Can import story by full URL
- [ ] Can import story by story ID only
- [ ] Story title is populated correctly
- [ ] Description is imported (if exists)
- [ ] Status is mapped correctly
- [ ] Priority is imported
- [ ] Assignee name is shown
- [ ] Epic link is populated (if story has epic)
- [ ] Sprint information is imported (if in sprint)
- [ ] Can edit imported data before saving
- [ ] Error messages are clear and helpful

### Sample Test Stories

Try importing these formats:
```
1. Full URL: https://your-jira.atlassian.net/browse/TEST-1
2. Story ID: TEST-1
3. Story with Epic: TEST-2 (should populate epic_id)
4. Story in Sprint: TEST-3 (should populate sprint)
```

---

## Advanced Configuration

### Custom Field Mapping

If your JIRA instance uses custom fields for Epic or Sprint, update `backend/app/services/jira_service.py`:

```python
def _extract_epic_link(self, fields: Dict) -> str:
    epic_fields = [
        'parent',
        'epic',
        'customfield_10014',  # Default epic field
        'customfield_XXXXX',  # Add your custom field ID here
    ]
    # ... rest of the method
```

### Multiple JIRA Instances

To support multiple JIRA instances:

1. Add environment variables for each instance
2. Update API to accept instance selection
3. Modify frontend to show instance dropdown

---

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review backend logs: `backend/logs/`
3. Test API endpoints with curl/Postman
4. Verify JIRA API access in browser

---

## Next Steps

Once JIRA integration is working:

1. ✅ Create stories using URL import
2. ✅ Link test cases to stories
3. ✅ View story hierarchy in tree view
4. ✅ Add stories to releases
5. ✅ Track test execution by story

Happy Testing! 🚀
