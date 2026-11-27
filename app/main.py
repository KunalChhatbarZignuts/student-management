import datetime as dt
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.rate_limit import _rate_limit_exceeded_handler, limiter
from app.db.session import SessionLocal
from app.modules import (
    academics,
    ai,
    attendance,
    audit,
    auth,
    diary,
    examinations,
    fees,
    online_classroom,
    students,
    teachers,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Student Management System API",
    version="1.0.0",
)

# Attach slowapi rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.COOKIE_SECURE:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# GZip compression for payloads >= 1KB (70-85% size reduction)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include Domain Module Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(teachers.router, prefix="/api/v1")
app.include_router(academics.router, prefix="/api/v1")
app.include_router(attendance.router, prefix="/api/v1")
app.include_router(examinations.router, prefix="/api/v1")
app.include_router(fees.router, prefix="/api/v1")
app.include_router(diary.router, prefix="/api/v1")
app.include_router(online_classroom.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root() -> dict:
    return {
        "message": f"{settings.PROJECT_NAME} is running",
        "version": "1.0.0",
        "health": "/health",
        "readiness": "/health/ready",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    """Liveness probe: verifies the application process is running."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


@app.get("/health/ready", tags=["Health"])
@app.get("/ready", tags=["Health"])
def readiness_check(response: Response) -> dict:
    """Readiness probe: verifies database connectivity before routing traffic."""
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        return {
            "status": "ready",
            "database": "connected",
            "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        }
    except Exception as exc:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(exc),
            "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        }

