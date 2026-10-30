---
name: fastapi-ops
description: >-
  Use this skill when developing, running, debugging, or adding endpoints, routers,
  schemas, or dependencies to this Python FastAPI Student Management project.
---

# FastAPI Operations & Development Guide

This skill guides the development and maintenance of the FastAPI application in the `student-management` project.

## Project Structure Conventions

Follow this standard layered architecture:
```text
student-management/
├── main.py                    # FastAPI app initialization, middleware, router inclusion
├── config.py                  # Pydantic Settings loaded from .env
├── database.py                # SQLAlchemy engine, SessionLocal, Base
├── dependencies.py            # Common dependencies (get_db, auth)
├── routers/                   # APIRouters grouped by resource (e.g., users, students, items)
├── schemas/                   # Pydantic request/response models
├── models/                    # SQLAlchemy ORM models
├── crud/                      # Database query operations per resource
└── requirements.txt           # Project dependencies
```

## Environment & Server Execution

### 1. Python Virtual Environment
Always execute Python commands using the project virtualenv:
```bash
# macOS/Linux
source venv/bin/activate
# or run directly with venv binary
./venv/bin/python ...
```

### 2. Starting the Development Server
Run Uvicorn with auto-reload:
```bash
./venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- Swagger Documentation: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Health check: `http://127.0.0.1:8000/health`

## Workflow for Adding a New Feature

When adding a new API resource (e.g., `students`):

1. **Model**: Create the SQLAlchemy model in `models/<resource>.py` subclassing `Base` from `database.py`.
2. **Schema**: Create Pydantic v2 schemas in `schemas/<resource>.py` (`<Resource>Base`, `<Resource>Create`, `<Resource>Update`, `<Resource>Response` with `model_config = ConfigDict(from_attributes=True)`).
3. **CRUD Operations**: Write query functions in `crud/<resource>.py` accepting `db: Session`.
4. **Router**: Create an `APIRouter(prefix="/<resource>", tags=["<Resource>"])` in `routers/<resource>.py`.
5. **Register Router**: Include the router in `main.py` via `app.include_router(...)`.
6. **Database Migration**: Generate and apply Alembic migrations (refer to `local-postgres-alembic` skill).

## Quality & Error Handling Checklist

- Use FastAPI's `HTTPException(status_code=..., detail=...)` for expected client errors (404 Not Found, 400 Bad Request, 401 Unauthorized).
- Always use `Depends(get_db)` to ensure database sessions are cleanly opened and closed per request.
- Never hardcode configuration settings or secrets; reference `config.settings`.
