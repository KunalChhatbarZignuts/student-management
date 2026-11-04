# Student Management System — Platform Architecture & Backend API

Production-grade **FastAPI** backend for a comprehensive Student Management System featuring JWT authentication, role-based access control (RBAC), TOTP 2FA, academic calendar management, daily attendance roll-call, academic structure (grades/classes/sections), multi-step student admissions, parent-child linking, student fee invoicing, audit logging, and durable workflow automations.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | FastAPI 0.162+, Uvicorn (ASGI) |
| **Language** | Python 3.12+ (fully typed) |
| **Database** | PostgreSQL (local or cloud, port=5432) |
| **ORM** | SQLAlchemy 2.0 (typed `Mapped`, `mapped_column` style) |
| **Migrations** | Alembic |
| **Validation** | Pydantic v2 + pydantic-settings |
| **Password Hash** | argon2-cffi (Argon2id with timing-safe dummy verification) |
| **Tokens** | PyJWT (short-lived access tokens, restricted JWTs) |
| **Refresh Flow** | httpOnly cookie, token family rotation & reuse detection |
| **2FA** | pyotp (TOTP RFC 6238 for ADMIN & SUPER_ADMIN) |
| **Rate Limiter** | slowapi (IP-based brute-force defense) |
| **Workflows** | Vercel Workflow SDK integration for multi-step durable background tasks |
| **Email** | Abstract email backend (dev console stdout, prod SMTP) |
| **Testing** | pytest, pytest-cov, httpx (comprehensive test suites) |

---

## Roles & Permissions Matrix

Users can **never** self-select their role. Roles are assigned strictly by the system or authorized administrators:

| Role | Created By | Capabilities |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Seed script only | System-wide configuration, create admins, seed data, view full audit logs |
| `ADMIN` | Super Admin | Manage users, classes, sections, calendar, student admissions, fees, attendance overview |
| `TEACHER` | Admin / Super Admin | Access assigned classes & sections, conduct daily roll-call attendance, report missing students |
| `STUDENT` | Admin / Admissions | Access own learner record (`/students/me`), personal attendance stats, marks, fee invoices |
| `PARENT` | Admin / Link Flow | Access linked children (`/parents/me/children`), view child attendance, grades, fee invoices |

---

## Project Structure

