# Student Management System — Platform Architecture & Backend API

Production-grade **FastAPI** backend for a comprehensive Student Management System built on a **Domain-Driven Modular Monolith** architecture. Features JWT authentication, role-based access control (RBAC), academic structure & timetables, roll-call attendance, student leave approvals, parent-child linking, enterprise fees & Razorpay POS payments, Digital School Diary, real-time WebRTC Online Classrooms, Conversational AI Student Assistant with `pgvector` RAG, and an AI Personalized Learning Engine.

---

## Tech Stack & Required Versions

| Layer / Library | Required Version | Purpose |
| :--- | :--- | :--- |
| **Python Runtime** | `3.12+` (tested on `3.12.0`) | Modern asynchronous Python runtime |
| **PostgreSQL** | `16+` or `17+` (with `pgvector >= 0.7.0`) | Primary relational database with vector search |
| **fastapi** | `0.162.0` | Core asynchronous web framework |
| **uvicorn[standard]** | `0.54.0` | High-performance ASGI web server |
| **SQLAlchemy** | `2.1.6` | Database ORM (`Mapped` typed mapping style) |
| **psycopg[binary]** | `3.3.6` | PostgreSQL DBAPI 3 driver |
| **alembic** | `1.20.1` | Transactional database schema migrations |
| **pydantic** | `2.14.1` | Data validation and serialization (Pydantic v2) |
| **pydantic-settings** | `2.16.2` | Environment variables loading (`.env`) |
| **argon2-cffi** | `25.1.0` | Password hashing (Argon2id algorithm) |
| **PyJWT** | `2.15.1` | JWT access and restricted token signing |
| **slowapi** | `0.1.10` | IP-based sliding-window API rate limiting |
| **livekit-api** | `2.0.1` | WebRTC online classroom tokens & server API |
| **razorpay** | `2.0.1` | Fee payment gateway API & webhooks |
| **reportlab** | `5.1.0` | Dynamic PDF fee receipt & report card generation |
| **email-validator** | `2.3.0` | RFC-compliant email address validation |
| **pytest** | `9.2.0` | Test runner (127 passed tests) |
| **pytest-asyncio** | `1.4.1` | Async test fixtures & execution |
| **pytest-cov** | `7.1.0` | Code coverage reporting |
| **httpx** | `0.28.1` | Async HTTP client for test clients |

---

## Roles & Permissions Matrix

Users can **never** self-select their role. Roles are assigned strictly by the system or authorized administrators:

| Role | Created By | Capabilities |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Seed script only | System-wide configuration, create admins, seed data, view full audit logs, manage all tenants |
| `ADMIN` | Super Admin | Manage users, grades, sections, shifts, periods, calendar, admissions, fees, timetable generation, leave monitoring |
| `TEACHER` | Admin / Super Admin | Access assigned sections/classes, conduct daily roll-call attendance, review & approve/reject student leave applications, compose Digital Diary remarks, host Online Classrooms |
| `STUDENT` | Admin / Admissions | Access own learner record (`/students/me`), attendance stats, marks, submit leave applications, read Digital Diary, join Online Classrooms, chat with AI Assistant, personalized study routines |
| `PARENT` | Admin / Link Flow | Access linked children (`/parents/me/children`), view child attendance, marks, sign/acknowledge Digital Diary remarks, 1-on-1 teacher discussions, online fee payments via Razorpay |

---

## Domain-Driven Project Architecture

The backend is structured into cohesive, self-contained business domain modules under `app/modules/`:

