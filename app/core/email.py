import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger(__name__)


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
    """SMTP email backend supporting Mailtrap and standard SMTP relays."""

    def __init__(
        self,
        smtp_host: str | None = None,
        smtp_port: int | None = None,
        smtp_user: str | None = None,
        smtp_password: str | None = None,
        from_email: str | None = None,
        from_name: str | None = None,
        use_tls: bool | None = None,
        use_ssl: bool | None = None,
    ) -> None:
        self.smtp_host = smtp_host or settings.SMTP_HOST
        self.smtp_port = smtp_port or settings.SMTP_PORT
        self.smtp_user = smtp_user if smtp_user is not None else settings.SMTP_USER
        self.smtp_password = smtp_password if smtp_password is not None else settings.SMTP_PASSWORD
        self.from_email = from_email or settings.SMTP_FROM_EMAIL
        self.from_name = from_name or settings.SMTP_FROM_NAME
        self.use_tls = use_tls if use_tls is not None else settings.SMTP_TLS
        self.use_ssl = use_ssl if use_ssl is not None else settings.SMTP_SSL

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((self.from_name, self.from_email))
        msg["To"] = to_email

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        if html_body:
            msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10)

            with server as client:
                client.ehlo()
                if self.use_tls and not self.use_ssl and client.has_extn("starttls"):
                    client.starttls()
                    client.ehlo()
                if self.smtp_user and self.smtp_password:
                    client.login(self.smtp_user, self.smtp_password)
                client.send_message(msg)
                logger.info("Email successfully sent to %s via %s", to_email, self.smtp_host)
        except Exception as e:
            logger.error("Failed to send email to %s via SMTP (%s:%s): %s", to_email, self.smtp_host, self.smtp_port, e)
            raise


def get_email_backend() -> EmailBackend:
    if settings.EMAIL_BACKEND == "smtp":
        return SMTPEmailBackend()
    return ConsoleEmailBackend()


def send_invite_email(to_email: str, raw_invite_token: str) -> None:
    """Send an account setup invite link with HTML and plain-text fallback."""
    invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={raw_invite_token}"
    subject = "Welcome to Student Management System — Set up your account"
    text_body = f"""Hello,

An account has been created for you in the Student Management System.
Please activate your account and choose your password by visiting the link below:

{invite_url}

This link is valid for {settings.INVITE_EXPIRE_HOURS} hours and can only be used once.

If you were not expecting this invitation, you can safely ignore this email.
"""
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 24px; background-color: #f4f6f8;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <div style="background-color: #1976d2; color: #ffffff; padding: 24px; text-align: center;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 600;">{settings.SMTP_FROM_NAME}</h2>
    </div>
    <div style="padding: 32px 28px;">
      <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Welcome! Set up your account</h3>
      <p style="color: #475569; font-size: 14px;">An account has been created for you in the Student Management System. Click the button below to activate your account and set your password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{invite_url}" style="background-color: #1976d2; color: #ffffff; padding: 12px 32px; text-decoration: none; font-weight: 600; border-radius: 6px; display: inline-block; font-size: 15px;">Activate Account</a>
      </div>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">This link is valid for <strong>{settings.INVITE_EXPIRE_HOURS} hours</strong> and can only be used once.</p>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 4px;">If the button above does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 12px; word-break: break-all; color: #1976d2;"><a href="{invite_url}" style="color: #1976d2;">{invite_url}</a></p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">If you were not expecting this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
"""
    try:
        get_email_backend().send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
    except Exception as e:
        logger.error("Failed to send account setup invite email to %s: %s", to_email, e)
        logger.warning("[EMAIL FALLBACK] Account setup invite link for %s: %s", to_email, invite_url)


def send_password_reset_email(to_email: str, raw_reset_token: str) -> None:
    """Send a password reset link with responsive HTML and plain-text fallback."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_reset_token}"
    subject = "Student Management System — Password Reset Request"
    text_body = f"""Hello,

We received a request to reset your password. You can reset your password using the link below:

{reset_url}

This link is valid for {settings.RESET_EXPIRE_MINUTES} minutes and can only be used once.

If you did not request a password reset, please ignore this email. Your account remains secure.
"""
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 24px; background-color: #f4f6f8;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <div style="background-color: #1976d2; color: #ffffff; padding: 24px; text-align: center;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 600;">{settings.SMTP_FROM_NAME}</h2>
    </div>
    <div style="padding: 32px 28px;">
      <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Password Reset Request</h3>
      <p style="color: #475569; font-size: 14px;">We received a request to reset your password. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{reset_url}" style="background-color: #1976d2; color: #ffffff; padding: 12px 32px; text-decoration: none; font-weight: 600; border-radius: 6px; display: inline-block; font-size: 15px;">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">This link is valid for <strong>{settings.RESET_EXPIRE_MINUTES} minutes</strong> and can only be used once.</p>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 4px;">If the button above does not work, copy and paste this link into your browser:</p>
      <p style="font-size: 12px; word-break: break-all; color: #1976d2;"><a href="{reset_url}" style="color: #1976d2;">{reset_url}</a></p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
    </div>
  </div>
</body>
</html>
"""
    try:
        get_email_backend().send_email(to_email=to_email, subject=subject, text_body=text_body, html_body=html_body)
    except Exception as e:
        logger.error("Failed to send password reset email to %s: %s", to_email, e)
        logger.warning("[EMAIL FALLBACK] Password reset link for %s: %s", to_email, reset_url)

