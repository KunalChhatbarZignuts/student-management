from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
import models
from routers import items, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist on startup if DB is reached
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"[Warning] Could not connect to database on startup: {exc}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI modular backend with JWT auth, SQLAlchemy ORM, and Alembic migrations.",
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

app.include_router(users.router)
app.include_router(items.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "message": f"{settings.PROJECT_NAME} is running",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
