#!/usr/bin/env python3
"""Seed script — creates the initial SUPER_ADMIN user.

Usage:
    python -m scripts.seed_super_admin

The email and password are read from environment variables
SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD (or .env file via config).
"""

import sys
from pathlib import Path

# Ensure the project root is on sys.path so `app` is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from argon2 import PasswordHasher

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User, UserRole, UserStatus

ph = PasswordHasher()


def seed_super_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.SEED_SUPER_ADMIN_EMAIL.lower()).first()
        if existing:
            print(f"✔ Super-admin already exists: {existing.email}")
            return

        user = User(
            email=settings.SEED_SUPER_ADMIN_EMAIL.lower(),
            password_hash=ph.hash(settings.SEED_SUPER_ADMIN_PASSWORD),
            role=UserRole.SUPER_ADMIN.value,
            status=UserStatus.ACTIVE.value,
            must_change_password=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✔ Super-admin created: {user.email}  (id={user.id})")
        print("  ⚠ must_change_password is set — change the password on first login.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_super_admin()