```
student-management/
├── app/
│   ├── main.py                     # FastAPI app entrypoint, CORS, routers & rate limiting
│   ├── core/
│   │   ├── config.py               # Pydantic v2 BaseSettings loaded from .env
│   │   ├── security.py             # Argon2id hashing, PyJWT encoding/decoding, dummy fallback
│   │   ├── deps.py                 # get_current_user, require_roles, get_client_ip
│   │   ├── rate_limit.py           # slowapi Limiter instance & 429 response handler
│   │   └── email.py                # Console / SMTP email backend abstraction
│   ├── db/
│   │   ├── base.py                 # DeclarativeBase, TimestampMixin
│   │   └── session.py              # PostgreSQL engine, SessionLocal, get_db dependency
│   ├── models/                     # SQLAlchemy 2.0 ORM models
│   │   ├── user.py                 # User, UserRole, UserStatus
│   │   ├── student.py              # Student (1:1 with User, student_code STU-YYYY-XXXX)
│   │   ├── teacher.py              # Teacher (1:1 with User, employee_code)
│   │   ├── parent.py               # Parent profile + ParentStudentLink
│   │   ├── academic.py             # Grade, Class, Section, TeacherSubjectAssignment
│   │   ├── calendar.py             # AcademicYear, Holiday, CompensatoryDay, CalendarDay
│   │   ├── attendance.py           # DailyAttendance, AttendanceStatus (Present, Absent, Late, Excused)
│   │   ├── fee.py                  # FeeStructure, StudentFeeInvoice, FeePayment
│   │   ├── id_counter.py           # IdCounter for concurrency-safe row-level ID locking
│   │   ├── invite.py               # Invite token hashes (48h single-use)
│   │   ├── refresh_token.py        # RefreshToken with family_id rotation & replay detection
│   │   ├── password_reset.py       # PasswordReset token hashes (30 min single-use)
│   │   ├── audit_log.py            # AuditLog with PostgreSQL JSONB metadata
│   │   └── application.py          # Public student admissions applications
│   ├── schemas/                    # Pydantic request / response schemas
│   │   ├── auth.py                 # Login, token, password reset, 2FA schemas
│   │   ├── user.py                 # UserRead, Student/Teacher/Parent sub-profiles
│   │   ├── calendar.py             # HolidayCreate, CompensatoryDayCreate, CalendarDayStatus
│   │   ├── attendance.py           # AttendanceRecordCreate, AttendanceBulkSubmit, OverviewResponse
│   │   ├── academic.py             # GradeCreate, ClassCreate, SectionCreate, AssignmentCreate
│   │   ├── admission.py            # StudentAdmissionCreate, AdmissionWorkflowResponse
│   │   ├── fee.py                  # FeeStructureCreate, FeeInvoiceResponse, PaymentRecord
│   │   └── parent.py               # ParentCreate, LinkChildRequest, ParentChildrenResponse
│   ├── api/v1/                     # 22 Modular REST API Routers
│   │   ├── auth.py                 # Login, refresh, logout, accept-invite, password reset, 2FA
│   │   ├── calendar.py             # Academic calendar, holidays, compensatory days, status check
│   │   ├── admin_attendance.py     # Admin daily attendance overview and reports
│   │   ├── teacher_attendance.py   # Teacher roll-call attendance submission
│   │   ├── admin_classes.py        # Grade & class management
│   │   ├── admin_sections.py       # Class section creation and management
│   │   ├── admin_grades.py         # Academic grade level configurations
│   │   ├── admin_teacher_subjects.py # Teacher-to-subject & section assignments
│   │   ├── admin_students.py       # Student directory & profile administration
│   │   ├── admin_teachers.py       # Teacher staff administration
│   │   ├── admin_users.py          # User accounts, status changes (suspend/activate), resend invites
│   │   ├── admissions.py           # Student admission processing & enrollment code assignment
│   │   ├── applications.py         # Public online applications & admin approval pipeline
│   │   ├── fees.py                 # Fee structures, student invoices & payment logging
│   │   ├── parents.py              # Parent creation, student linking, `/parents/me/children`
│   │   ├── audit_logs.py           # Operational audit trail querying
│   │   ├── students.py             # `/students/me` personal profile and records
│   │   ├── teachers.py             # Teacher profile & missing student incident reporting
│   │   ├── teacher_classes.py      # Assigned classes lookup for logged-in teacher
│   │   ├── teacher_sections.py     # Assigned class sections lookup
│   │   └── teacher_subjects.py     # Assigned subjects lookup
│   ├── services/                   # Business logic layer
│   │   ├── auth_service.py         # Multi-identifier login, lockout, token rotation
│   │   ├── calendar_service.py     # Calendar calculations, working day validation, holiday rules
│   │   ├── attendance_service.py   # Roll-call processing, daily summaries, presence percentage
│   │   ├── admission_service.py    # Concurrency-safe student ID generator & admission handling
│   │   └── fee_service.py          # Invoice calculation & payment validation
│   └── tests/                      # Automated unit, integration, and security test suites
├── frontend/
│   ├── admin-frontend/             # Admin & Teacher Portal (Next.js 14, MUI v6, DataGrid, Pickers)
│   └── student-portal/             # Student & Parent Portal (Next.js 14, MUI v6, Child Switcher)
├── alembic/                        # Database migration scripts
├── scripts/
│   └── seed_super_admin.py         # Idempotent super-admin seed script
├── .env.example
├── requirements.txt
└── README.md
```

---

## Core Feature Modules & API Reference

### 1. Authentication & Security (`/api/v1/auth`)
- **Multi-Identifier Login:** Supports email, `student_code` (e.g., `STU-2026-0001`), or `employee_code`.
- **Timing-Safe Verification:** Executes precomputed dummy hash checks on unknown identifiers to prevent user enumeration.
- **Brute-Force Lockout:** Account locks for 15 minutes after 5 consecutive failed attempts; throttled via `slowapi`.
- **Refresh Token Rotation:** Refresh tokens are issued via `httpOnly`, `SameSite=Strict` cookies. Replay of an invalidated refresh token revokes the entire token family.
- **Two-Factor Authentication (TOTP):** Mandatory RFC 6238 2FA for administrators with QR setup and verification.

