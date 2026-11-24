# FastAPI Backend Engineering Rules & Best Practices

> **Scope**: Applies to all Python code in the backend (`app/`, `tests/`, migrations, and background scripts).  
> **Framework**: FastAPI (0.115+) | **ORM**: SQLAlchemy 2.0+ (Sync Engine) | **Driver**: psycopg | **Validation**: Pydantic v2

---

## 1. Async vs Sync Execution Standards

### The Golden Rule
| Endpoint Signature | Database / Task Type | How FastAPI Executes | When to Use |
| :--- | :--- | :--- | :--- |
| `def endpoint(...)` | Sync SQLAlchemy `Session`, file I/O, heavy computation | Worker Threadpool (non-blocking) | **Default choice** for all DB endpoints |
| `async def endpoint(...)` | WebSockets, async HTTP client (`httpx.AsyncClient`), `asyncio` | Event Loop | ONLY when all calls inside are awaitable |
| `async def` + blocking calls | Sync DB queries, `time.sleep()`, synchronous `requests` | Event Loop **(FROZEN)** | **STRICTLY FORBIDDEN (ANTI-PATTERN)** |

### Strict Rules:
1. **Never use `async def` with synchronous SQLAlchemy calls:**
   ```python
   # ❌ BAD: Freezes the entire asyncio event loop for all users!
   @router.get("/students")
   async def get_students(db: Session = Depends(get_db)):
       return db.query(Student).all()  # Blocking I/O inside async def!
   
   # ✅ GOOD: FastAPI runs regular def in an external thread pool
   @router.get("/students", response_model=list[StudentResponse])
   def get_students(db: Session = Depends(get_db)):
       return db.query(Student).all()
   ```
2. **When to use `async def`:**
   - WebSocket endpoints (e.g., `app/api/v1/online_classes.py` live classroom signaling).
   - Async background dispatchers using `asyncio.gather()` or async HTTP clients.
   - Streaming responses (`StreamingResponse` with an async generator).

---

## 2. Heavy Computations & Background Tasks

### Never Block the Main Server Thread
1. **Do not run CPU-bound loops inside request handlers:**
   - Avoid PDF generation, heavy report aggregation, image resizing, or password hash batching directly in endpoints.
2. **Use Background Tasks or Dedicated Task Queues:**
   - For fast, deferred jobs (sending single emails, logging audits): Use FastAPI's native `BackgroundTasks`.
   - For CPU-intensive or long-running jobs (bulk report generation, large export processing): Offload to Celery / worker processes.

```python
from fastapi import APIRouter, BackgroundTasks, Depends
from app.core.email import send_enrollment_email

@router.post("/enrollments", response_model=EnrollmentResponse)
def create_enrollment(
    data: EnrollmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    enrollment = crud_enrollment.create(db, data)
    # Offload non-blocking email notification after response returns
    background_tasks.add_task(send_enrollment_email, student_id=enrollment.student_id)
    return enrollment
```

---

## 3. Dependency Injection Standards

Keep controllers thin and logic reusable using FastAPI `Depends()`.

### Rules:
1. **Database Session**: Always inject `db: Session = Depends(get_db)` from `app.core.deps`.
2. **Authentication & Roles**:
   - Use `current_user: User = Depends(get_current_user)`.
   - For role-gated routes, use the reusable role validator `Depends(require_role(["admin", "teacher"]))`.
3. **Resource Existence Validation Dependencies**:
   Avoid repeating `if not item: raise HTTPException(404)` across multiple endpoints. Use reusable dependency functions:

```python
# app/core/deps.py or feature-specific dependencies
def get_student_or_404(student_id: int, db: Session = Depends(get_db)) -> Student:
    student = db.query(Student).filter(Student.id == student_id, Student.is_deleted == False).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

# Usage in router:
@router.get("/students/{student_id}", response_model=StudentResponse)
def get_student(student: Student = Depends(get_student_or_404)):
    return student

@router.put("/students/{student_id}", response_model=StudentResponse)
def update_student(
    data: StudentUpdate,
    student: Student = Depends(get_student_or_404),
    db: Session = Depends(get_db)
):
    return crud_student.update(db, db_obj=student, obj_in=data)
```

---

## 4. Never Make Users Wait: Background Execution

Any operation that does not directly influence the immediate HTTP status or response body MUST be queued.

### Execution Checklist:
- **Welcome / Invitation Emails**: Always queued in `BackgroundTasks`.
- **System Audit Logs**: Always queued or dispatched asynchronously.
- **Cache Eviction / Warmer**: Background tasks.
- **Classroom Attendance Batch Sync**: Non-blocking background sync.

