# Project Rules — Student Management API

## 1. Project Overview

- **Name**: Student Management API
- **Framework**: FastAPI (v0.162+)
- **Language**: Python 3.10+
- **ORM**: SQLAlchemy 2.0+ (sync engine, `sessionmaker`, `declarative_base`)
- **Database**: PostgreSQL (via `psycopg` driver)
- **Migrations**: Alembic
- **Auth**: JWT tokens (PyJWT) + password hashing (passlib with bcrypt)
- **Validation**: Pydantic v2 (pydantic-settings for config)
- **Server**: Uvicorn

---

## 2. File & Folder Conventions

Follow the existing modular layout strictly. Place new files in the correct directory:

| What             | Where                   | Example                      |
| ---------------- | ----------------------- | ---------------------------- |
| ORM models       | `models/<resource>.py`  | `models/student.py`          |
| Pydantic schemas | `schemas/<resource>.py` | `schemas/student.py`         |
| CRUD functions   | `crud/<resource>.py`    | `crud/student.py`            |
| API routers      | `routers/<resource>.py` | `routers/students.py`        |
| Security utils   | `core/security.py`      | (single file)                |
| Shared deps      | `dependencies.py`       | `get_db`, `get_current_user` |
| App config       | `config.py`             | `Settings` class             |
| DB setup         | `database.py`           | engine, session, Base        |
| App entrypoint   | `main.py`               | FastAPI app, router includes |
| Migrations       | `alembic/`              | auto-generated               |

**Rules:**

- One ORM model class per file in `models/`.
- One Pydantic schema set (Create, Update, Read) per file in `schemas/`.
- One CRUD module per resource in `crud/`.
- Router file names are **plural** (`routers/students.py`), model/schema/crud file names are **singular** (`models/student.py`).
- Every new router must be registered in `main.py` via `app.include_router(...)`.
- Add `__init__.py` to new packages only if needed for imports.

---

## 3. Coding Standards

### General

- Use **type hints** on all function signatures and return types.
- Use `Generator` typing for `get_db` dependency (yield pattern).
- Prefer **sync** functions — the project uses a sync SQLAlchemy engine. Do not mix `async def` endpoints with sync DB calls without understanding the implications.
- Keep functions short and single-purpose.
- Add a docstring to every public function explaining what it does.

### FastAPI Endpoints

- Use `APIRouter` in each router file with a `prefix` and `tags` list.
- Use `Depends(get_db)` for database sessions — never create sessions manually in endpoints.
- Use `Depends(get_current_user)` for protected endpoints.
- Always declare explicit `response_model` and `status_code` on endpoints.
- Use proper HTTP status codes: `201` for creation, `204` for deletion, `404` for not found, `401`/`403` for auth errors.
- Raise `HTTPException` for errors — never return raw error dicts.

### Pydantic Schemas (v2)

- Use `model_config = ConfigDict(from_attributes=True)` on read/response schemas (replaces the old `orm_mode`).
- Separate schemas: `<Resource>Create`, `<Resource>Update`, `<Resource>Read`.
- `<Resource>Update` fields should be `Optional` to support partial updates.
- Never expose password hashes in response schemas.

### SQLAlchemy Models

- Inherit from `Base` (imported from `database.py`).
- Use `mapped_column()` for column definitions (SQLAlchemy 2.0 style).
- Define `__tablename__` explicitly on every model.
- Use `relationship()` for foreign key relations; always define `back_populates` on both sides.
- Add `created_at` and `updated_at` timestamp columns to every model.

### CRUD Functions

- Accept `db: Session` as the first parameter.
- Return ORM model instances (or `None` for not-found cases).
- Keep business logic minimal — CRUD is for data access only.
- Name functions clearly: `get_user`, `get_user_by_email`, `create_user`, `update_user`, `delete_user`.

---

## 4. Security Rules

- **Never** hardcode secrets, passwords, or API keys in source code.
- All secrets go in `.env` and are loaded via `config.py` (`pydantic-settings`).
- **Never** commit `.env` to git — only `.env.example` (with placeholder values).
- Passwords must be hashed with **bcrypt** (via passlib) before storing.
- JWT tokens are signed with `SECRET_KEY` using the `HS256` algorithm.
- Token expiry is controlled by `ACCESS_TOKEN_EXPIRE_MINUTES` from settings.
- Protected endpoints must use `Depends(get_current_user)`.
- Validate and sanitize all user input via Pydantic schemas — never trust raw request data.

---

## 5. Database & Migration Rules

