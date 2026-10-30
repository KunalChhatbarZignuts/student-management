#!/usr/bin/env python3
"""
Helper script to test connection to local PostgreSQL using project configuration.
"""
import os
import sys
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).resolve().parents[4]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from sqlalchemy import text

try:
    from database import engine
    from config import settings
except ImportError as e:
    print(f"Error importing database configuration: {e}")
    sys.exit(1)


def check_connection():
    print(f"Checking connection to: {settings.DATABASE_URL.split('@')[-1]}...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).scalar()
            print("PostgreSQL connection successful!")
            print(f"Server version: {result}")
            return 0
    except Exception as exc:
        print("Failed to connect to local PostgreSQL.")
        print(f"Details: {exc}")
        print("\nTroubleshooting tips:")
        print("1. Ensure PostgreSQL is running locally (e.g., `brew services list` or `pg_isready`).")
        print("2. Check credentials in `.env` (user, password, port, database name).")
        print("3. Ensure the target database exists (e.g., `createdb student_management_db`).")
        return 1


if __name__ == "__main__":
    sys.exit(check_connection())
