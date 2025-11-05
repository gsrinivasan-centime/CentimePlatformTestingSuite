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
    def send_verification_email(email: str, frontend_url: str = "http://localhost:3000") -> bool:
        """
        Send email verification link to user
        """
        # Create verification token (valid for 24 hours)
        verification_token = create_access_token(
            data={"sub": email, "type": "email_verification"},
            expires_delta=timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
        )
        
        # Create verification link
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
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
                    <h2>Welcome to Centime Test Management!</h2>
                    <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
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
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                    <p>&copy; 2025 Centime Test Management. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = "Verify Your Email - Centime Test Management"
        return EmailService.send_email(email, subject, html_content)
    
    @staticmethod
    def send_password_reset_email(email: str, reset_token: str, frontend_url: str = "http://localhost:3000") -> bool:
        """
        Send password reset email (for future use)
        """
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }}
                .button {{ display: inline-block; padding: 12px 30px; background-color: #1976d2; 
                          color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>You requested to reset your password. Click the button below:</p>
                    <center>
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </center>
                    <p style="margin-top: 20px; font-size: 12px; color: #999;">
                        This link will expire in 1 hour.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = "Password Reset Request - Centime Test Management"
        return EmailService.send_email(email, subject, html_content)