```text
student-management/
├── app/
│   ├── main.py                         # FastAPI app entrypoint, CORS, GZip, rate limiter, module router inclusion
│   ├── core/                           # Cross-cutting system infrastructure
│   │   ├── config.py                   # Pydantic v2 BaseSettings loaded from .env
│   │   ├── security.py                 # Argon2id hashing, PyJWT encoding/decoding, dummy fallback
│   │   ├── deps.py                     # get_current_user, require_roles, get_client_ip, get_db
│   │   ├── rate_limit.py               # slowapi Limiter instance & 429 response handler
│   │   └── email.py                    # Console / SMTP / Mailtrap email backend abstraction
│   ├── db/                             # Core database layer
│   │   ├── base.py                     # DeclarativeBase, TimestampMixin
│   │   └── session.py                  # PostgreSQL engine, SessionLocal, get_db with explicit rollback
│   └── modules/                        # Domain-driven business modules (single source of truth)
│       ├── models.py                   # Centralized model registry for SQLAlchemy & Alembic discovery
│       ├── auth/                       # Login, tokens, users, invitations, password resets
│       │   ├── router.py & users_router.py
│       │   ├── models.py, refresh_token_models.py, invite_models.py, password_reset_models.py
│       │   ├── schemas.py, user_schemas.py, admin_schemas.py
│       │   └── service.py
│       ├── students/                   # Student profiles, admissions inquiry/conversion, parent links
│       │   ├── router.py, admin_router.py, admissions_router.py, parents_router.py
│       │   ├── models.py, admission_models.py, parent_models.py
│       │   ├── schemas.py, detail_schemas.py, admission_schemas.py, parent_schemas.py
│       │   └── service.py, admission_service.py
│       ├── teachers/                   # Staff directory, subject qualifications, section allocations
│       │   ├── router.py, admin_router.py, classes_router.py, sections_router.py, subjects_router.py
│       │   ├── models.py
│       │   ├── schemas.py, detail_schemas.py, subject_schemas.py, ext_schemas.py
│       │   └── detail_service.py, subject_service.py, assignment_service.py
│       ├── academics/                  # Grades, sections, enrollments, timetables, calendar, rollover
│       │   ├── classes_router.py, grades_router.py, sections_router.py, enrollments_router.py...
│       │   ├── structure_models.py, models.py, classroom_models.py, calendar_models.py
│       │   ├── schemas.py, grade_section_schemas.py, timetable_schemas.py, calendar_schemas.py...
│       │   └── grade_service.py, section_service.py, enrollment_service.py, timetable_service.py...
│       ├── attendance/                 # Daily attendance, absence notifications, leaves workflow
│       │   ├── admin_router.py, teacher_router.py, absence_notifications_router.py, leaves_router.py
│       │   ├── models.py, leave_models.py
│       │   ├── schemas.py, absence_notification_schemas.py, leave_schemas.py
│       │   └── service.py, absence_notification_service.py, leave_service.py
│       ├── examinations/               # Exam series, schedules, marks grading, PDF report cards
│       │   ├── router.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   └── service.py, report_card_generator.py
│       ├── fees/                       # Fee structures, student invoices, concessions, POS counter, Razorpay
│       │   ├── router.py, pos_router.py
│       │   ├── models.py
│       │   ├── schemas.py, pos_schemas.py
│       │   └── service.py, pos_service.py, receipt_generator.py, razorpay_service.py
│       ├── diary/                      # Digital School Diary entries, signatures, 1-on-1 discussions
│       │   ├── router.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   └── service.py
│       ├── online_classroom/           # Live video classes, LiveKit tokens, real-time WebSocket hub
│       │   ├── router.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   └── service.py, ws_manager.py, livekit_service.py
│       ├── ai/                         # Conversational AI Assistant & Personalized Learning
│       │   ├── assistant/              # HuggingFace Qwen 2.5 chatbot, database tools, pgvector RAG
│       │   │   ├── router.py, models.py, knowledge_models.py, schemas.py
│       │   │   └── service.py, tools.py, hf_provider.py, rag_service.py, interactive_service.py...
│       │   └── learning/               # Topic progression, constraint study planner, routines, quizzes
│       │       ├── router.py, models.py, schemas.py, service.py, academic_service.py...
│       │       └── engines/            # performance_engine, study_planner_engine, practice_quiz_service...
│       └── audit/                      # Administrative audit trail & sequential ID counter generation
│           ├── router.py, models.py, counter_models.py, service.py, id_generator.py
├── frontend/
│   ├── admin-frontend/                 # Admin & Teacher Portal (Next.js 14, MUI v6, DataGrid, Pickers)
│   └── student-portal/                 # Student & Parent Portal (Next.js 14, MUI v6, AI Assistant, Diary)
├── alembic/                            # Database migrations (PostgreSQL DDL)
├── tests/                              # Automated pytest suite (127 tests, 100% green)
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
- **Refresh Token Rotation:** Issued via `httpOnly`, `SameSite=Strict`, `secure` cookies with token family reuse detection.

### 2. Digital School Diary (`/api/v1/diary`)
- **Teacher Composer:** Post 12 remark categories (Homework, Behaviour, Academic, Attendance, Notice, etc.) with attachments and past/future entry dates.
- **Targeted Audiences:** Granular distribution (`WHOLE_SECTION`, `STUDENTS_ONLY`, `PARENT_ONLY`, or specific students).
- **Student Read Receipts & Parent Signatures:** Timestamp-audited 1-click digital signatures confirming review.
- **Parent-Teacher Discussions:** Contextual 1-on-1 inquiry threads per diary entry with resolution lifecycle.

### 3. Online Classroom & Real-Time WebRTC (`/api/v1/online-classes`)
- **LiveKit Video Conferencing:** WebRTC SFU integration providing high-definition video, audio, and screen sharing.
- **Real-Time Interactive Hub:** WebSocket channel (`/feed/ws` and `/ws/{id}`) managing whiteboard broadcast, participant presence, hand raising, and in-class chat.
- **Role-Based Controls:** Teacher host controls (mic/cam toggles, student mute, kick), student pre-join green room, and admin view-only observer mode.

### 4. AI Student Assistant & Knowledge Base (`/api/v1/student/assistant`)
- **General & Academic Conversational AI:** Powered by Hugging Face (`Qwen/Qwen2.5-7B-Instruct`) with streaming Server-Sent Events (SSE).
- **10 Database Scoped Tools:** Live grounded answers for timetables, attendance, published marks, fee invoices, leaves, and class curriculum.
- **pgvector Semantic RAG:** PostgreSQL vector cosine similarity search over chunked school handbooks, fee policies, and codes of conduct.
- **Interactive Tools:** Audio transcription, voice tutor readouts, 3-round AI debate partner, and SVG concept map visualizer.

### 5. AI Personalized Learning Engine (`/api/v1/learning`)
- **Exam Performance Analytics:** Automatic subject strength and weakness discovery from verified official exam marks.
- **Topic Mastery Hierarchy:** 6-stage topic progression model (`RECOMMENDED` $\to$ `IN_PROGRESS` $\to$ `MASTERED`).
- **Constraint-Based Study Planner:** 14-day upcoming exam horizon lookahead generating personalized daily routines.
- **Focus Timer & Checklist:** Server-synced Pomodoro focus session tracking with persistent mistake bank logging.

### 6. Student Leave Application Workflow (`/api/v1/leaves`)
- **Student & Parent Submission:** Students or parents apply for leave with date ranges and justification.
- **Dynamic Class Teacher Routing:** Automatically resolves the assigned Class Teacher for approval or rejection.
- **Roll-Call Integration:** Approved leaves automatically mark student rosters as `EXCUSED` during attendance roll-call.

### 7. Fees, POS Counter & Online Payments (`/api/v1/fees`)
- **Enterprise Fee Structures:** Component-based fee heads, term installments, custom concessions, and adjustments.
- **Razorpay Online Payments:** Webhook-driven payment processing with HMAC signature verification.
- **In-Person POS Terminal:** Point of Sale counter fee collection with cash/card payment receipt generation.

### 8. Academic Structure, Timetables & Roll-Call Attendance
- **Structure:** Normalized hierarchy (`AcademicYear` $\to$ `Grade` $\to$ `Section`).
- **Conflict-Free Timetables:** Conflict detection preventing teacher or classroom double-booking; teacher substitution finder.
- **Roll-Call Attendance:** Class teachers submit student presence statuses (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) with automated absence alerts.

---

## Local Setup & Quickstart

### 1. Prerequisites
- Python 3.12+
- PostgreSQL 16+ running on `localhost:5432` with `pgvector` extension

### 2. Database Setup
```bash
# Create local development database
psql -U postgres -h localhost -c "CREATE DATABASE student_mgmt;"

