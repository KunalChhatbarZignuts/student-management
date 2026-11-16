# Student Management System — Platform Architecture & Backend API

Production-grade **FastAPI** backend for a comprehensive Student Management System featuring JWT authentication, role-based access control (RBAC), academic calendar management, weekly timetables, daily attendance roll-call, student leave application workflow (Class Teacher approval), multi-tier academic structure (grades, sections, shifts, periods), multi-step student admissions, parent-child linking, enterprise fee management & payment webhooks, audit logging, and resilient background task automation.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | FastAPI 0.162+, Uvicorn (ASGI) |
| **Language** | Python 3.12+ (fully typed) |
| **Database** | PostgreSQL 16+ (Local or Cloud @ `localhost:5432`) |
| **Driver & ORM** | Psycopg 3 (`postgresql+psycopg://`), SQLAlchemy 2.0 (pure `Mapped`, `mapped_column` style) |
| **Migrations** | Alembic (transactional DDL, reversible migrations) |
| **Validation** | Pydantic v2 + pydantic-settings |
| **Password Hashing** | argon2-cffi (Argon2id with timing-safe dummy verification against user enumeration) |
| **Tokens & Auth** | PyJWT (short-lived access tokens, restricted JWTs) |
| **Refresh Flow** | HttpOnly `SameSite=Strict` cookie, token family rotation & replay detection |
| **Rate Limiter** | slowapi (IP-based brute-force defenses on auth, admissions, and sensitive routes) |
| **Email** | Abstract email backend (`ConsoleEmailBackend` in dev, SMTP in production) |
| **Testing** | pytest 9.2+, pytest-asyncio, pytest-cov, httpx |

---

## Roles & Permissions Matrix

Users can **never** self-select their role. Roles are assigned strictly by the system or authorized administrators:

| Role | Created By | Capabilities |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Seed script only | System-wide configuration, create admins, seed data, view full audit logs, manage all tenants |
| `ADMIN` | Super Admin | Manage users, grades, sections, shifts, periods, calendar, admissions, fees, timetable generation, leave monitoring |
| `TEACHER` | Admin / Super Admin | Access assigned sections/classes, conduct daily roll-call attendance, review & approve/reject student leave applications as Class Teacher |
| `STUDENT` | Admin / Admissions | Access own learner record (`/students/me`), attendance stats, marks, submit leave applications & track status |
| `PARENT` | Admin / Link Flow | Access linked children (`/parents/me/children`), view child attendance, marks, submit leave applications on behalf of children |

---

## Project Structure