- **PostgreSQL** is the only supported database. Do not use SQLite or other backends.
- Connection string format: `postgresql+psycopg://user:password@host:port/dbname`.
- **Always** use Alembic for schema changes — never modify tables manually.
- Migration workflow:
  1. Edit the ORM model in `models/`.
  2. Run `alembic revision --autogenerate -m "description"`.
  3. Review the generated migration file before applying.
  4. Run `alembic upgrade head` to apply.
- Never run `alembic downgrade` in production without a backup.
- Import all models in `alembic/env.py` so autogenerate can detect them.

---

## 6. API Design Conventions

- Base URL structure: `/<resource>` (plural, lowercase, kebab-case if multi-word).
- Standard CRUD endpoints per resource:
  - `POST /<resource>` — create (201)
  - `GET /<resource>` — list all (200), support `skip` and `limit` query params
  - `GET /<resource>/{id}` — get by ID (200 or 404)
  - `PUT /<resource>/{id}` — full update (200 or 404)
  - `PATCH /<resource>/{id}` — partial update (200 or 404)
  - `DELETE /<resource>/{id}` — delete (204 or 404)
- Auth endpoints live under `/users`: `POST /users/register`, `POST /users/login`, `GET /users/me`.
- All responses use consistent JSON structure.
- Error responses use `HTTPException` with a `detail` message.
- Use `tags` on every router for Swagger UI grouping.

---

## 7. Environment & Dev Workflow

- Use a Python **virtual environment** (`venv/`) — never install globally.
- Run the dev server with: `uvicorn main:app --reload`.
- Swagger docs at: `http://127.0.0.1:8000/docs`.
- Pin all dependencies in `requirements.txt` with exact versions.
- When adding a new package: install it, then run `pip freeze > requirements.txt`.
- Keep `venv/`, `__pycache__/`, `.env` in `.gitignore`.

---

## 8. Testing Expectations

- Write tests for every new endpoint and CRUD function.
- Use `pytest` as the test runner.
- Use a separate test database — never run tests against the development DB.
- Test files go in a `tests/` directory, mirroring the project structure.
- Name test files `test_<module>.py` (e.g., `tests/test_users.py`).
- Test both success and error cases (invalid input, 404, 401).

---

## 9. Git & Version Control

- Commit messages follow conventional format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.
- Keep commits small and focused — one logical change per commit.
- Never commit generated files (`__pycache__/`, `alembic/versions/*.pyc`).
- Update `CHANGELOG.md` with each meaningful change.

10. Database Safety & Migration Rules

- Never delete existing database data under any circumstances.
- Never execute DELETE, TRUNCATE, DROP TABLE, database reset, or destructive seed operations.
- If database schema changes are required, always use safe, non-destructive migrations instead of deleting or recreating existing data.
- Preserve all existing records, relationships, and historical data during migrations.
- When adding or modifying columns, use backward-compatible schema changes wherever possible.
- Before executing any migration, review its impact on existing database data.
- Never modify or remove existing production or development data without explicit authorization.
- If a migration could cause data loss, stop and explain the risk before proceeding.
- Always verify database integrity after completing migrations.


# Frontend Architecture, Component Reusability & Performance Standards

These rules are mandatory for all frontend development, new features, bug fixes, and refactoring across:

- `admin-frontend`
- `student-portal`

The objective is to maintain a scalable, modular, reusable, responsive, and high-performance Student Management System.

## 1. Mandatory Project Analysis

Before implementing any new feature or making architectural changes:

- Inspect the existing project structure.
- Review navigation configurations and all routes.
- Review existing `page.tsx` files.
- Identify existing layouts and shared components.
- Inspect API services, React Query hooks, Zustand stores, types, and validation.
- Identify existing implementations before creating new ones.
- Reuse existing functionality wherever possible.

Never assume that a component, API, hook, or feature does not exist without checking the project.

## 2. Feature-Based Component Architecture

Organize components according to their business features.

Follow this architectural principle:

- Feature-specific components belong inside their respective feature.
- Components shared across multiple features belong in the common component layer.
- Application-level layouts and navigation belong in the layout layer.
- Shared business utilities and formatting functions should not be duplicated.

Suggested structure (adapt to the existing architecture):

```text
src/
├── app/
│   ├── (auth)/
│   └── (dashboard)/
│       ├── layout.tsx
│       └── ...
│
├── components/
│   ├── common/
│   │   ├── buttons/
│   │   ├── inputs/
│   │   ├── selects/
│   │   ├── dialogs/
│   │   ├── tables/
│   │   ├── filters/
│   │   ├── status/
│   │   ├── feedback/
│   │   ├── navigation/
│   │   ├── forms/
│   │   └── layout/
│   │
│   └── layouts/
│       ├── DashboardLayout/
│       ├── Sidebar/
│       └── Header/
│
├── features/
│   ├── students/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── teachers/
│   ├── parents/
│   ├── admissions/
│   ├── academics/
│   ├── grades/
│   ├── sections/
│   ├── subjects/
│   ├── timetable/
│   ├── attendance/
│   ├── calendar/
│   ├── leave-management/
│   ├── fees/
│   ├── payments/
│   └── authentication/
│
├── hooks/
├── services/
├── stores/
├── types/
├── utils/
└── theme/
```