# Enable pgvector extension inside the database
psql -U postgres -h localhost -d student_mgmt -c "CREATE EXTENSION IF NOT EXISTS vector;"
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
# Configure .env with your local database URL and secrets:
# DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/student_mgmt
# JWT_SECRET=your-secure-random-secret
# HUGGINGFACE_API_TOKEN=your-token-if-using-ai
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
- **Health Check Endpoint:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## Automated Test Suite

Run the full automated test suite with pytest:
```bash
PYTHONPATH=. ./venv/bin/pytest -q
```

**Current Baseline Status:**
- **127 / 127 Passed (100% Green)**
- Test suites cover: Authentication & token families, domain modules, AI Student Assistant & tools, Hugging Face streaming, pgvector RAG semantic search, Digital School Diary, Online Classroom WebRTC lifecycle, study planner engines, and transactional email.

---

## Security & Architecture Checklist

- [x] **Domain-Driven Modular Monolith:** Business capabilities cleanly separated into self-contained `app/modules/` domains.
- [x] **Argon2id Password Hashing:** Salted, memory-hard hashing with constant-time dummy verification.
- [x] **No Plaintext Sensitive Tokens:** Invites, refresh tokens, and password reset tokens stored strictly as SHA-256 hashes.
- [x] **Token Family Reuse Detection:** Intercepts stolen token reuse and immediately invalidates all active sessions in the family.
- [x] **Cookie Hardening:** `httpOnly=True`, `SameSite=Strict`, with `secure` toggle for production HTTPS.
- [x] **Transaction Safety:** Explicit `db.rollback()` on exception inside the `get_db()` dependency prevents transaction leaks.
- [x] **N+1 Query Prevention:** Queries use `selectinload` and `joinedload` for single-query relationship retrieval.
- [x] **Context-Derived RBAC:** Class Teacher authorization resolves dynamically from database assignments; client cannot tamper with teacher IDs.
- [x] **Rate Limiting:** `slowapi` sliding-window brute-force defenses on auth and public endpoints.
- [x] **Comprehensive Audit Trail:** Immutable JSONB operational logging in PostgreSQL (`audit_logs`, `attendance_audit_history`).
