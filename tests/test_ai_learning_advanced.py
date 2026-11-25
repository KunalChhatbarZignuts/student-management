import uuid
import datetime as dt
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
from app.models.academic_structure import AcademicYear, Grade, Section
from app.models.examination import Examination, ExaminationSchedule, StudentExamMark, StudentExamResult
from app.models.ai_learning import (
    SubjectChapter,
    ChapterTopic,
    AILearningRecommendation,
    AIDailyStudyPlan,
    AIStudyPlanItem,
    AIPracticeSession,
    AIPracticeQuestion,
    AIStudentStudySettings,
    AITopicMastery,
    AIStudentMistake,
    AIWeeklyStudyPlan,
    TopicMasteryLevel,
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
def setup_student(test_db):
    db = test_db

    user = User(
        id=uuid.uuid4(),
        email="learner.bob@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
        student_code="STU-2002",
        first_name="Bob",
        last_name="Smith",
        dob=dt.date(2008, 3, 15),
        class_name="Grade 10",
        section="B",
        department="Science",
        admission_date=dt.date(2024, 6, 1),
    )
    db.add(student)
    db.flush()

    math_subj = Subject(
        id=uuid.uuid4(),
        name="Mathematics",
        code="MATH-102",
        department="Science",
        status="active",
    )
    db.add(math_subj)
    db.flush()

    ch = SubjectChapter(
        id=uuid.uuid4(),
        subject_id=math_subj.id,
        chapter_number=1,
        title="Quadratic Equations",
        description="Roots and factoring of quadratics",
    )
    db.add(ch)
    db.flush()

    topic = ChapterTopic(
        id=uuid.uuid4(),
        chapter_id=ch.id,
        title="Factoring & Roots",
        learning_objective="Factor quadratic expressions",
        difficulty_level="MEDIUM",
        estimated_minutes=25,
    )
    db.add(topic)
    db.commit()

    return {"user": user, "student": student, "subject": math_subj, "chapter": ch, "topic": topic}


@pytest.fixture(scope="function")
def client(test_db, setup_student):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    def override_get_current_user():
        return setup_student["user"]

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_study_settings_get_and_update(client, setup_student, test_db):
    # GET default settings
    res = client.get("/api/v1/students/me/learning-assistant/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["weekday_daily_minutes"] == 45
    assert data["weekend_daily_minutes"] == 90
    assert data["preferred_study_time"] == "EVENING"

    # PUT update settings
    update_res = client.put(
        "/api/v1/students/me/learning-assistant/settings",
        json={
            "weekday_daily_minutes": 60,
            "weekend_daily_minutes": 120,
            "preferred_study_time": "NIGHT",
            "break_interval_minutes": 15,
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["weekday_daily_minutes"] == 60
    assert updated["weekend_daily_minutes"] == 120
    assert updated["preferred_study_time"] == "NIGHT"
    assert updated["break_interval_minutes"] == 15


def test_weekly_study_plan_generation(client, setup_student, test_db):
    res = client.get("/api/v1/students/me/learning-assistant/weekly-plan")
    assert res.status_code == 200
    data = res.json()
    assert "week_start_date" in data
    assert len(data["daily_plans"]) == 7
    assert data["total_planned_minutes"] > 0


def test_reschedule_study_plan_item(client, setup_student, test_db):
    # First get today's plan to discover an item
    today_res = client.get("/api/v1/students/me/learning-assistant/daily-plan")
    assert today_res.status_code == 200
    today_data = today_res.json()
    assert len(today_data["items"]) > 0

    target_item = today_data["items"][0]
    tomorrow = (dt.date.today() + dt.timedelta(days=1)).isoformat()

    # Reschedule item to tomorrow
    res = client.post(
        f"/api/v1/students/me/learning-assistant/daily-plan/items/{target_item['id']}/reschedule",
        json={"target_date": tomorrow},
    )
    assert res.status_code == 200
    rescheduled_plan = res.json()
    assert rescheduled_plan["plan_date"] == tomorrow
    assert any(i["id"] == target_item["id"] and i["is_rescheduled"] for i in rescheduled_plan["items"])


def test_practice_evaluation_and_mistake_bank(client, setup_student, test_db):
    student = setup_student["student"]
    chapter = setup_student["chapter"]

    # Generate practice session
    gen_res = client.post(
        "/api/v1/students/me/learning-assistant/practice/generate",
        json={"chapter_id": str(chapter.id), "difficulty": "MEDIUM", "num_questions": 2},
    )
    assert gen_res.status_code == 201
    session_data = gen_res.json()
    q_list = session_data["questions"]
    assert len(q_list) >= 2

    # Submit 1 correct, 1 incorrect
    submit_res = client.post(
        f"/api/v1/students/me/learning-assistant/practice/{session_data['session_id']}/submit",
        json={
            "answers": [
                {"question_id": q_list[0]["id"], "selected_option_index": 1},
                {"question_id": q_list[1]["id"], "selected_option_index": 3},  # Likely incorrect
            ]
        },
    )
    assert submit_res.status_code == 200
    eval_data = submit_res.json()
    assert "score_percentage" in eval_data
    assert len(eval_data["results"]) >= 2

    # Verify mistakes endpoint reflects incorrect answers
    mistakes_res = client.get("/api/v1/students/me/learning-assistant/mistakes")
    assert mistakes_res.status_code == 200
    mistakes = mistakes_res.json()
    assert isinstance(mistakes, list)

    if mistakes:
        m_id = mistakes[0]["id"]
        resolve_res = client.patch(
            f"/api/v1/students/me/learning-assistant/mistakes/{m_id}/resolve",
            json={"is_resolved": True},
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["is_resolved"] is True


def test_topic_mastery_matrix(client, setup_student, test_db):
    res = client.get("/api/v1/students/me/learning-assistant/mastery")
    assert res.status_code == 200
    data = res.json()
    assert "total_topics" in data
    assert data["total_topics"] >= 1
    assert "topics" in data


def test_concept_tutor_explain(client, setup_student, test_db):
    res = client.post(
        "/api/v1/students/me/learning-assistant/tutor/explain",
        json={
            "subject_name": "Mathematics",
            "topic_title": "Quadratic Equations & Factoring",
            "chapter_title": "Quadratic Equations",
            "specific_question": "How do I find roots using the quadratic formula?",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["subject_name"] == "Mathematics"
    assert "explanation_markdown" in data
    assert len(data["key_takeaways"]) > 0
