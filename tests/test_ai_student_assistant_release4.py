"""Automated Test Suite for AI Student Assistant (Release 4 - Proactive AI)

Covers:
1. TC-REL4-01: Proactive morning student briefing digest.
2. TC-REL4-02: Daily 1-minute knowledge challenge teaser.
3. TC-REL4-03: Subject strength and interest career discovery.
4. TC-REL4-04: In-chat natural language routing for proactive tools.
"""

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
from app.models.classroom import Subject
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment


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
def mock_student_setup(test_db):
    db = test_db

    student_user = User(
        id=uuid.uuid4(),
        email="ada.lovelace.rel4@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        student_code="STU-2026-REL401",
        enrollment_number="ENR-2026-REL401",
        first_name="Ada",
        last_name="Lovelace",
        dob=dt.date(2008, 12, 10),
        admission_date=dt.date(2026, 9, 1),
        class_name="Grade 10",
        section="10-A",
        department="Science",
    )
    db.add(student)
    db.flush()

    ay = AcademicYear(
        id=uuid.uuid4(),
        name="2026-2027",
        start_date=dt.date(2026, 6, 1),
        end_date=dt.date(2027, 5, 31),
        status="active",
        is_current=True,
    )
    db.add(ay)
    db.flush()

    grade = Grade(id=uuid.uuid4(), name="Grade 10", academic_year_id=ay.id)
    db.add(grade)
    db.flush()

    section = Section(id=uuid.uuid4(), name="10-A", grade_id=grade.id, academic_year_id=ay.id)
    db.add(section)
    db.flush()

    student.current_section_id = section.id

    enr = StudentEnrollment(
        id=uuid.uuid4(),
        student_id=student.id,
        grade_id=grade.id,
        section_id=section.id,
        academic_year_id=ay.id,
        status="ACTIVE",
    )
    db.add(enr)
    db.flush()

    sub_math = Subject(id=uuid.uuid4(), name="Mathematics", code="MATH-10")
    sub_cs = Subject(id=uuid.uuid4(), name="Computer Science", code="CS-10")
    db.add_all([sub_math, sub_cs])
    db.commit()

    return {
        "user": student_user,
        "student": student,
        "sub_math": sub_math,
        "sub_cs": sub_cs,
    }


@pytest.fixture(scope="function")
def client(test_db, mock_student_setup):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    def override_current_user():
        return mock_student_setup["user"]

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Release 4 Test Cases
# ---------------------------------------------------------------------------

def test_tc_rel4_01_morning_briefing(client):
    """TC-REL4-01: Verifies proactive morning student briefing digest."""
    res = client.get("/api/v1/student/assistant/briefing")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["student_name"] == "Ada"
    assert data["date_str"] == dt.date.today().isoformat()
    assert data["day_name"] == dt.date.today().strftime("%A")
    assert "classes_count" in data
    assert "inspirational_quote" in data
    assert "proactive_recommendation" in data
    assert isinstance(data["pending_fee_balance"], float)


def test_tc_rel4_02_daily_challenge(client):
    """TC-REL4-02: Verifies 1-minute daily curriculum brain teaser."""
    res = client.get("/api/v1/student/assistant/daily-challenge")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["challenge_id"]
    assert data["date_str"] == dt.date.today().isoformat()
    assert data["subject"]
    assert data["topic"]
    assert len(data["options"]) == 4
    assert 0 <= data["correct_option_index"] <= 3
    assert data["hint"]
    assert data["explanation"]


def test_tc_rel4_03_career_discovery(client):
    """TC-REL4-03: Verifies personalized career discovery pathways."""
    res = client.get("/api/v1/student/assistant/career-discovery?interests=artificial+intelligence")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["student_grade"] == "Grade 10"
    assert len(data["top_subjects"]) >= 1
    assert len(data["career_pathways"]) >= 3

    for p in data["career_pathways"]:
        assert p["title"]
        assert 70 <= p["match_score"] <= 100
        assert len(p["primary_subjects"]) >= 1
        assert len(p["university_degrees"]) >= 1
        assert len(p["key_skills"]) >= 1


def test_tc_rel4_04_in_chat_proactive_routing(client):
    """TC-REL4-04: Verifies natural language queries route to proactive tools."""
    # 1. Morning briefing query
    res_b = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "What is my morning briefing today?"},
    )
    assert res_b.status_code == 200
    db_data = res_b.json()
    assert "get_morning_briefing" in db_data["tools_used"]
    assert "Good Morning, Ada" in db_data["content"]

    # 2. Daily challenge query
    res_c = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "Give me the daily knowledge challenge"},
    )
    assert res_c.status_code == 200
    dc_data = res_c.json()
    assert "get_daily_challenge" in dc_data["tools_used"]
    assert "Daily Knowledge Challenge" in dc_data["content"]

    # 3. Career discovery query
    res_car = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "What career pathways match my subject strengths?"},
    )
    assert res_car.status_code == 200
    dcar_data = res_car.json()
    assert "discover_careers" in dcar_data["tools_used"]
    assert "Career Discovery & Pathways" in dcar_data["content"]


def test_tc_rel4_05_consolidated_insights_gateway(client):
    """TC-REL4-05: Verifies unified /insights dispatcher handles multiple query types."""
    # 1. Briefing insight
    res_b = client.get("/api/v1/student/assistant/insights?type=briefing")
    assert res_b.status_code == 200
    assert "student_name" in res_b.json()

    # 2. Daily challenge insight
    res_c = client.get("/api/v1/student/assistant/insights?type=daily-challenge")
    assert res_c.status_code == 200
    assert "question_text" in res_c.json()

    # 3. Career discovery insight
    res_car = client.get("/api/v1/student/assistant/insights?type=career-discovery&interests=technology")
    assert res_car.status_code == 200
    assert "career_pathways" in res_car.json()

    # 4. Suggestions insight
    res_s = client.get("/api/v1/student/assistant/insights?type=suggestions")
    assert res_s.status_code == 200
    assert len(res_s.json()) >= 4


def test_tc_rel4_06_consolidated_action_gateway(client):
    """TC-REL4-06: Verifies unified /action dispatcher executes interactive tasks."""
    # 1. Quiz generate action
    res_q = client.post(
        "/api/v1/student/assistant/action",
        json={"action": "quiz_generate", "payload": {"subject_name": "Mathematics", "question_count": 3}},
    )
    assert res_q.status_code == 200
    assert len(res_q.json()["questions"]) == 3

    # 2. Flashcards action
    res_f = client.post(
        "/api/v1/student/assistant/action",
        json={"action": "flashcards", "payload": {"subject_name": "Science", "card_count": 2}},
    )
    assert res_f.status_code == 200
    assert len(res_f.json()["cards"]) == 2

    # 3. Homework hint action
    res_h = client.post(
        "/api/v1/student/assistant/action",
        json={"action": "homework_hint", "payload": {"problem_text": "Calculate the force on a 5kg mass accelerating at 2m/s²"}},
    )
    assert res_h.status_code == 200
    assert "guidance" in res_h.json()

