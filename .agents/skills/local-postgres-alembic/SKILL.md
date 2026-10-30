---
name: local-postgres-alembic
description: >-
  Use this skill when managing, troubleshooting, or connecting to local PostgreSQL,
  or when creating, applying, and rolling back Alembic database migrations.
---

# Local PostgreSQL & Alembic Operations Guide

This skill guides local PostgreSQL database management, connectivity verification, and Alembic migrations for the `student-management` project.

## Database Connection Configuration

The application uses SQLAlchemy with `psycopg` (v3). Connection details are managed through environment variables in `.env`:

```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@localhost:5432/<database_name>
```

Default local development URL:
`postgresql+psycopg://postgres:postgres@localhost:5432/student_management_db`

## Verifying Local PostgreSQL

### 1. Check Service Status (macOS)
Check if PostgreSQL is running locally:
```bash
# Check postgres service via Homebrew (if installed with brew)
brew services list | grep postgresql

# Or check socket/port readiness
pg_isready -h localhost -p 5432
```

### 2. Verify Database Connection
Use the included helper script to test Python connectivity:
```bash 
./venv/bin/python .agents/skills/local-postgres-alembic/scripts/verify_db.py
```

### 3. Create Database If Missing
If the database does not exist:
```bash
createdb -U postgres student_management_db
# Or via psql:
# psql -U postgres -c "CREATE DATABASE student_management_db;"
```

## Alembic Migration Procedures

Alembic configuration is stored in `alembic.ini` and `alembic/env.py`.

### 1. Generating a Migration
Always give a descriptive message when generating revisions:
```bash
./venv/bin/alembic revision --autogenerate -m "create <table_name> table"
```
> **Note**: Verify that newly created models are imported into `alembic/env.py` (via `import models`) so Alembic detects table changes.

### 2. Applying Migrations
Apply all pending migrations up to latest:
```bash
./venv/bin/alembic upgrade head
```

### 3. Checking Migration Status
Inspect the current applied database revision:
```bash
./venv/bin/alembic current
./venv/bin/alembic history --verbose
```

### 4. Rolling Back Migrations
Roll back the most recent migration:
```bash
./venv/bin/alembic downgrade -1
```

## Best Practices
- Never edit existing, already-applied migration files in production or shared branches; generate a new revision instead.
- Review auto-generated migration files in `alembic/versions/` before running `upgrade head` to ensure constraints and indexes match expectations.
- Always run the verification script before starting development to confirm the database engine is reachable.