```python
@router.post("/students", response_model=StudentResponse, status_code=201)
def register_student(
    data: StudentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    student = crud_student.create(db, data)
    # Instant response to user; heavy tasks happen in the background
    background_tasks.add_task(send_welcome_email, email=student.email)
    background_tasks.add_task(log_audit_event, action="student_registered", target_id=student.id)
    return student
```

---

## 5. API Documentation Security in Production

Swagger UI (`/docs`), ReDoc (`/redoc`), and OpenAPI schema (`/openapi.json`) expose the exact internal data structure, routes, and schemas. They must be restricted in production.

### Standard in `app/main.py`:
```python
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
)
```

---

## 6. Pydantic v2 Schema Architecture

All input validation and serialization must leverage Pydantic v2 features:

### Core Requirements:
1. **Model Configuration**: Always enable `from_attributes = True` for ORM compatibility.
2. **Trim Strings & Validate**: Strip whitespace by default on user input.
3. **Always specify `response_model`**: Protect against accidental data leakage (e.g. hashed passwords, internal flags).
4. **Custom Validators**: Use `@field_validator` with classmethod signature.

```python
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

class AppBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        populate_by_name=True,
    )

class StudentCreate(AppBaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    admission_number: str = Field(..., pattern=r"^[A-Z0-9-]+$")

    @field_validator("first_name", "last_name")
    @classmethod
    def capitalize_names(cls, v: str) -> str:
        return v.strip().title()

class StudentResponse(AppBaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    admission_number: str
    is_active: bool
```

---

## 7. Database Connection Lifecycle & Connection Pooling

### Rules for `app/db/session.py` and `app/core/deps.py`:
1. **Use Connection Pooling with Pre-Ping**:
   - `pool_pre_ping=True`: Ensures stale/closed connections are automatically verified and discarded before query execution.
   - `pool_size`: 10–20 connections per worker.
   - `max_overflow`: 10–20 burst connections.
   - `pool_recycle`: 300–3600 seconds to prevent silent disconnects behind AWS/PostgreSQL firewalls.
2. **Strict Session Lifecycle in `get_db()`**:
   Always use a generator with a `try ... finally` block. Sessions must close back into the pool.

```python
# app/core/deps.py
from collections.abc import Generator
from app.db.session import SessionLocal

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  # Guarantees connection returns to pool even on uncaught HTTP exceptions
```

---

## 8. Modern Lifespan Resource Management

Do NOT use deprecated `@app.on_event("startup")` or `@app.on_event("shutdown")`.  
Use the modern `@asynccontextmanager` lifespan handler on the `FastAPI` instance.

### Standard in `app/main.py`:
```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.session import engine

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # STARTUP: Verify DB connection pool, warm up caches, initialize clients
    logger.info("Starting up Student Management API...")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection pool verified.")
    except Exception as e:
        logger.error(f"Database connection error on startup: {e}")
        raise e

    yield  # Application processes requests

    # SHUTDOWN: Dispose connection pools and cleanup resources
    logger.info("Shutting down Student Management API...")
    engine.dispose()
    logger.info("Database pool disposed cleanly.")

app = FastAPI(lifespan=lifespan)
```

---

## 9. Zero Secret Hardcoding & Config Management

1. **All secrets MUST come from environment variables** via `pydantic-settings`.
2. **Never commit `.env` files** or real tokens to Git.
3. Every environment variable used in `app/core/config.py` MUST be documented in `.env.example`.
4. Fallback defaults for sensitive fields (e.g. `SECRET_KEY`, `POSTGRES_PASSWORD`) are forbidden in production.

```python
# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Student Management System"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
```

---

## 10. Structured Logging & Error Handling

### Logging Rules:
1. **Never use raw `print()` statements in production code.**
2. Use standard logging or structured JSON logging (Loguru / Python logging).
3. Log critical parameters, user identity (`user_id`), request paths, and execution errors.
4. Never log passwords, raw JWT tokens, credit card details, or sensitive personal data.

### Standard Global Exception Handler:
Ensure unhandled 500 errors return sanitized, consistent JSON rather than raw stack traces to users:
```python
@app.exception_handler(Exception)
def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact administrator."}
    )
```

---

## 11. Production Deployment & Health Monitoring

### Server Process Management:
- Run Uvicorn workers behind a process supervisor such as **Gunicorn** or container orchestrator.
- Formula for worker count: `Workers = (2 × CPU_CORES) + 1`
  ```bash
  gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
  ```

### Standard `/health` Endpoint:
Every deployment must have a lightweight `/health` probe that validates database connectivity for container health checks:
```python
@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Database unhealthy")
```
