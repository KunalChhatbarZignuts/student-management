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
