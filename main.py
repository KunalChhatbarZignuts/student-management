from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import courses, students


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if database connection is available
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"[Warning] Could not connect to database on startup: {exc}")
    yield


app = FastAPI(
    title="Student Management API",
    description="RESTful API for managing students, courses, and enrollments.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)
app.include_router(courses.router)


@app.get("/", tags=["Health"])
def root():
    return {"message": "Student Management API is running", "docs_url": "/docs"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
