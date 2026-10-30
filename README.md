# Student Management System — Auth & Account Management Backend

Production-grade **FastAPI** backend for a Student Management System with JWT authentication, role-based access control, TOTP 2FA for administrators, single-use token lifecycle, concurrent-safe sequential ID generation, bulk CSV import with dry-run mode, and Alembic database migrations.

---

## Tech Stack

| Layer             | Technology                                               |
| ----------------- | -------------------------------------------------------- |
| **Framework**     | FastAPI 0.162, Uvicorn (ASGI)                            |
| **Language**      | Python 3.12+ (fully typed)                               |
| **Database**      | PostgreSQL (local install, host=localhost, port=5432)    |
| **ORM**           | SQLAlchemy 2.0 (typed `Mapped`, `mapped_column` style)   |
| **Migrations**    | Alembic                                                  |
| **Validation**    | Pydantic v2 + pydantic-settings                          |
| **Password Hash** | argon2-cffi (Argon2id with timing-safe dummy verify)     |
| **Tokens**        | PyJWT (short-lived access tokens, restricted JWTs)       |
| **Refresh Flow**  | httpOnly cookie, token family rotation & reuse detection |
| **2FA**           | pyotp (TOTP RFC 6238 for ADMIN & SUPER_ADMIN)            |
| **Rate Limiter**  | slowapi (IP-based brute-force defense)                   |
| **Email**         | Abstract email backend (dev console stdout, prod SMTP)   |
| **Testing**       | pytest, pytest-cov, httpx (92% total coverage, 26 tests) |

---

## Roles & Permissions Matrix

Users can **never** self-select their role. Roles are assigned exclusively by the system or authorized administrators:

| Role          | Created By           | Capabilities                                                       |
| ------------- | -------------------- | ------------------------------------------------------------------ |
| `SUPER_ADMIN` | Seed script only     | All capabilities, create admins, seed initial system state         |
| `ADMIN`       | Super Admin          | Manage users, create students/teachers/parents, bulk CSV import    |
| `TEACHER`     | Admin or Super Admin | Access assigned department classes, submit missing student tickets |
| `STUDENT`     | Admin or Super Admin | Access strictly own student record (`/students/me`)                |
| `PARENT`      | Admin or Super Admin | Access strictly linked children (`/parents/me/children`)           |

---

## Project Structure

```
student-management/
├── app/
│   ├── main.py                  # FastAPI app entrypoint, middleware, routers
│   ├── core/
│   │   ├── config.py            # Pydantic v2 BaseSettings loaded from .env
│   │   ├── security.py          # Argon2 hashing, dummy fallback, PyJWT token gen/decode
│   │   ├── deps.py              # get_current_user, require_roles, get_client_ip
│   │   ├── rate_limit.py        # slowapi Limiter instance & 429 response handler
│   │   └── email.py             # Console / SMTP email backend abstraction
│   ├── db/
│   │   ├── base.py              # DeclarativeBase, TimestampMixin
│   │   └── session.py           # Engine, SessionLocal, get_db dependency
│   ├── models/                  # SQLAlchemy 2.0 ORM models
│   │   ├── user.py              # User, UserRole, UserStatus
│   │   ├── student.py           # Student (1:1 with User, student_code)
│   │   ├── teacher.py           # Teacher (1:1 with User, employee_code)
│   │   ├── parent.py            # Parent + ParentStudentLink
│   │   ├── id_counter.py        # IdCounter for concurrency-safe row-level ID locks
│   │   ├── invite.py            # Invite token hashes (48h single-use)
│   │   ├── refresh_token.py     # RefreshToken with family_id rotation & replay detection
│   │   ├── password_reset.py    # PasswordReset token hashes (30 min single-use)
│   │   ├── audit_log.py         # AuditLog with PostgreSQL JSONB metadata
│   │   └── application.py       # Online applications (feature-flagged)
│   ├── schemas/                 # Pydantic request / response models
│   │   ├── auth.py              # Login, token, password reset, 2FA schemas
│   │   ├── user.py              # UserRead, Student/Teacher/Parent sub-profiles
│   │   ├── student.py           # StudentCreate, StudentResponse
│   │   ├── teacher.py           # TeacherCreate, TeacherResponse
│   │   ├── parent.py            # ParentCreate, ParentResponse, LinkResponse
│   │   ├── admin.py             # User listing, pagination, status responses
│   │   └── application.py       # Online application schemas
│   ├── api/v1/                  # REST API Routers
│   │   ├── auth.py              # Login, refresh, logout, accept-invite, reset, 2FA
│   │   ├── admin_students.py    # POST /admin/students (Flow A)
│   │   ├── admin_teachers.py    # POST /admin/teachers (Flow A)
│   │   ├── admin_users.py       # List, suspend, activate, deactivate, resend-invite
│   │   ├── bulk_import.py       # POST /admin/users/bulk-import (CSV dry-run & confirm)
│   │   ├── parents.py           # Parent creation, student linking, /parents/me/children
│   │   ├── teachers.py          # /teachers/me/classes, missing student tickets
│   │   ├── students.py          # /students/me (ownership check)
│   │   └── applications.py      # Public online applications & admin approval
│   ├── services/                # Business logic
│   │   ├── auth_service.py      # Multi-identifier lookup, lockout, refresh rotation
│   │   ├── audit_service.py     # Audit trail logger (DB JSONB)
│   │   ├── id_generator.py      # Concurrency-safe student/employee ID generator
│   │   └── import_service.py    # CSV validator & batch processor
│   └── tests/                   # 26 automated unit & integration tests (92% coverage)
├── alembic/                     # Migrations environment
├── scripts/
│   └── seed_super_admin.py      # Idempotent super-admin seed script
├── .env.example
├── requirements.txt
└── README.md
```

