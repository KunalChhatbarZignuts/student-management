# QA Project Context

## Product
- **Name:** Student Management System (SMS)
- **Type:** Multi-Portal Educational Management Platform
- **Description:** Complete school operations system managing admissions, academic enrollment, daily attendance, class timetables, fee management & POS cashiering, examinations, grade report cards, and parent/student communication.
- **URLs:**
  - Production: None configured (local and ngrok tunnel preview)
  - Staging: None configured
  - Development (Admin Portal): http://localhost:3000
  - Development (Student/Parent Portal): http://localhost:3001
  - Development (FastAPI Backend): http://127.0.0.1:8000
- **Key User Flows:**
  1. Authentication & Role-Based Access: Super Admin, Admin, Teacher, Student, Parent with JWT and refresh token rotation.
  2. Student & Teacher Directory: Paginated listings, search filters, profile inspection, and credential management.
  3. Academic Enrollment & Section Allocation: Section capacities, unassigned student batch enrollment, student transfer records, and cohort rollover.
  4. Daily Attendance & Absence Notifications: Section roll call, grace period self-correction, holiday suppression, and automated parent notifications.
  5. Timetables & Substitutions: Multi-shift clash-free schedule publishing, teacher dual-view schedule, and absent teacher substitute assignment.
  6. Fee Management & Cashier POS: Fee structures, student installments, Razorpay payment processing, and instant POS cash intake with ReportLab PDF receipt generation.
  7. Examinations & Report Cards: Exam cycle scheduling, Class Teacher marks entry with live grading, admin publication gate, and dynamic ReportLab report card PDF rendering.

## Tech Stack
### Frontend (Admin & Student Portals)
- **Framework:** Next.js 14.2.18 (App Router)
- **Language:** TypeScript 5.6.3
- **UI & Component Library:** Material UI (MUI v6.1.6), Emotion, MUI X Data Grid v7.22, MUI X Date Pickers v7.29
- **State Management:** TanStack React Query v5.60.5 (SWR caching), Zustand v5.0.1
- **Forms & Validation:** React Hook Form v7.53, Zod v3.23.8
- **Networking:** Axios v1.7.7

### Backend
- **Framework:** FastAPI 0.162.0 (ASGI via Uvicorn 0.54.0)
- **Language:** Python 3.12
- **Database Driver & ORM:** SQLAlchemy 2.1.6, Psycopg v3.3.6 (Binary)
- **Database Migrations:** Alembic 1.20.1
- **Security & Cryptography:** Argon2-cffi 25.1.0, PyJWT 2.15.1
- **Rate Limiting:** SlowAPI 0.1.10
- **PDF Generation:** ReportLab 5.1.0
- **Compression:** FastAPI GZipMiddleware (threshold: 1000 bytes)

### Database
- **Primary:** PostgreSQL 16 (local port 5432, database: `student_mgmt`)
- **Connection Pool:** SQLAlchemy QueuePool (`pool_size=20`, `max_overflow=10`, `pool_recycle=300`, `pool_pre_ping=True`)
- **Cache:** TanStack Query memory cache on frontend; no Redis currently configured.

### Hosting & Infrastructure
- **Development Runtime:** Local macOS Darwin, Node.js v22.23.2, Python 3.12 venv.
- **Deployment Platform:** Proposed Vercel (frontend) + Docker/Railway/Render (backend & PostgreSQL).
- **Monitoring & Logging:** Uvicorn access logging, FastAPI audit trail ledger (`audit_logs` table).

## Test Stack
### Unit / Integration (Backend)
- **Framework:** pytest 9.2.0 + pytest-asyncio 1.4.1 + pytest-cov 7.1.0
- **Config Location:** pyproject.toml / default pytest discovery
- **Test Directory:** `app/tests/` (25 test files, 108+ automated tests)
- **Execution Command:** `source venv/bin/activate && pytest app/tests/`

### Unit / Component (Frontend)
- **Framework:** Vitest 2.1.4 + React Testing Library 16.0.1 + JSDOM 25.0.1
- **Config Location:** `frontend/admin-frontend/vitest.config.ts`, `frontend/student-portal/vitest.config.ts`
- **Test Directory:** `frontend/admin-frontend/src/tests/`
- **Execution Command:** `npm --prefix frontend/admin-frontend test`

### API & Performance Testing
- **Framework:** k6 (prescribed by performance-testing skill; to be installed via `brew install k6`)
- **Lighthouse CI:** `@lhci/cli` (prescribed by performance-testing skill)
- **Test Directory:** `tests/performance/` (k6 scripts, scenarios, thresholds)

## CI/CD
- **Platform:** GitHub Actions (proposed)
- **Current Pipeline:** Local pre-commit verification and test runs.

## Environments
- **Development:** Localhost (`http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:8000`, PostgreSQL `student_mgmt`)
- **Staging / Isolated Perf Environment:** Proposed isolated database (`student_mgmt_perf`) on local PostgreSQL to protect existing data during load and stress tests.

## Quality & Performance Goals
- **API Response Time (P95):** Under 500 ms for standard endpoints.
- **API Response Time (P99):** Under 1000 ms.
- **Complex Reports & PDF Generation:** Under 2500 ms.
- **Frontend LCP (Largest Contentful Paint):** Under 2.5 seconds.
- **Frontend INP (Interaction to Next Paint):** Under 200 ms.
- **Frontend CLS (Cumulative Layout Shift):** Under 0.1.
- **Error Rate Under Load:** Below 1.0%.

## Risk Areas
1. **Fee POS Receipt & Examination Report Card PDF Generation (ReportLab):**
   - *Impact: High, Likelihood: Medium (Score: Critical)*
   - CPU-bound ReportLab rendering during concurrent requests can saturate the single Python process if not threaded or offloaded.
2. **Database Connection Pool Saturation Under Concurrent Load:**
   - *Impact: High, Likelihood: Medium (Score: Critical)*
   - Default pool (`pool_size=20`, `max_overflow=10`) may queue requests if >30 concurrent users perform complex queries simultaneously.
3. **Complex Joined Queries (Timetable publishing, Attendance summaries, Rollover):**
   - *Impact: Medium, Likelihood: High (Score: Important)*
   - Missing composite indexes on `(grade_id, section_id, date)` or `(academic_year_id, status)` could cause full table scans under load.

## Team
- **Structure:** Solo developer / pairing with AI Agent.
- **Ownership Model:** Automated end-to-end and performance test scripts run locally and integrated into release readiness gates.

## Conventions
- **Selector Strategy:** Semantic ARIA roles (`role="button"`, `role="heading"`, `getByRole`) and explicit `data-testid` where needed.
- **Performance Thresholds:** Stored in k6 script `options.thresholds` with scoped tags (`name: endpoint`).