This is a reference structure, not a requirement to restructure every existing folder. Follow the existing Next.js architecture and make changes only when they improve maintainability.

## 3. Common Reusable Components

Before creating a new component, check whether an existing common component can be reused or extended.

Examples of common components:

**UI Components**
- AppButton
- AppInput
- AppSelect
- AppDatePicker
- AppAutocomplete
- AppCheckbox
- AppRadioGroup
- AppTextarea
- AppModal
- AppDrawer
- AppTabs
- AppCard
- AppTooltip
- AppConfirmDialog

**Data Components**
- DataTable
- ServerSideDataTable
- SearchInput
- FilterPanel
- Pagination
- SortableTableHeader
- BulkActionToolbar

**Layout Components**
- AppPageHeader
- AppBreadcrumbs
- AppPageContainer
- DashboardLayout
- Sidebar
- Header

**Feedback Components**
- AppLoading
- AppSkeleton
- AppEmptyState
- AppErrorState
- AppStatusBadge
- AppAlert

**Form Components**
- FormField
- FormSection
- FormActions
- FormErrorMessage
- FormDialog

**Profile Components**
- ProfileHeader
- ProfileAvatar
- ProfileInformationCard
- ProfileSection
- ProfileTabs
- ActivityTimeline

Only implement components that have a genuine reuse requirement.

### Component Reusability Rules

1. If a component is used by multiple features, evaluate placing it in `components/common`.
2. If a component belongs to one feature, keep it inside that feature.
3. Do not duplicate components with the same responsibility.
4. Do not create common components only to reduce file length.
5. Avoid components with excessive unrelated props.
6. Use composition and clear TypeScript interfaces.
7. Keep business logic inside the feature layer.
8. Keep shared visual behavior inside common components.
9. Extend existing components instead of creating competing alternatives.
10. Do not force different business workflows into one generic component merely because their UI looks similar.

## 4. Page.tsx and Route Standards

Every `page.tsx` should primarily handle:

- Route-level composition.
- Route parameters and search parameters.
- Page-level authorization.
- Feature page rendering.
- Route-specific data coordination where appropriate.

Avoid placing large forms, tables, business logic, and complete feature implementations directly inside `page.tsx`.

Move substantial implementations into feature-specific components.

Before modifying navigation:
- Inspect all existing routes.
- Preserve existing URLs unless a change is approved.
- Maintain role-based navigation.
- Prevent unauthorized direct URL access.
- Reuse existing layouts between related pages.
- Avoid unnecessary redirects and route duplication.

Navigation visibility must never replace backend authorization.

## 5. API, State and Type Standards

Follow the existing technology stack:

- Next.js
- React
- TypeScript
- Material UI
- Axios
- TanStack React Query
- Zustand
- React Hook Form

Rules:

- Keep API requests in the appropriate service layer.
- Use React Query for server-state management.
- Use Zustand for appropriate shared client state.
- Avoid duplicating API request logic.
- Maintain consistent query keys.
- Use appropriate cache invalidation after mutations.
- Keep validation schemas organized.
- Maintain reusable TypeScript interfaces and types.
- Avoid unnecessary global state.
- Preserve existing authentication and token-handling behavior.

Do not introduce alternative libraries or replace existing technologies without approval.

## 6. Navigation and Page Switching Performance

**Priority: Reduce the time required to switch between pages across both portals.**

Always consider navigation performance when developing or refactoring pages.

- Avoid unnecessary full-page browser reloads.
- Use Next.js client-side navigation appropriately.
- Preserve shared layouts between route transitions.
- Prevent unnecessary remounting of sidebars, headers, and dashboard layouts.
- Avoid repeated initialization of common application data.
- Avoid unnecessary redirects.
- Use localized loading indicators.
- Prevent unnecessary loading screens and layout flickering.

## 7. API Performance and Caching

- Avoid duplicate API requests.
- Reuse React Query cached data where appropriate.
- Configure suitable `staleTime` and `gcTime`.
- Use consistent query keys.
- Prefetch data when it provides a meaningful navigation benefit.
- Use parallel requests for independent data.
- Avoid unnecessary refetching during navigation.
- Cancel obsolete requests when appropriate.
- Use pagination instead of fetching large datasets unnecessarily.
- Debounce search requests.

