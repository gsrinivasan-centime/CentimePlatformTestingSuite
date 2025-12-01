import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings
from app.core.security import create_access_token
from datetime import timedelta

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str) -> bool:
        """
        Send email using Gmail SMTP
        Returns True if successful, False otherwise
        """
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            print("Warning: Email configuration not set. Skipping email send.")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USER}>"
            message["To"] = to_email
            
            # Add HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Connect to Gmail SMTP server
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()  # Secure the connection
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)
            
            print(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_verification_email(email: str, frontend_url: str = None, is_admin_created: bool = False) -> bool:
        """
        Send email verification link to user
        Args:
            email: User's email address
            frontend_url: Frontend URL for verification link (defaults to settings.FRONTEND_URL)
            is_admin_created: True if user was created by admin, False if self-registered
        """
        # Use configured frontend URL if not provided
        if frontend_url is None:
            frontend_url = settings.FRONTEND_URL
        
        # Create verification token (valid for 24 hours)
        verification_token = create_access_token(
            data={"sub": email, "type": "email_verification"},
            expires_delta=timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
        )
        
        # Create verification link
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        # Different message based on how account was created
        welcome_message = "Your account has been created by an administrator." if is_admin_created else "Thank you for signing up."
        action_message = "Please verify your email address to activate your account and login." if is_admin_created else "Please verify your email address to complete your registration."
        
        # Email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #1976d2;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 30px;
                    border: 1px solid #ddd;
                    border-top: none;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #1976d2;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Email Verification</h1>
                </div>
                <div class="content">
                    <h2>Welcome to Centime QA Portal!</h2>
                    <p>{welcome_message} {action_message}</p>
                    <p>Click the button below to verify your email:</p>
                    <center>
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </center>
                    <p style="margin-top: 20px; font-size: 14px; color: #666;">
                        Or copy and paste this link into your browser:<br>
                        <a href="{verification_link}">{verification_link}</a>
                    </p>
                    <p style="margin-top: 20px; font-size: 12px; color: #999;">
                        This link will expire in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.
                    </p>
                </div>
                <div class="footer">
                    <p>If you didn't request this account, you can safely ignore this email.</p>
                    <p>&copy; 2025 Centime QA Portal. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = "Verify Your Email - Centime QA Portal"
        return EmailService.send_email(email, subject, html_content)
    
    @staticmethod
    def send_password_reset_email(email: str, frontend_url: str = None) -> bool:
        """
        Send password reset email
        Args:
            email: User's email address
            frontend_url: Frontend URL for reset link (defaults to settings.FRONTEND_URL)
        """
        # Use configured frontend URL if not provided
        if frontend_url is None:
            frontend_url = settings.FRONTEND_URL
        
        # Create password reset token (valid for 1 hour)
        reset_token = create_access_token(
            data={"sub": email, "type": "password_reset"},
            expires_delta=timedelta(hours=1)
        )
        
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ 
                    background-color: #1976d2; 
                    color: white; 
                    padding: 20px; 
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{ 
                    background-color: #f9f9f9; 
                    padding: 30px; 
                    border: 1px solid #ddd;
                    border-top: none;
                }}
                .button {{ 
                    display: inline-block; 
                    padding: 12px 30px; 
                    background-color: #1976d2; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>You requested to reset your password for your Centime QA Portal account.</p>
                    <p>Click the button below to reset your password:</p>
                    <center>
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </center>
                    <p style="margin-top: 20px; font-size: 14px; color: #666;">
                        Or copy and paste this link into your browser:<br>
                        <a href="{reset_link}">{reset_link}</a>
                    </p>
                    <p style="margin-top: 20px; font-size: 12px; color: #999;">
                        This link will expire in 1 hour.
                    </p>
                </div>
                <div class="footer">
                    <p>If you didn't request a password reset, you can safely ignore this email.</p>
                    <p>&copy; 2025 Centime QA Portal. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = "Password Reset Request - Centime QA Portal"
        return EmailService.send_email(email, subject, html_content)

    @staticmethod
    def send_admin_notification_new_user(user_email: str, user_name: str, super_admin_emails: list) -> None:
        """
        Send notification email to super admins when a new user verifies their email.
        This is designed to be called asynchronously (in a background task).
        
        Args:
            user_email: The newly verified user's email
            user_name: The newly verified user's full name
            super_admin_emails: List of super admin email addresses to notify
        """
        from datetime import datetime
        
        if not super_admin_emails:
            print("No super admins to notify about new user verification")
            return
        
        verified_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ 
                    background-color: #4CAF50; 
                    color: white; 
                    padding: 20px; 
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{ 
                    background-color: #f9f9f9; 
                    padding: 30px; 
                    border: 1px solid #ddd;
                    border-top: none;
                }}
                .info-box {{
                    background-color: #e8f5e9;
                    border-left: 4px solid #4CAF50;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 New User Verified</h1>
                </div>
                <div class="content">
                    <h2>A new user has verified their email</h2>
                    <p>A new team member has successfully verified their email address and can now access the QA Portal.</p>
                    
                    <div class="info-box">
                        <p><strong>Name:</strong> {user_name}</p>
                        <p><strong>Email:</strong> {user_email}</p>
                        <p><strong>Verified At:</strong> {verified_at}</p>
                    </div>
                    
                    <p>You can manage users and their roles in the Admin Settings section of the QA Portal.</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from Centime QA Portal.</p>
                    <p>&copy; 2025 Centime QA Portal. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = f"🎉 New User Verified: {user_name} - Centime QA Portal"
        
        # Send to all super admins
        for admin_email in super_admin_emails:
            try:
                EmailService.send_email(admin_email, subject, html_content)
                print(f"Admin notification sent to {admin_email} about new user: {user_email}")
            except Exception as e:
                print(f"Failed to send admin notification to {admin_email}: {str(e)}")