```text
student-management/
├── app/
│   ├── main.py                         # FastAPI app entrypoint, CORS, routers & rate limiting
│   ├── core/
│   │   ├── config.py                   # Pydantic v2 BaseSettings loaded from .env
│   │   ├── security.py                 # Argon2id hashing, PyJWT encoding/decoding, dummy fallback
│   │   ├── deps.py                     # get_current_user, require_roles, get_client_ip, get_db
│   │   ├── rate_limit.py               # slowapi Limiter instance & 429 response handler
│   │   └── email.py                    # Console / SMTP email backend abstraction
│   ├── db/
│   │   ├── base.py                     # DeclarativeBase, TimestampMixin
│   │   └── session.py                  # PostgreSQL engine, SessionLocal, get_db with explicit rollback
│   ├── models/                         # 18 SQLAlchemy 2.0 ORM model files (48 active tables)
│   │   ├── user.py                     # User, UserRole, UserStatus
│   │   ├── student.py                  # Student (1:1 with User, student_code STU-YYYY-XXXX)
│   │   ├── teacher.py                  # Teacher (1:1 with User, employee_code)
│   │   ├── parent.py                   # Parent profile + ParentStudentLink
│   │   ├── academic_structure.py       # AcademicYear, Grade, Section, Shift, Period, StudentEnrollment, TeacherSubject, Timetable, TimetableEntry
│   │   ├── classroom.py                # Class, Subject, TeacherAssignment
│   │   ├── calendar.py                 # SchoolCalendarSettings, SchoolHoliday, HolidayCategory, HolidayAuditHistory, CalendarSpecialWorkingDay
│   │   ├── attendance.py               # AttendanceSession, AttendanceRecord, AttendanceAuditHistory, AttendanceStatus
│   │   ├── leave.py                    # StudentLeaveApplication, LeaveStatus, LeaveSubmissionRole
│   │   ├── fee.py                      # FeeStructure, FeeStructureItem, FeeComponent, FeeInstallment, StudentFeeAssignment, PaymentTransaction, PaymentWebhookEvent
│   │   ├── academic.py                 # AttendanceRecord, FeeInvoice, StudentMark (portal legacy compatibility)
│   │   ├── admission.py                # Admission intake records
│   │   ├── application.py              # Prospective online student admissions applications
│   │   ├── id_counter.py               # IdCounter for concurrency-safe row-level ID locking
│   │   ├── invite.py                   # Invite token hashes (48h single-use)
│   │   ├── refresh_token.py            # RefreshToken with family_id rotation & replay detection
│   │   ├── password_reset.py           # PasswordReset token hashes (30 min single-use)
│   │   └── audit_log.py                # AuditLog with PostgreSQL JSONB metadata
│   ├── schemas/                        # 18 Pydantic request / response schema files
│   │   ├── auth.py                     # Login, token, password reset schemas
│   │   ├── user.py                     # UserRead, UserCreate, status change schemas
│   │   ├── student.py                  # Student profile schemas
│   │   ├── teacher.py & teacher_ext.py # Teacher profile, assignments, and workload schemas
│   │   ├── parent.py                   # ParentCreate, LinkChildRequest, ParentChildrenResponse
│   │   ├── leave.py                    # LeaveCreate, LeaveApproval, LeaveResponse, LeaveSummary schemas
│   │   ├── timetable.py                # TimetableCreate, TimetableSlot, WeeklySchedule schemas
│   │   ├── attendance.py               # AttendanceRecordCreate, AttendanceBulkSubmit, OverviewResponse
│   │   ├── calendar.py                 # HolidayCreate, SpecialWorkingDayCreate, CalendarDayStatus
│   │   ├── classroom.py                # Class, Subject, and TeacherAssignment schemas
│   │   ├── grade_section.py            # Grade and Section management schemas
│   │   ├── academic.py                 # Legacy FeeInvoiceRead, StudentMarkRead schemas
│   │   ├── admission.py                # StudentAdmissionCreate, AdmissionWorkflowResponse
│   │   ├── application.py              # Online student application schemas
│   │   ├── fee.py                      # FeeStructure, Installment, Payment, Webhook schemas
│   │   ├── admin.py                    # Admin user and settings schemas
│   │   └── teacher_subject.py          # Teacher subject mapping schemas
│   ├── api/v1/                         # 23 Modular REST API Routers
│   │   ├── auth.py                     # Login, refresh, logout, accept-invite, password reset
│   │   ├── leaves.py                   # Student leave submission, Class Teacher review, Admin monitoring
│   │   ├── timetables.py               # Section timetables, teacher weekly schedules, free period finder
│   │   ├── calendar.py                 # School calendar, holidays, special working days, day status
│   │   ├── admin_attendance.py         # School-wide attendance overview, section attendance stats
│   │   ├── teacher_attendance.py       # Teacher roll-call attendance submission & roster retrieval
│   │   ├── admin_grades.py             # Academic grade levels (Grade 1 - 12, KG, Nursery)
│   │   ├── admin_sections.py           # Sections under grades (e.g., 10-A, 10-B)
│   │   ├── admin_classes.py            # Legacy class structure management
│   │   ├── admin_teacher_subjects.py   # Teacher-to-subject & section assignments
│   │   ├── admin_students.py           # Student directory & profile administration
│   │   ├── admin_teachers.py           # Teacher staff directory & assignments
│   │   ├── admin_users.py              # User management, suspension, activation, invite dispatch
│   │   ├── admissions.py               # Formal admission processing & student code assignment
│   │   ├── applications.py             # Prospective online applications & admission queue
│   │   ├── fees.py                     # Enterprise fee structures, assignments, installment payments
│   │   ├── parents.py                  # Parent portal, student linking, children fee & academic views
│   │   ├── students.py                 # `/students/me` profile, marks, and fees
│   │   ├── teachers.py                 # Teacher directory and profile lookup
│   │   ├── teacher_classes.py          # Assigned classes lookup for logged-in teacher
│   │   ├── teacher_sections.py         # Assigned sections lookup
│   │   ├── teacher_subjects.py         # Teacher qualified subjects lookup
│   │   └── audit_logs.py               # Immutable administrative audit log search
│   ├── services/                       # 15 Domain Service Modules
│   │   ├── auth_service.py             # Multi-identifier login, lockout, token family rotation
│   │   ├── leave_service.py            # Dynamic Class Teacher resolution, leave submission, approval workflow
│   │   ├── timetable_service.py        # Workload distribution, timetable generation, conflict resolution
│   │   ├── attendance_service.py       # Roll-call processing, roster eager loading, approved leave integration
│   │   ├── calendar_service.py         # Calendar calculations, working day validation, holiday rules
│   │   ├── admission_service.py        # Concurrency-safe student ID generator & admission handling
│   │   ├── fee_service.py              # Enterprise fee structures, installments, online & offline payments
│   │   ├── enrollment_service.py       # Student academic enrollment and status lifecycle
│   │   ├── grade_service.py            # Grade level business operations
│   │   ├── section_service.py          # Section division business operations
│   │   ├── teacher_assignment_service.py # Class teacher and subject teacher appointments
│   │   ├── teacher_subject_service.py  # Teacher qualification mapping
│   │   ├── assignment_service.py       # Legacy assignment operations
│   │   ├── id_generator.py             # Atomic sequence generation
│   │   └── audit_service.py            # Centralized event logging
│   └── tests/                          # Automated pytest suite (92 tests, 100% green, 87% coverage)
├── frontend/
│   ├── admin-frontend/                 # Admin & Teacher Portal (Next.js 14, MUI v6, DataGrid, Pickers)
│   └── student-portal/                 # Student & Parent Portal (Next.js 14, MUI v6, Child Switcher)
├── alembic/                            # Database migrations (PostgreSQL DDL)
├── scripts/
│   └── seed_super_admin.py             # Idempotent super-admin seed script
├── .env.example
├── requirements.txt
└── README.md
```

