import os
from collections.abc import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Use test database for test runs
TEST_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:password@localhost:5432/student_mgmt_test",
)

engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.core.deps import get_db
from app.core.rate_limit import limiter
from app.db.base import Base
from app.main import app as fastapi_app
import app.models  # noqa: F401


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all tables in the test database once per session, teardown afterwards."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Provide a database session for each test and roll it back."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Disable rate limiting during tests
    limiter.enabled = False

    # Override get_db dependency in FastAPI app
    def _override_get_db():
        try:
            yield session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = _override_get_db

    yield session

    fastapi_app.dependency_overrides.clear()
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db) -> Generator[TestClient, None, None]:
    """Provide a TestClient bound to the transactional DB session."""
    with TestClient(fastapi_app) as c:
        yield c
