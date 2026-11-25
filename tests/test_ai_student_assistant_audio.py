import datetime as dt
import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.models
from app.db.base import Base
from app.core.deps import get_db, get_current_user
from app.main import app
from app.modules.students.models import Student
from app.modules.auth.models import User, UserRole, UserStatus

client = TestClient(app)

@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def mock_audio_student(test_db):
    user_id = uuid.uuid4()
    test_user = User(
        id=user_id,
        email="student_audio@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    test_student = Student(
        id=uuid.uuid4(),
        user_id=user_id,
        student_code="STU-2026-AUDIO",
        enrollment_number="ENR-2026-AUDIO",
        first_name="Audio",
        last_name="Student",
        dob=dt.date(2008, 1, 1),
        admission_date=dt.date(2026, 1, 1),
        class_name="Grade 10",
        section="A",
        department="Science",
    )
    test_db.add(test_user)
    test_db.add(test_student)
    test_db.commit()

    def override_get_db():
        yield test_db

    def override_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user
    yield test_user
    app.dependency_overrides.clear()


def test_transcribe_audio_empty_file_rejected(mock_audio_student):
    files = {"file": ("empty.webm", io.BytesIO(b""), "audio/webm")}
    resp = client.post("/api/v1/student/assistant/transcribe-audio", files=files)
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


def test_transcribe_audio_success_fallback(mock_audio_student):
    sample_audio = b"RIFF....WAVEfmt ....data...."
    files = {"file": ("recording.webm", io.BytesIO(sample_audio), "audio/webm")}
    resp = client.post("/api/v1/student/assistant/transcribe-audio", files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert "transcript" in data
    assert len(data["transcript"]) > 0
    assert data["confidence"] > 0