Never sacrifice data accuracy for caching.

Financial records, attendance, permissions, and other sensitive data must be refreshed or invalidated appropriately after relevant changes.

## 8. Component Rendering Performance

- Keep components lightweight and focused.
- Avoid unnecessary re-renders.
- Avoid unnecessary state updates.
- Use stable props and component boundaries.
- Use `React.memo`, `useMemo`, and `useCallback` only when beneficial.
- Lazy-load genuinely heavy components.
- Avoid loading unnecessary libraries.
- Avoid unnecessary client-side rendering.
- Prevent duplicate calculations and rendering work.

Do not apply memoization everywhere without measuring its benefits.

## 9. Next.js Performance Standards

Follow the installed Next.js version and existing rendering architecture.

- Use Server Components where appropriate.
- Avoid unnecessary `"use client"` declarations.
- Use dynamic imports for heavy components when appropriate.
- Apply Suspense and loading boundaries correctly.
- Optimize images, fonts, and assets.
- Avoid unnecessarily large initial JavaScript bundles.
- Use route-level code splitting.
- Avoid unnecessary client-side data fetching when an appropriate server-side approach already exists.

Do not change the application's rendering architecture without a clear technical reason.

## 10. Large Tables and Data Rendering

For Student Directory, Teacher Directory, Attendance, Fees, Payments, and Timetable:

- Prefer server-side pagination, sorting, and filtering for large datasets.
- Avoid rendering thousands of rows unnecessarily.
- Use virtualization when justified.
- Debounce search.
- Avoid reloading an entire table when only one record changes.
- Preserve existing filters, sorting, pagination, and selection.
- Avoid unnecessary recalculation of table columns and row data.

## 11. Responsive UI Standards

Every new page and shared component must support:

- Desktop.
- Tablet.
- Mobile.

Check:
- Sidebar and navigation behavior.
- Header responsiveness.
- Tables and horizontal overflow.
- Forms and dialogs.
- Cards and grids.
- Profile pages.
- Dashboard widgets.

Use the existing MUI theme and design system.

Do not independently change branding, colors, typography, spacing, or visual identity without approval.

## 12. Performance Measurement

For significant performance changes:

- Measure page navigation time.
- Inspect API request counts.
- Identify duplicate requests.
- Review route and bundle sizes.
- Inspect unnecessary component rendering.
- Check LCP, INP, and CLS where applicable.
- Compare before-and-after results.
- Test desktop and mobile navigation.

Optimize based on measured bottlenecks, not assumptions.

## 13. Database and Existing Functionality Protection

- Never delete existing database records.
- Never execute DROP, TRUNCATE, database reset, or destructive migrations.
- Do not introduce unnecessary database migrations.
- Do not remove existing features or routes.
- Do not break existing API contracts.
- Do not remove existing authorization or validation.
- Do not replace real data with dummy data.
- Do not introduce seed data without explicit approval.
- Preserve all existing business workflows.

Any required database change must be explained and approved before execution.

## 14. Mandatory Agent Skills Usage

Use the installed Addy's Agent Skills relevant to the task.

Read and follow their actual instruction files rather than merely mentioning their names.

Apply relevant skills such as:

- `using-agent-skills`
- `frontend-ui-engineering`
- `api-and-interface-design`
- `performance-optimization`
- `incremental-implementation`
- `context-engineering`
- `test-driven-development`
- `browser-testing-with-devtools`
- `code-review-and-quality`
- `code-simplification`

Use the appropriate lifecycle:

`/spec` → `/plan` → Approval → `/build` → `/test` → `/review`

If a slash command is unavailable, follow the corresponding installed skill instructions directly.

## 15. Mandatory Development Workflow

Before implementation:

1. Inspect existing implementations.
2. Identify reusable components.
3. Identify feature-specific components.
4. Identify duplicated logic.
5. Analyze navigation and performance.
6. Propose architectural improvements.
7. Present a file-by-file implementation plan.
8. Explain potential breaking changes and risks.

**Wait for approval before significant architectural restructuring, file movement, route changes, or database changes.**

Implement incrementally and test after each phase.

### Final Development Principle

Every new feature must follow these priorities:

1. Feature-based architecture.
2. Reusable common components.
3. Minimal code duplication.
4. Clear separation of UI and business logic.
5. Fast page navigation.
6. Minimal unnecessary API requests.
7. Efficient rendering.
8. Responsive design.
9. Secure and accurate data handling.
10. Maintainable, testable code.

**Do not build a new component, API, hook, or utility without first checking whether an appropriate implementation already exists.**