---

## Local Setup & Quickstart

### 1. Prerequisites

- Python 3.12+
- PostgreSQL installed and running locally on `localhost:5432`

### 2. Database Creation

```bash
# Create dev database
psql -U postgres -h localhost -c "CREATE DATABASE student_mgmt;"

# Create test database
psql -U postgres -h localhost -c "CREATE DATABASE student_mgmt_test;"
```

### 3. Virtual Environment & Dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Configuration

```bash
cp .env.example .env
# Adjust credentials if your local PostgreSQL password differs
```

### 5. Run Database Migrations

```bash
alembic upgrade head
```

### 6. Seed Initial Super Admin

```bash
python -m scripts.seed_super_admin
```

> Seed credentials: `admin@school.local` / `ChangeMe@1234` (`must_change_password=True`).

### 7. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## Running the Automated Test Suite

```bash
# Run all tests with code coverage report
pytest --cov=app --cov-report=term-missing app/tests/ -v
```

Current test results: **26 passed in ~3s, 92% coverage**.

---

## Key Flows & API Examples

### Flow A: Admin Creates Student / Teacher

1. Admin calls `POST /api/v1/admin/students`
   - Generates sequential ID (e.g. `2026-CS-0001`) via atomic PostgreSQL upsert.
   - Creates person record and login `User` record with `status=invited`.
   - Creates 48-hour single-use token; stores only SHA-256 hash in `invites`.
   - Outputs invite link via dev console email backend.
2. User clicks invite link and calls `POST /api/v1/auth/accept-invite`:
   - Validates password strength (min 10 chars, rejects common passwords).
   - Hashes password with Argon2id.
   - Marks invite token as used, account transitions to `status=active`.

### Flow B: Bulk CSV Import

- `POST /api/v1/admin/users/bulk-import?dry_run=true`:
  - Upload CSV file. Validates required fields, date formats, detects intra-CSV and DB duplicate emails.
  - Returns validation preview without modifying database state.
- `POST /api/v1/admin/users/bulk-import?dry_run=false`:
  - Processes valid rows, generates IDs, dispatches invites, and returns per-row status report.

### Login & Session Security

- `POST /api/v1/auth/login`: Accepts `email`, `student_code`, or `employee_code`.
- **Timing safety**: If user does not exist, runs a dummy Argon2 hash check to thwart timing-based account enumeration.
- **Brute-force lockout**: 5 failed login attempts lock account for 15 minutes; rate-limited via `slowapi`.
- **Refresh Token Rotation**: Refresh token is delivered via an `httpOnly`, `SameSite=Strict` cookie. Re-using a previously revoked refresh token triggers **token family reuse detection**, revoking all active sessions in the chain.

### TOTP 2FA (Admins)

- `POST /api/v1/auth/2fa/setup`: Generates RFC 6238 Base32 secret and QR provisioning URI.
- `POST /api/v1/auth/2fa/verify`: Verifies code with ±30s clock drift window.
- `POST /api/v1/auth/2fa/disable`: Requires code + account password.

---

## Security Review Checklist

- [x] **No Plaintext Passwords**: Argon2id hashing with salt and memory-hard params.
- [x] **No Plaintext Tokens in DB**: Invite, refresh, and password reset tokens stored strictly as SHA-256 hashes.
- [x] **Timing Attack Defense**: Precomputed `DUMMY_PASSWORD_HASH` executed on missing identifiers.
- [x] **Token Rotation & Replay Attack Defense**: Token families track rotation chain; reuse revokes family.
- [x] **Cookie Security**: `httpOnly=True`, `samesite="strict"`, `secure` configurable via environment.
- [x] **Rate Limiting**: `slowapi` applied to `/login`, `/accept-invite`, `/forgot-password`, `/reset-password`, and `/applications`.
- [x] **Enumeration Safe**: `/forgot-password` returns generic success message regardless of email existence.
- [x] **Strict Authorization**: Roles and data ownership enforced server-side via FastAPI dependencies.
- [x] **Audit Trail**: Operational and auth events written to `audit_logs` with PostgreSQL JSONB metadata.
- [x] **No Hard Deletes**: User deactivation updates status and terminates active sessions without data loss.

./venv/bin/uvicorn main:app --reload