---

## Core Feature Modules & API Reference

### 1. Authentication & Security (`/api/v1/auth`)
- **Multi-Identifier Login:** Supports email, `student_code` (e.g., `STU-2026-0001`), or `employee_code`.
- **Timing-Safe Verification:** Executes precomputed dummy argon2 hash verification on unknown identifiers to defeat user enumeration timing attacks.
- **Brute-Force Lockout:** Account locks for 15 minutes after 5 consecutive failed attempts; throttled via `slowapi`.
- **Refresh Token Rotation:** Refresh tokens are issued via `httpOnly`, `SameSite=Strict`, `secure` cookies. Token family tracking revokes all active sessions upon replay detection.

### 2. Student Leave Application Management (`/api/v1/leaves`)
- **Student Portal Submission:** Logged-in students submit leave applications with start date, end date, and reason (`POST /api/v1/leaves/student/apply`).
- **Parent Portal Submission:** Verified parents submit leave applications on behalf of linked children (`POST /api/v1/leaves/parent/apply`).
- **Dynamic Class Teacher Routing:** The backend automatically identifies the student's active Grade and Section, locates the designated `CLASS_TEACHER` from `teacher_assignments`, and routes the application to their queue.
- **Teacher Review & Approval:** Only the assigned Class Teacher can approve or reject pending requests with mandatory remarks (`POST /api/v1/leaves/teacher/{id}/approve`, `POST /api/v1/leaves/teacher/{id}/reject`). Unauthorized teachers or admins receive strict `403 Forbidden`.
- **Roster & Attendance Integration:** Approved leaves automatically annotate the teacher's daily roll-call roster (`has_approved_leave=True`, `default_status="EXCUSED"`), preventing wrongful absence marking.
- **Admin Oversight:** Centralized monitoring view (`GET /api/v1/leaves/admin/monitoring`) with status, grade, section, and date filters.

### 3. Weekly Timetables & Schedule Distribution (`/api/v1/timetables`)
- **Master Section Timetables:** Weekly timetable versions with configurable period slots per day (Monday through Saturday).
- **Teacher Workload Distribution:** Balances teacher periods evenly across the school week to avoid overloading single days.
- **Conflict Validation:** Strict database constraints and service-level checks prevent double-booking teachers or classrooms in the same period slot.
- **Teacher Portal View:** Teachers can look up their personalized weekly schedule (`GET /api/v1/timetables/teacher/me`).
- **Free Period / Substitution Finder:** Identifies available teachers during any specific day and period for seamless substitution planning.

### 4. Academic Calendar & Holidays (`/api/v1/calendar`)
- **Day Status Resolution:** Computes whether any date is a `WORKING_DAY`, `HOLIDAY`, `COMPENSATORY_WORKING_DAY`, or `WEEKEND`.
- **Holiday Scope:** Configure school-wide holidays or target specific grades and sections via association tables.
- **Compensatory Working Days:** Designate weekend dates (e.g., Saturday) as working days with full roll-call eligibility.
- **Attendance Pre-check:** Enforces that roll-call can only be conducted on authorized working or compensatory days.

### 5. Attendance Management (`/api/v1/admin/attendance`, `/api/v1/teacher/attendance`)
- **Daily Roll-Call:** Class teachers submit student presence statuses (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) by section.
- **Eager Loading Optimization:** Section rosters use `joinedload(StudentEnrollment.student)` to eliminate N+1 database queries.
- **Admin Daily Overview:** Real-time school-wide attendance metrics, class-by-class presence percentages, and absence counts.
- **Audit History:** Full immutable record of roll-call creation and historical edits (`attendance_audit_history`).

