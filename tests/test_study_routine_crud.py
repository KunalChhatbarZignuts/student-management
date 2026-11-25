import uuid
import datetime as dt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.models
from app.db.base import Base
from app.core.deps import get_db, get_current_user
from app.main import app
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.students.models import Student
from app.modules.academics.structure_models import AcademicYear, Grade, Section
from app.modules.ai.learning.models import (
    AIDailyStudyPlan,
    AIStudyPlanItem,
    AIStudySession,
    StudySessionStatus,
    RoutineActivityStatus,
    RoutineActivityPriority,
    RoutineActivityType,
)


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
def student_fixture(test_db):
    db = test_db
    user = User(
        id=uuid.uuid4(),
        email="routine.student@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
        student_code="STU-ROUTINE-01",
        first_name="Rohan",
        last_name="Verma",
        dob=dt.date(2010, 5, 15),
        class_name="Grade 10",
        section="A",
        department="General",
        admission_date=dt.date(2024, 6, 1),
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    db.refresh(user)
    return {"user": user, "student": student}


@pytest.fixture(scope="function")
def client(test_db, student_fixture):
    user = student_fixture["user"]

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_get_daily_routine_initialization(client):
    today_str = dt.date.today().isoformat()
    resp = client.get(f"/api/v1/students/me/learning-assistant/daily-routine?plan_date={today_str}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["plan_date"] == today_str
    assert "total_planned_minutes" in data
    assert "completed_minutes" in data
    assert "completion_percentage" in data
    assert "items" in data
    assert len(data["items"]) >= 1


def test_create_and_update_custom_activity(client):
    # 1. Create a custom activity
    payload = {
        "subject_name": "Mathematics",
        "topic_title": "Real Numbers & Rational Exponents",
        "title": "Practice Quiz on Exponents",
        "description": "Complete 15 practice questions from textbook exercises.",
        "activity_type": "PRACTICE_QUIZ",
        "duration_minutes": 25,
        "priority": "HIGH",
        "start_time": "18:00",
        "notes": "Focus on negative fractional exponents",
    }
    create_resp = client.post("/api/v1/students/me/learning-assistant/daily-routine/activities", json=payload)
    assert create_resp.status_code == 201
    routine = create_resp.json()
    assert routine["total_activities_count"] >= 1

    created_item = next(
        (i for i in routine["items"] if i["title"] == "Practice Quiz on Exponents"), None
    )
    assert created_item is not None
    assert created_item["is_custom"] is True
    assert created_item["priority"] == "HIGH"
    assert created_item["duration_minutes"] == 25
    assert created_item["notes"] == "Focus on negative fractional exponents"

    # 2. Update the activity
    item_id = created_item["id"]
    update_payload = {
        "title": "Advanced Practice Quiz on Exponents",
        "duration_minutes": 30,
        "priority": "HIGH",
        "notes": "Updated: Complete additional challenge problems",
    }
    update_resp = client.put(
        f"/api/v1/students/me/learning-assistant/daily-routine/activities/{item_id}",
        json=update_payload,
    )
    assert update_resp.status_code == 200
    updated_routine = update_resp.json()
    updated_item = next(i for i in updated_routine["items"] if i["id"] == item_id)
    assert updated_item["title"] == "Advanced Practice Quiz on Exponents"
    assert updated_item["duration_minutes"] == 30


def test_activity_status_transitions_and_completion_sync(client):
    # Add activity
    payload = {
        "subject_name": "Physics",
        "topic_title": "Newton's Laws of Motion",
        "duration_minutes": 20,
        "priority": "MEDIUM",
        "activity_type": "CONCEPT_LEARNING",
    }
    res = client.post("/api/v1/students/me/learning-assistant/daily-routine/activities", json=payload)
    assert res.status_code == 201
    item = next(i for i in res.json()["items"] if i["subject_name"] == "Physics")
    item_id = item["id"]

    # Toggle to IN_PROGRESS
    patch_resp = client.patch(
        f"/api/v1/students/me/learning-assistant/daily-routine/activities/{item_id}/status",
        json={"status": "IN_PROGRESS"},
    )
    assert patch_resp.status_code == 200
    item = next(i for i in patch_resp.json()["items"] if i["id"] == item_id)
    assert item["status"] == "IN_PROGRESS"
    assert item["is_completed"] is False

    # Mark COMPLETED with duration spent
    comp_resp = client.patch(
        f"/api/v1/students/me/learning-assistant/daily-routine/activities/{item_id}/status",
        json={"status": "COMPLETED", "additional_seconds_spent": 1200},
    )
    assert comp_resp.status_code == 200
    routine = comp_resp.json()
    item = next(i for i in routine["items"] if i["id"] == item_id)
    assert item["status"] == "COMPLETED"
    assert item["is_completed"] is True
    assert item["time_spent_seconds"] >= 1200
    assert routine["completed_minutes"] >= 20


def test_soft_delete_routine_activity(client):
    payload = {
        "subject_name": "Chemistry",
        "topic_title": "Periodic Table Elements",
        "duration_minutes": 15,
        "activity_type": "REVISION",
    }
    res = client.post("/api/v1/students/me/learning-assistant/daily-routine/activities", json=payload)
    item = next(i for i in res.json()["items"] if i["subject_name"] == "Chemistry")
    item_id = item["id"]

    del_resp = client.delete(f"/api/v1/students/me/learning-assistant/daily-routine/activities/{item_id}")
    assert del_resp.status_code == 200
    active_items = del_resp.json()["items"]
    assert not any(i["id"] == item_id for i in active_items)


def test_duplicate_routine_to_future_date(client):
    today = dt.date.today()
    tomorrow = today + dt.timedelta(days=1)

    # Ensure routine today has an activity
    payload = {
        "subject_name": "Biology",
        "topic_title": "Cell Structure & Function",
        "duration_minutes": 25,
        "activity_type": "READING",
    }
    client.post("/api/v1/students/me/learning-assistant/daily-routine/activities", json=payload)

    dup_payload = {
        "source_date": today.isoformat(),
        "target_date": tomorrow.isoformat(),
        "include_completed": True,
    }
    dup_resp = client.post("/api/v1/students/me/learning-assistant/daily-routine/duplicate", json=dup_payload)
    assert dup_resp.status_code == 200
    tomorrow_routine = dup_resp.json()
    assert tomorrow_routine["plan_date"] == tomorrow.isoformat()
    assert any(i["subject_name"] == "Biology" for i in tomorrow_routine["items"])


def test_focus_timer_lifecycle_and_single_active_constraint(client):
    # 1. Get routine and pick an activity
    today_str = dt.date.today().isoformat()
    resp = client.get(f"/api/v1/students/me/learning-assistant/daily-routine?plan_date={today_str}")
    item_id = resp.json()["items"][0]["id"]

    # 2. Check no active session initially
    active_resp = client.get("/api/v1/students/me/learning-assistant/study-sessions/active")
    assert active_resp.status_code == 200
    assert active_resp.json() is None

    # 3. Start a session
    start_payload = {"plan_item_id": item_id, "target_duration_seconds": 1500}
    start_resp = client.post("/api/v1/students/me/learning-assistant/study-sessions/start", json=start_payload)
    assert start_resp.status_code == 201
    session = start_resp.json()
    session_id = session["id"]
    assert session["status"] == "ACTIVE"
    assert session["plan_item_id"] == item_id

    # 4. Starting a second concurrent session must be rejected with 400
    second_start = client.post("/api/v1/students/me/learning-assistant/study-sessions/start", json=start_payload)
    assert second_start.status_code == 400
    assert "already running" in second_start.json()["detail"].lower()

    # 5. Active session retrieval reflects running session
    active_check = client.get("/api/v1/students/me/learning-assistant/study-sessions/active")
    assert active_check.status_code == 200
    assert active_check.json()["id"] == session_id
    assert active_check.json()["status"] == "ACTIVE"

    # 6. Pause session
    pause_resp = client.post(f"/api/v1/students/me/learning-assistant/study-sessions/{session_id}/pause")
    assert pause_resp.status_code == 200
    assert pause_resp.json()["status"] == "PAUSED"

    # 7. Resume session
    resume_resp = client.post(f"/api/v1/students/me/learning-assistant/study-sessions/{session_id}/resume")
    assert resume_resp.status_code == 200
    assert resume_resp.json()["status"] == "ACTIVE"

    # 8. Finish session explicitly with completion check
    finish_payload = {
        "mark_activity_completed": True,
        "notes": "Reviewed core concepts and completed practice problems.",
    }
    finish_resp = client.post(
        f"/api/v1/students/me/learning-assistant/study-sessions/{session_id}/finish",
        json=finish_payload,
    )
    assert finish_resp.status_code == 200
    finished_session = finish_resp.json()
    assert finished_session["status"] == "COMPLETED"
    assert finished_session["notes"] == "Reviewed core concepts and completed practice problems."

    # 9. Verify routine shows item completed and session no longer active
    active_after = client.get("/api/v1/students/me/learning-assistant/study-sessions/active")
    assert active_after.json() is None

    routine_after = client.get(f"/api/v1/students/me/learning-assistant/daily-routine?plan_date={today_str}").json()
    completed_item = next(i for i in routine_after["items"] if i["id"] == item_id)
    assert completed_item["is_completed"] is True
    assert completed_item["status"] == "COMPLETED"
