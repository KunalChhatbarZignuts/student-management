import datetime as dt
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models
from app.db.base import Base
from app.core.deps import get_db, get_current_user
from app.main import app
from app.models.user import User, UserRole, UserStatus
from app.models.student import Student
from app.models.academic import AttendanceRecord
from app.models.academic_structure import AcademicYear, Grade, Section
from app.services import ai_assistant_tools, ai_interactive_service, ai_proactive_service, ai_academic_service


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
def mock_empty_student_setup(test_db):
    """Creates a new student without enrollments, attendance, or fees."""
    db = test_db

    student_user = User(
        id=uuid.uuid4(),
        email="new_student@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        student_code="STU-NEW-001",
        enrollment_number="ENR-NEW-001",
        first_name="Grace",
        last_name="Hopper",
        dob=dt.date(2009, 1, 1),
        admission_date=dt.date(2026, 9, 1),
        class_name="Grade 10",
        section="A",
        department="Computer Science",
    )
    db.add(student)
    db.commit()
    db.refresh(student_user)
    db.refresh(student)

    return {"user": student_user, "student": student}


@pytest.fixture(scope="function")
def client(test_db, mock_empty_student_setup):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    def override_get_current_user():
        return mock_empty_student_setup["user"]

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_edge_01_zero_attendance_records_division_guard(test_db, mock_empty_student_setup):
    """Verifies that a student with 0 attendance records does not cause ZeroDivisionError."""
    student = mock_empty_student_setup["student"]
    res = ai_assistant_tools.tool_get_student_attendance(student, test_db)
    assert res["total_working_days"] == 0
    assert res["attended_days"] == 0
    assert res["attendance_percentage"] == 100.0
    assert res["status"] == "Good Standing"


def test_edge_02_student_without_active_enrollment(test_db, mock_empty_student_setup):
    """Verifies profile and timetable graceful degradation for student without active enrollment."""
    student = mock_empty_student_setup["student"]
    profile = ai_assistant_tools.tool_get_student_profile(student, test_db)
    assert profile["full_name"] == "Grace Hopper"
    assert profile["class_teacher"] == "Assigned Homeroom Teacher"

    timetable = ai_assistant_tools.tool_get_student_timetable(student, test_db)
    assert timetable["total_periods"] == 0
    assert timetable["is_scheduled"] is False


def test_edge_03_teacher_or_parent_role_forbidden(test_db):
    """Verifies non-student role (e.g. TEACHER) is denied access to student assistant endpoints."""
    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher_test@school.local",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    test_db.add(teacher_user)
    test_db.commit()

    def override_get_db():
        yield test_db

    def override_teacher_user():
        return teacher_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_teacher_user

    with TestClient(app) as test_client:
        res = test_client.get("/api/v1/student/assistant/insights?type=briefing")
        assert res.status_code == 403

    app.dependency_overrides.clear()


def test_edge_04_zero_byte_image_upload_validation(client):
    """Verifies that an empty (0-byte) image upload is rejected with HTTP 400."""
    files = {"file": ("empty.png", b"", "image/png")}
    res = client.post("/api/v1/student/assistant/upload-image", files=files)
    assert res.status_code == 400
    assert "empty (0 bytes)" in res.json()["detail"]


def test_edge_05_zero_byte_document_upload_validation(client):
    """Verifies that an empty (0-byte) document upload is rejected with HTTP 400."""
    files = {"file": ("empty.txt", b"", "text/plain")}
    res = client.post("/api/v1/student/assistant/upload-document", files=files)
    assert res.status_code == 400
    assert "empty (0 bytes)" in res.json()["detail"]


def test_edge_06_debate_out_of_bounds_round_handling():
    """Verifies debate rounds below 1 or above 3 are safely clamped."""
    # Round -5 clamped to 1
    res_low = ai_interactive_service.ai_interactive_service.progress_debate_round(
        topic="Renewable Energy", stance="affirmative", current_round=-5, student_argument="Solar is viable."
    )
    assert res_low.current_round == 1
    assert res_low.is_concluded is False

    # Round 10 clamped to 3 (final round)
    res_high = ai_interactive_service.ai_interactive_service.progress_debate_round(
        topic="Renewable Energy", stance="affirmative", current_round=10, student_argument="In conclusion, solar is sustainable."
    )
    assert res_high.current_round == 3
    assert res_high.is_concluded is True
    assert res_high.rubric_scorecard is not None


def test_edge_07_invalid_action_and_insight_payloads(client):
    """Verifies unknown action and insight types return clear HTTP 400 Bad Request."""
    # 1. Invalid insight type
    res_ins = client.get("/api/v1/student/assistant/insights?type=unsupported_insight_name")
    assert res_ins.status_code == 400
    assert "Unknown insight type" in res_ins.json()["detail"]

    # 2. Invalid action
    res_act = client.post(
        "/api/v1/student/assistant/action",
        json={"action": "unsupported_action_name", "payload": {}},
    )
    assert res_act.status_code == 400
    assert "Unknown action" in res_act.json()["detail"]


def test_edge_08_career_discovery_with_null_interests_and_no_subjects(test_db, mock_empty_student_setup):
    """Verifies career discovery generates fallback pathways when student has no enrolled subjects."""
    student = mock_empty_student_setup["student"]
    res = ai_proactive_service.ai_proactive_service.discover_career_pathways(
        db=test_db, student_id=student.id, interests=None
    )
    assert len(res.career_pathways) >= 3
    assert res.advice


def test_edge_09_quiz_evaluation_with_empty_answers():
    """Verifies evaluating a quiz with empty answers returns 0 score without exceptions."""
    quiz = ai_academic_service.generate_quiz("Mathematics", question_count=3)
    eval_res = ai_academic_service.evaluate_quiz(quiz.quiz_id, answers={})
    assert eval_res.correct_count == 0
    assert eval_res.score_percentage == 0.0
    assert eval_res.recommendation