### 6. Academic Structure (`/api/v1/admin/grades`, `/api/v1/admin/sections`)
- **Normalized Hierarchy:** `AcademicYear` $\to$ `Grade` $\to$ `Section`.
- **Shifts & Periods:** Configure shift schedules (Morning, Afternoon) and period bell timings.
- **Optimized Schema:** Abandoned tables (`class_groups`, `grade_subjects`) safely decommissioned via migration `1d30d2b6254b`.

### 7. Student Admissions & ID Allocation (`/api/v1/admissions`, `/api/v1/applications`)
- **Atomic Concurrency-Safe ID Generation:** PostgreSQL row-level locks on `id_counters` guarantee sequential `STU-YYYY-XXXX` identifiers without race conditions.
- **Multi-Step Admissions:** Formal intake capturing student demographics, parent accounts, academic placements, and invite dispatch.
- **Online Applications Queue:** Prospective student application pipeline with administrative review and approval.

### 8. Parent & Guardian Services (`/api/v1/parents`)
- **Single Parent Profile Constraint:** Prevents duplicate parent records while allowing multiple linked students.
- **Verified Ward Linking:** Secure relationship mapping (`Father`, `Mother`, `Legal Guardian`) via `parent_student_links`.
- **Ward Access:** Dedicated endpoints (`/parents/me/children`) to view attendance statistics, academic marks, and fee invoices.

### 9. Fees & Billing (`/api/v1/fees`)
- **Enterprise Fee Architecture:** `FeeStructure`, `FeeStructureItem`, `FeeComponent`, `FeeInstallment`, and `StudentFeeAssignment`.
- **Flexible Payments:** Support for online payment transactions (`payment_transactions`) and offline receipts (`fee_payments`).
- **Payment Gateway Webhooks:** Idempotent webhook handling with event logging (`payment_webhook_events`) to prevent double-crediting.
- **Legacy Compatibility:** Maintains `fee_invoices` table for backward-compatible portal views.

---

## Local Setup & Quickstart

### 1. Prerequisites
- Python 3.12+
- PostgreSQL 16+ running on `localhost:5432`

### 2. Database Setup
```bash
# Create local development database
psql -U postgres -h localhost -c "CREATE DATABASE student_mgmt;"

# Create test database
psql -U postgres -h localhost -c "CREATE DATABASE student_mgmt_test;"
```

### 3. Virtual Environment & Dependencies
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your local PostgreSQL password, secret keys, and settings:
# DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/student_mgmt
# TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/student_mgmt_test
# JWT_SECRET=your-secure-random-secret
```

### 5. Run Database Migrations
```bash
# Upgrade database to latest revision
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
- **Health Check Endpoint:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## Automated Test Suite

Run the full automated test suite with coverage:
```bash
pytest app/tests --cov=app --cov-report=term-missing
```

**Current Baseline Status:**
- **92 / 92 Passed (100% Green)**
- **Coverage:** **87%** across all 10,261 statements
- Test suites cover: auth & tokens, admissions wizard, admissions queue, academic calendar & holidays, daily roll-call attendance, grade & section administration, fee structures & payments, parent portal, teacher assignments, student leave applications, and weekly timetables.

---

## Security & Architecture Checklist

- [x] **Argon2id Password Hashing:** Salted, memory-hard hashing with constant-time dummy verification.
- [x] **No Plaintext Sensitive Tokens:** Invites, refresh tokens, and password reset tokens stored strictly as SHA-256 hashes.
- [x] **Token Family Reuse Detection:** Intercepts stolen token reuse and immediately invalidates all active sessions in the family.
- [x] **Cookie Hardening:** `httpOnly=True`, `SameSite=Strict`, with `secure` toggle for production HTTPS.
- [x] **Transaction Safety:** Explicit `db.rollback()` on exception inside the `get_db()` dependency prevents transaction leaks.
- [x] **N+1 Query Prevention:** Roster queries use `joinedload(StudentEnrollment.student)` for single-query retrieval.
- [x] **Context-Derived RBAC:** Class Teacher authorization resolves dynamically from database assignments; client cannot tamper with teacher IDs.
- [x] **Rate Limiting:** `slowapi` brute-force defenses on auth, admissions, and public endpoints.
- [x] **Comprehensive Audit Trail:** Immutable JSONB operational logging in PostgreSQL (`audit_logs`, `attendance_audit_history`, `holiday_audit_history`).
