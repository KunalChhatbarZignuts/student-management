from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import _rate_limit_exceeded_handler, limiter
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
        "health": "/health",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    return {"status": "ok"}
