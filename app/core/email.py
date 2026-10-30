import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


class EmailBackend:
    """Abstract base email backend."""

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
        raise NotImplementedError


class ConsoleEmailBackend(EmailBackend):
    """Console email backend for development: prints links and details to stdout."""

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
        border = "=" * 60
        print(f"\n{border}")
        print(f"📧 [DEV EMAIL CONSOLE] To: {to_email}")
        print(f"   Subject: {subject}")
        print(f"{'-' * 60}")
        print(text_body.strip())
        print(f"{border}\n")


class SMTPEmailBackend(EmailBackend):
    """SMTP email backend for production."""

    def __init__(self) -> None:
        self.smtp_host = "localhost"
        self.smtp_port = 587

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = "noreply@school.local"
        msg["To"] = to_email

        msg.attach(MIMEText(text_body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.send_message(msg)


def get_email_backend() -> EmailBackend:
    if settings.EMAIL_BACKEND == "smtp":
        return SMTPEmailBackend()
    return ConsoleEmailBackend()


def send_invite_email(to_email: str, raw_invite_token: str) -> None:
    """Send an account setup invite link."""
    invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={raw_invite_token}"
    subject = "Welcome to Student Management System — Set up your account"
    body = f"""
Hello,

An account has been created for you in the Student Management System.
Please activate your account and choose your password by visiting the link below:

{invite_url}

This link is valid for {settings.INVITE_EXPIRE_HOURS} hours and can only be used once.

If you were not expecting this invitation, you can safely ignore this email.
"""
    get_email_backend().send_email(to_email=to_email, subject=subject, text_body=body)


def send_password_reset_email(to_email: str, raw_reset_token: str) -> None:
    """Send a password reset link."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_reset_token}"
    subject = "Student Management System — Password Reset Request"
    body = f"""
Hello,

We received a request to reset your password. You can reset your password using the link below:

{reset_url}

This link is valid for {settings.RESET_EXPIRE_MINUTES} minutes and can only be used once.

If you did not request a password reset, please ignore this email. Your account remains secure.
"""
    get_email_backend().send_email(to_email=to_email, subject=subject, text_body=body)

