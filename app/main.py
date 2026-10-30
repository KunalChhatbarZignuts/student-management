from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.v1 import (
    admin_students,
    admin_teachers,
    admin_users,
    applications,
    auth,
    bulk_import,
    parents,
    students,
    teachers,
)
from app.core.config import settings
from app.core.rate_limit import _rate_limit_exceeded_handler, limiter

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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(admin_students.router, prefix="/api/v1")
app.include_router(admin_teachers.router, prefix="/api/v1")
app.include_router(admin_users.router, prefix="/api/v1")
app.include_router(bulk_import.router, prefix="/api/v1")
app.include_router(parents.router, prefix="/api/v1")
app.include_router(teachers.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root() -> dict:
    return {
        "message": f"{settings.PROJECT_NAME} is running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    return {"status": "ok"}
