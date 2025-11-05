# Email Verification Setup Guide

## Overview
This system uses **Gmail SMTP** for sending verification emails - completely FREE (up to 500 emails/day).

## Setup Steps

### 1. Create Gmail App Password

Since you're using 2-factor authentication with Gmail (which you should be), you need to create an "App Password":

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** from the left menu
3. Under "How you sign in to Google," select **2-Step Verification** (set this up if you haven't)
4. Scroll down and select **App passwords**
5. Select app: **Mail**
6. Select device: **Other (Custom name)** - enter "Centime Test Management"
7. Click **Generate**
8. Copy the 16-character password (you'll use this in step 2)

### 2. Configure Environment Variables

Create or update `.env` file in the `backend/` directory:

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=your-16-char-app-password-here
SMTP_FROM_EMAIL=your.email@gmail.com
SMTP_FROM_NAME=Centime Test Management
EMAIL_VERIFICATION_EXPIRE_HOURS=24
```

**Replace:**
- `your.email@gmail.com` with your actual Gmail address
- `your-16-char-app-password-here` with the app password from step 1

### 3. Run Database Migration

```bash
cd backend
python3 migrate_add_email_verification.py
```

This adds the email verification fields to the users table.

### 4. Restart Backend Server

```bash
./start_backend.sh
```

## How It Works

### Registration Flow

1. **User Signs Up**
   - POST `/api/auth/register` with email and password
   - User account created with `is_email_verified=False`
   - Verification email sent automatically

2. **Email Sent**
   - User receives email with verification link
   - Link contains JWT token valid for 24 hours
   - Example: `http://localhost:3000/verify-email?token=...`

3. **User Clicks Link**
   - Frontend calls POST `/api/auth/verify-email` with token
   - Backend verifies token and marks email as verified
   - User can now login

4. **Login**
   - User attempts to login
   - Backend checks if email is verified
   - If not verified: Returns 403 error with message
   - If verified: Returns access token

### API Endpoints

#### Register (Modified)
```
POST /api/auth/register
Body: { "email": "user@centime.com", "password": "...", "full_name": "..." }
Response: User object (is_email_verified=false)
+ Sends verification email
```

#### Verify Email (New)
```
POST /api/auth/verify-email?token=<jwt-token>
Response: { "message": "Email verified successfully" }
```

#### Resend Verification (New)
```
POST /api/auth/resend-verification?email=user@centime.com
Response: { "message": "Verification email sent successfully" }
```

#### Login (Modified)
```
POST /api/auth/login
Body: { "username": "user@centime.com", "password": "..." }
Response: 
  - Success: { "access_token": "...", "token_type": "bearer" }
  - Email not verified: 403 error
```

## Frontend Integration

### 1. Update Register Page

After successful registration, show message:
```
"Account created successfully! Please check your email for verification link."
```

### 2. Create Email Verification Page

Create `/verify-email` route that:
- Reads `token` from URL query params
- Calls `POST /api/auth/verify-email` with token
- Shows success/error message
- Redirects to login page

Example React component:
```jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    axios.post(`/api/auth/verify-email?token=${token}`)
      .then(response => {
        setStatus('success');
        setMessage(response.data.message);
        setTimeout(() => navigate('/login'), 3000);
      })
      .catch(error => {
        setStatus('error');
        setMessage(error.response?.data?.detail || 'Verification failed');
      });
  }, [searchParams, navigate]);

  return (
    <div>
      {status === 'verifying' && <p>Verifying your email...</p>}
      {status === 'success' && <p>{message}</p>}
      {status === 'error' && <p>Error: {message}</p>}
    </div>
  );
}
```

### 3. Update Login Error Handling

When login fails with 403 error (email not verified), show:
```
"Please verify your email before logging in. Check your inbox for verification link."
```

Add "Resend Verification Email" button that calls `/api/auth/resend-verification`.

## Testing

### Test Registration & Verification

1. Register new user with your email
2. Check your email inbox (also check spam folder)
3. Click verification link
4. Try to login before and after verification

### Verify Existing Users (Optional)

If you want to mark existing users as verified:

```sql
sqlite3 backend/test_management.db
UPDATE users SET is_email_verified = 1, email_verified_at = datetime('now');
.quit
```

## Alternative Email Providers (Free Options)

If you prefer not to use Gmail:

### SendGrid (100 emails/day free)
```env
# Install: pip install sendgrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<your-sendgrid-api-key>
```

### Brevo/Sendinblue (300 emails/day free)
```env
SMTP_HOST=smtp-relay.sendinblue.com
SMTP_PORT=587
SMTP_USER=<your-sendinblue-email>
SMTP_PASSWORD=<your-sendinblue-smtp-key>
```

## Troubleshooting

### Email not sending
- Check SMTP credentials in `.env`
- Verify Gmail app password is correct
- Check backend logs for error messages
- Test with: `python -c "from app.services.email_service import EmailService; print(EmailService.send_verification_email('test@example.com'))"`

### Gmail "Less secure app" error
- You MUST use App Password, not regular password
- Ensure 2-Step Verification is enabled on Google account

### Email goes to spam
- Add SPF/DKIM records (requires custom domain)
- Or use professional service like SendGrid/Mailgun
- For now, ask users to check spam folder

## Production Considerations

For production deployment:

1. **Use Environment Variables**: Never commit SMTP credentials to git
2. **Use Professional Service**: Consider SendGrid, AWS SES, or Mailgun for better deliverability
3. **Custom Domain**: Use your own domain for better email reputation
4. **Rate Limiting**: Add rate limiting to prevent abuse
5. **Email Templates**: Consider using more sophisticated HTML templates
6. **Monitoring**: Set up monitoring for email delivery failures

## Cost Summary

- **Gmail SMTP**: FREE (500 emails/day)
- **SendGrid Free**: FREE (100 emails/day forever)
- **Brevo Free**: FREE (300 emails/day forever)

For a test management system, the free tiers are more than sufficient!
