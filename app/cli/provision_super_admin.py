"""Secure one-time Super Admin provisioning CLI script.

Usage:
    PYTHONPATH=. ./venv/bin/python app/cli/provision_super_admin.py

Reads SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD from environment variables or .env.
Ensures idempotency, enforces strong password rules, sets must_change_password=True,
and registers an audit log entry.
"""

import os
import sys
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv

# Ensure environment is loaded
load_dotenv()

from app.db.session import SessionLocal
import app.modules.models  # Ensure all ORM models are registered
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.audit.service import log_action
from app.core.security import hash_password, validate_password_strength


def provision_super_admin(email: str | None = None, password: str | None = None) -> User:
    email = (email or os.getenv("SUPER_ADMIN_EMAIL") or "").strip().lower()
    password = password or os.getenv("SUPER_ADMIN_PASSWORD") or ""

    if not email:
        print("[ERROR] SUPER_ADMIN_EMAIL environment variable or argument is required.", file=sys.stderr)
        sys.exit(1)

    if not password:
        print("[ERROR] SUPER_ADMIN_PASSWORD environment variable or argument is required.", file=sys.stderr)
        sys.exit(1)

    # Validate password strength
    try:
        validate_password_strength(password)
    except Exception as e:
        detail = getattr(e, "detail", str(e))
        print(f"[ERROR] Password does not meet security requirements: {detail}", file=sys.stderr)
        sys.exit(1)

    with SessionLocal() as db:
        # Check if any SUPER_ADMIN already exists
        existing_super = db.query(User).filter(User.role == UserRole.SUPER_ADMIN.value).first()
        if existing_super:
            print(f"[WARNING] A Super Admin account already exists in the system (ID: {existing_super.id}, Email: {existing_super.email}).")
            print("[INFO] No duplicate Super Admin created. Exiting safely.")
            return existing_super

        # Check if email is already used by another role
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"[ERROR] User with email '{email}' already exists with role '{existing_user.role}'.", file=sys.stderr)
            sys.exit(1)

        # Create new Super Admin
        super_admin = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=hash_password(password),
            role=UserRole.SUPER_ADMIN.value,
            status=UserStatus.ACTIVE.value,
            must_change_password=True,  # Forces password update upon initial login
            failed_login_count=0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(super_admin)
        db.flush()

        # Log system provisioning action
        log_action(
            db,
            actor_user_id=super_admin.id,
            action="super_admin_provisioned",
            entity_type="user",
            entity_id=str(super_admin.id),
            metadata={"email": email, "provision_method": "cli"},
        )
        db.commit()
        db.refresh(super_admin)

        print("[SUCCESS] Super Admin account provisioned successfully!")
        print(f"  User ID : {super_admin.id}")
        print(f"  Email   : {super_admin.email}")
        print(f"  Role    : {super_admin.role}")
        print(f"  Status  : {super_admin.status}")
        print(f"  Must Change Password: {super_admin.must_change_password}")
        return super_admin


if __name__ == "__main__":
    provision_super_admin()
