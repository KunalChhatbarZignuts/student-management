from unittest.mock import MagicMock, patch

import pytest

from app.core.email import (
    ConsoleEmailBackend,
    SMTPEmailBackend,
    get_email_backend,
    send_invite_email,
    send_password_reset_email,
)


def test_smtp_backend_initialization_defaults():
    backend = SMTPEmailBackend(
        smtp_host="sandbox.smtp.mailtrap.io",
        smtp_port=2525,
        smtp_user="test_mailtrap_user",
        smtp_password="test_mailtrap_password",
        from_email="noreply@school.local",
        from_name="School SMS",
        use_tls=True,
        use_ssl=False,
    )
    assert backend.smtp_host == "sandbox.smtp.mailtrap.io"
    assert backend.smtp_port == 2525
    assert backend.smtp_user == "test_mailtrap_user"
    assert backend.smtp_password == "test_mailtrap_password"
    assert backend.from_email == "noreply@school.local"
    assert backend.use_tls is True
    assert backend.use_ssl is False


def test_smtp_send_email_success_with_mailtrap_flow():
    backend = SMTPEmailBackend(
        smtp_host="sandbox.smtp.mailtrap.io",
        smtp_port=2525,
        smtp_user="test_mailtrap_user",
        smtp_password="test_mailtrap_password",
        from_email="noreply@school.local",
        from_name="School SMS",
        use_tls=True,
        use_ssl=False,
    )

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = MagicMock()
        mock_server.has_extn.return_value = True
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        backend.send_email(
            to_email="student@example.com",
            subject="Welcome Invitation",
            text_body="Please click the link to activate.",
            html_body="<p>Please click the link to activate.</p>",
        )

        # 1. Connect to Mailtrap SMTP
        mock_smtp_cls.assert_called_once_with("sandbox.smtp.mailtrap.io", 2525, timeout=10)

        # 2. STARTTLS enabled
        mock_server.starttls.assert_called_once()

        # 3. Authenticate with credentials
        mock_server.login.assert_called_once_with("test_mailtrap_user", "test_mailtrap_password")

        # 4. Message sent
        mock_server.send_message.assert_called_once()
        sent_msg = mock_server.send_message.call_args[0][0]
        assert sent_msg["To"] == "student@example.com"
        assert sent_msg["Subject"] == "Welcome Invitation"
        assert "School SMS <noreply@school.local>" in sent_msg["From"]


def test_smtp_send_email_skips_starttls_when_not_supported():
    """Verify that if server does not advertise STARTTLS (e.g. Mailtrap port 2525), it authenticates directly."""
    backend = SMTPEmailBackend(
        smtp_host="sandbox.smtp.mailtrap.io",
        smtp_port=2525,
        smtp_user="test_mailtrap_user",
        smtp_password="test_mailtrap_password",
        use_tls=True,
    )

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = MagicMock()
        mock_server.has_extn.return_value = False
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        backend.send_email(
            to_email="student@example.com",
            subject="Welcome Invitation",
            text_body="Please click the link.",
        )

        # starttls should NOT be called
        mock_server.starttls.assert_not_called()
        # login should still be called directly
        mock_server.login.assert_called_once_with("test_mailtrap_user", "test_mailtrap_password")
        mock_server.send_message.assert_called_once()


def test_smtp_send_email_ssl_connection():
    backend = SMTPEmailBackend(
        smtp_host="live.smtp.mailtrap.io",
        smtp_port=465,
        smtp_user="live_user",
        smtp_password="live_password",
        from_email="noreply@school.local",
        use_tls=False,
        use_ssl=True,
    )

    with patch("smtplib.SMTP_SSL") as mock_smtp_ssl_cls:
        mock_server = MagicMock()
        mock_smtp_ssl_cls.return_value.__enter__.return_value = mock_server

        backend.send_email(
            to_email="parent@example.com",
            subject="Fee Receipt",
            text_body="Receipt details inside.",
        )

        mock_smtp_ssl_cls.assert_called_once_with("live.smtp.mailtrap.io", 465, timeout=10)
        mock_server.login.assert_called_once_with("live_user", "live_password")
        mock_server.send_message.assert_called_once()


def test_smtp_send_email_raises_on_connection_error():
    backend = SMTPEmailBackend(
        smtp_host="sandbox.smtp.mailtrap.io",
        smtp_port=2525,
    )

    with patch("smtplib.SMTP", side_effect=ConnectionRefusedError("Connection refused")):
        with pytest.raises(ConnectionRefusedError):
            backend.send_email(
                to_email="teacher@example.com",
                subject="Notice",
                text_body="Meeting today.",
            )


def test_send_invite_email_integration():
    with patch("app.core.email.get_email_backend") as mock_get_backend:
        mock_backend = MagicMock()
        mock_get_backend.return_value = mock_backend

        send_invite_email("new_teacher@school.edu", "sample-invite-token-12345")

        mock_backend.send_email.assert_called_once()
        call_kwargs = mock_backend.send_email.call_args.kwargs
        assert call_kwargs["to_email"] == "new_teacher@school.edu"
        assert "sample-invite-token-12345" in call_kwargs["text_body"]
        assert "<!DOCTYPE html>" in call_kwargs["html_body"]
        assert "Activate Account" in call_kwargs["html_body"]


def test_send_password_reset_email_integration():
    with patch("app.core.email.get_email_backend") as mock_get_backend:
        mock_backend = MagicMock()
        mock_get_backend.return_value = mock_backend

        send_password_reset_email("user@school.edu", "sample-reset-token-67890")

        mock_backend.send_email.assert_called_once()
        call_kwargs = mock_backend.send_email.call_args.kwargs
        assert call_kwargs["to_email"] == "user@school.edu"
        assert "sample-reset-token-67890" in call_kwargs["text_body"]
        assert "<!DOCTYPE html>" in call_kwargs["html_body"]
        assert "Reset Password" in call_kwargs["html_body"]


def test_send_password_reset_email_graceful_on_error():
    """Verify that an SMTP failure does not raise an unhandled exception."""
    with patch("app.core.email.get_email_backend") as mock_get_backend:
        mock_backend = MagicMock()
        mock_backend.send_email.side_effect = Exception("SMTP Connection Failed")
        mock_get_backend.return_value = mock_backend

        # Should not raise exception
        send_password_reset_email("user@school.edu", "sample-reset-token-failed")


def test_forgot_password_endpoint_triggers_email():
    """Verify that POST /api/v1/auth/forgot-password enqueues send_password_reset_email in BackgroundTasks."""
    from fastapi.testclient import TestClient
    from app.main import app as fastapi_app
    from app.core.deps import get_db
    from app.models.user import User, UserStatus
    import uuid

    mock_user = User(
        id=uuid.uuid4(),
        email="target_user@school.edu",
        password_hash="argon2hash",
        role="teacher",
        status=UserStatus.ACTIVE.value,
    )

    mock_session = MagicMock()
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = mock_user
    mock_session.execute.return_value = mock_execute

    fastapi_app.dependency_overrides[get_db] = lambda: mock_session
    client = TestClient(fastapi_app)

    try:
        with patch("app.api.v1.auth.send_password_reset_email") as mock_send_email:
            response = client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "target_user@school.edu"},
            )
            assert response.status_code == 200
            assert "If your email is registered" in response.json()["message"]
            # BackgroundTasks executes before the TestClient returns
            mock_send_email.assert_called_once()
            assert mock_send_email.call_args[0][0] == "target_user@school.edu"
    finally:
        fastapi_app.dependency_overrides.clear()