### 2. Academic Calendar (`/api/v1/calendar`)
- **Day Status Resolution:** Computes whether any date is a `WORKING_DAY`, `HOLIDAY`, `COMPENSATORY_WORKING_DAY`, or `WEEKEND`.
- **Holiday Scheduling:** Create, update, and manage official single-day and multi-day school holidays.
- **Compensatory Days:** Configure weekend days as official working days (e.g., working Saturdays) with attendance eligibility.
- **Attendance Pre-check:** Enforces that attendance can only be marked on official working days or compensatory days.

### 3. Attendance Management (`/api/v1/admin/attendance`, `/api/v1/teacher/attendance`)
- **Daily Roll-Call:** Teachers submit student presence statuses (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) by section.
- **Admin Daily Overview:** Real-time school-wide attendance metrics, class-by-class presence percentages, and absence counts.
- **Date Filtering:** Historical review with custom date navigation and calendar-aware validation.

### 4. Academic Structure & Class Management (`/api/v1/admin/*`)
- **Grades & Classes:** Configure academic levels (e.g., Grade 10, Grade 11) and classes.
- **Sections:** Group students into sections (e.g., Section A, Section B) with designated class teachers.
- **Teacher Subject Assignments:** Assign specific subjects within sections to qualified faculty.

### 5. Student Admissions & ID Allocation (`/api/v1/admissions`, `/api/v1/applications`)
- **Atomic ID Generation:** Row-locked PostgreSQL counters generate sequential student IDs (`STU-YYYY-XXXX`) without collisions.
- **Multi-Step Admissions:** Formal enrollment records student demographics, parent details, academic allocation, and generates portal invitations.
- **Public Applications:** Public portal endpoint for new student intake with an administrative approval pipeline.

### 6. Parent & Guardian Services (`/api/v1/parents`)
- **Single Parent Profile Constraint:** Prevents duplicate parent records while allowing multiple linked students.
- **Child Linking:** Secure linking of students to verified parents/guardians with relationship designations (Father, Mother, Legal Guardian).
- **Ward Data Access:** Dedicated endpoints (`/parents/me/children`) allowing parents to review linked children's attendance, grades, and invoices.

### 7. Fees & Billing (`/api/v1/fees`)
- **Fee Structures:** Configure tuition, lab, library, and term fee templates by grade level.
- **Student Invoices:** Auto-generate term invoices with due dates, amounts, and payment tracking.
- **Payment Records:** Log full or partial fee payments with receipts and outstanding balance calculation.

### 8. Audit Logging
- **Audit Logs (`/api/v1/audit-logs`):** Automatically logs administrative events with user ID, client IP, action type, and JSONB metadata.

---

## Local Setup & Quickstart

### 1. Prerequisites
- Python 3.12+
- PostgreSQL running on `localhost:5432`

### 2. Database Setup
```bash
# Create local development database
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

### 4. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your local PostgreSQL password and JWT secret
```

### 5. Run Database Migrations
```bash
alembic upgrade head
```

### 6. Seed Initial Super Admin
```bash
python -m scripts.seed_super_admin
```
> Default seed credentials: `admin@school.local` / `ChangeMe@1234` (`must_change_password=True`).

### 7. Start the Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
- **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Interactive ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## Automated Test Suite

```bash
# Run all tests with code coverage report
pytest --cov=app --cov-report=term-missing app/tests/ -v
```

---

## Security Review Checklist

- [x] **Argon2id Password Hashing:** Salted, memory-hard hashing with timing attack mitigations.
- [x] **No Plaintext Tokens:** Invites, refresh tokens, and password reset tokens stored strictly as SHA-256 hashes.
- [x] **Token Family Reuse Detection:** Intercepts stolen token reuse and immediately invalidates all active sessions in the family.
- [x] **Cookie Hardening:** `httpOnly=True`, `SameSite=Strict`, with `secure` toggle for HTTPS production.
- [x] **Rate Limiting:** `slowapi` brute-force defenses on auth, admissions, and public endpoints.
- [x] **Role & Data Ownership Verification:** Server-side dependency injection enforces tenant and permission isolation.
- [x] **Comprehensive Audit Trail:** Immutable JSONB operational logging in PostgreSQL.
