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
from app.modules.academics.classroom_models import Subject
from app.modules.academics.structure_models import AcademicYear, Grade, Section
from app.modules.examinations.models import Examination, ExaminationSchedule, StudentExamMark, StudentExamResult
from app.modules.ai.learning.models import (
    SubjectChapter,
    ChapterTopic,
    AILearningRecommendation,
    AIDailyStudyPlan,
    AIStudyPlanItem,
    AIPracticeSession,
    AIPracticeQuestion,
    RecommendationStatus,
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
def mock_student_setup(test_db):
    db = test_db

    # User & Student
    student_user = User(
        id=uuid.uuid4(),
        email="student.alice@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        student_code="STU-1001",
        first_name="Alice",
        last_name="Johnson",
        dob=dt.date(2008, 5, 12),
        class_name="Grade 10",
        section="A",
        department="General",
        admission_date=dt.date(2024, 6, 1),
    )
    db.add(student)
    db.flush()

    # Subjects
    math_subj = Subject(
        id=uuid.uuid4(),
        name="Mathematics",
        code="MATH-101",
        department="Science",
        status="active",
    )
    sci_subj = Subject(
        id=uuid.uuid4(),
        name="General Science",
        code="SCI-101",
        department="Science",
        status="active",
    )
    db.add_all([math_subj, sci_subj])
    db.flush()

    # Chapters & Topics
    ch_math = SubjectChapter(
        id=uuid.uuid4(),
        subject_id=math_subj.id,
        chapter_number=1,
        title="Linear Equations in Two Variables",
        description="Linear systems, graphing, substitution and elimination methods.",
        order_index=1,
    )
    db.add(ch_math)
    db.flush()

    top_math = ChapterTopic(
        id=uuid.uuid4(),
        chapter_id=ch_math.id,
        title="Simultaneous Linear Equations",
        learning_objective="Solve 2x2 systems using substitution.",
        difficulty_level="MEDIUM",
        estimated_minutes=25,
        order_index=1,
    )
    db.add(top_math)
    db.flush()

    # Academic Year
    ay = AcademicYear(
        id=uuid.uuid4(),
        name="2026-2027",
        start_date=dt.date(2026, 4, 1),
        end_date=dt.date(2027, 3, 31),
        is_current=True,
    )
    db.add(ay)
    db.flush()

    # Grade & Section
    grade = Grade(id=uuid.uuid4(), name="Grade 10", academic_year_id=ay.id)
    section = Section(id=uuid.uuid4(), name="A", grade_id=grade.id, academic_year_id=ay.id)
    db.add_all([grade, section])
    db.flush()

    # Examination
    exam = Examination(
        id=uuid.uuid4(),
        name="Mid-Term Examination 2026",
        academic_year_id=ay.id,
        term="Term 1",
        start_date=dt.date(2026, 9, 10),
        end_date=dt.date(2026, 9, 20),
        status="COMPLETED",
    )
    db.add(exam)
    db.flush()

    sched_math = ExaminationSchedule(
        id=uuid.uuid4(),
        examination_id=exam.id,
        grade_id=grade.id,
        section_id=section.id,
        subject_id=math_subj.id,
        exam_date=dt.date(2026, 9, 12),
        start_time=dt.time(9, 0),
        end_time=dt.time(12, 0),
        max_marks=100.0,
        pass_marks=35.0,
    )
    sched_sci = ExaminationSchedule(
        id=uuid.uuid4(),
        examination_id=exam.id,
        grade_id=grade.id,
        section_id=section.id,
        subject_id=sci_subj.id,
        exam_date=dt.date(2026, 9, 14),
        start_time=dt.time(9, 0),
        end_time=dt.time(12, 0),
        max_marks=100.0,
        pass_marks=35.0,
    )
    db.add_all([sched_math, sched_sci])
    db.flush()

    # Student Marks: Math = 48 (Critical/Weak), Science = 88 (Strong)
    mark_math = StudentExamMark(
        id=uuid.uuid4(),
        schedule_id=sched_math.id,
        student_id=student.id,
        marks_obtained=48.0,
        is_absent=False,
        grade="D",
        is_passed=True,
        status="PUBLISHED",
    )
    mark_sci = StudentExamMark(
        id=uuid.uuid4(),
        schedule_id=sched_sci.id,
        student_id=student.id,
        marks_obtained=88.0,
        is_absent=False,
        grade="A",
        is_passed=True,
        status="PUBLISHED",
    )
    res_overall = StudentExamResult(
        id=uuid.uuid4(),
        examination_id=exam.id,
        student_id=student.id,
        grade_id=grade.id,
        section_id=section.id,
        total_max_marks=200.0,
        total_obtained_marks=136.0,
        percentage=68.0,
        overall_grade="B",
        overall_result="PASS",
        status="PUBLISHED",
    )
    db.add_all([mark_math, mark_sci, res_overall])
    db.commit()

    return {
        "user": student_user,
        "student": student,
        "math_subject": math_subj,
        "sci_subject": sci_subj,
        "math_chapter": ch_math,
    }


def test_learning_overview_with_exam_data(test_db, mock_student_setup):
    """TC-AILA-01: Verify learning overview correctly identifies weak vs strong subjects from official marks."""
    user = mock_student_setup["user"]

    def override_get_db():
        yield test_db

    def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)
    response = client.get("/api/v1/students/me/learning-assistant/overview")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["student_name"] == "Alice Johnson"
    assert data["overall_exam_average"] == 68.0

    # Math should be in weak_subjects (score: 48)
    weak_names = [s["subject_name"] for s in data["weak_subjects"]]
    assert "Mathematics" in weak_names

    # Science should be in strong_subjects (score: 88)
    strong_names = [s["subject_name"] for s in data["strong_subjects"]]
    assert "General Science" in strong_names

    # Top recommendation should prioritize Mathematics
    assert data["top_recommendation"] is not None
    assert data["top_recommendation"]["subject_name"] == "Mathematics"

    # Data attribution boundary
    assert data["data_attribution"]["exam_source"] == "Verified Official School Examination Records"


def test_learning_subjects_analysis(test_db, mock_student_setup):
    """TC-AILA-03: Verify subjects analysis returns syllabus chapters and topics."""
    user = mock_student_setup["user"]

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    response = client.get("/api/v1/students/me/learning-assistant/subjects")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    subjects = response.json()
    assert len(subjects) >= 2

    math_entry = next(s for s in subjects if s["subject_name"] == "Mathematics")
    assert math_entry["official_exam_average"] == 48.0
    assert len(math_entry["chapters"]) >= 1
    assert math_entry["chapters"][0]["title"] == "Linear Equations in Two Variables"


def test_learning_path_and_recalculate(test_db, mock_student_setup):
    """TC-AILA-09: Verify recommendations fetch, status update, and recalculation."""
    user = mock_student_setup["user"]

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)

    # 1. Fetch path
    res = client.get("/api/v1/students/me/learning-assistant/learning-path")
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) >= 1
    rec_id = recs[0]["id"]

    # 2. Update status to IN_PROGRESS
    update_res = client.patch(
        f"/api/v1/students/me/learning-assistant/learning-path/recommendations/{rec_id}/status",
        json={"status": "IN_PROGRESS"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "IN_PROGRESS"

    # 3. Recalculate learning path
    recalc_res = client.post("/api/v1/students/me/learning-assistant/learning-path/recalculate")
    assert recalc_res.status_code == 200
    new_recs = recalc_res.json()
    assert len(new_recs) >= 1

    app.dependency_overrides.clear()


def test_daily_study_plan_flow(test_db, mock_student_setup):
    """TC-AILA-08: Verify daily plan item completion updates minutes and plan status."""
    user = mock_student_setup["user"]

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    plan_res = client.get("/api/v1/students/me/learning-assistant/daily-plan")
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert len(plan_data["items"]) >= 1

    first_item = plan_data["items"][0]
    item_id = first_item["id"]

    # Mark completed with 900 seconds spent (15 mins)
    patch_res = client.patch(
        f"/api/v1/students/me/learning-assistant/daily-plan/items/{item_id}",
        json={"is_completed": True, "additional_seconds_spent": 900}
    )
    assert patch_res.status_code == 200
    updated_plan = patch_res.json()
    assert updated_plan["completed_minutes"] >= first_item["duration_minutes"]

    app.dependency_overrides.clear()


def test_practice_generation_and_evaluation(test_db, mock_student_setup):
    """TC-AILA-10 & 11: Verify practice quiz generation, answer hiding, and submission scoring."""
    user = mock_student_setup["user"]
    chapter = mock_student_setup["math_chapter"]

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)

    # 1. Generate quiz
    gen_res = client.post(
        "/api/v1/students/me/learning-assistant/practice/generate",
        json={"chapter_id": str(chapter.id), "difficulty": "MEDIUM", "num_questions": 3}
    )
    assert gen_res.status_code == 201
    quiz = gen_res.json()
    assert quiz["session_id"] is not None
    assert len(quiz["questions"]) == 3

    # Answers must NOT be in public question payload
    for q in quiz["questions"]:
        assert "options" in q
        assert "correct_option_index" not in q
        assert "explanation" not in q

    session_id = quiz["session_id"]
    q1 = quiz["questions"][0]

    # 2. Submit answer
    submit_res = client.post(
        f"/api/v1/students/me/learning-assistant/practice/{session_id}/submit",
        json={"answers": [{"question_id": q1["id"], "selected_option_index": 1}]}
    )
    assert submit_res.status_code == 200
    eval_data = submit_res.json()
    assert "score_percentage" in eval_data
    assert "results" in eval_data
    assert len(eval_data["results"]) == 3
    # Check that explanation is revealed
    assert eval_data["results"][0]["explanation"] is not None

    # 3. Verify history
    hist_res = client.get("/api/v1/students/me/learning-assistant/history")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) >= 1
    assert hist[0]["session_id"] == session_id

    app.dependency_overrides.clear()


def test_chat_with_assistant(test_db, mock_student_setup):
    """TC-AILA-13: Verify conversational assistant provides context-aware tutoring."""
    user = mock_student_setup["user"]

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    chat_res = client.post(
        "/api/v1/students/me/learning-assistant/chat",
        json={"message": "Why is my Math score low?"}
    )
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert "Mathematics" in data["reply"] or "exam" in data["reply"].lower()
    assert len(data["suggested_actions"]) >= 1

    app.dependency_overrides.clear()


def test_unauthorized_role_access(test_db, mock_student_setup):
    """TC-AILA-06 & 07: Verify non-student users are forbidden."""
    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher@school.local",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    test_db.add(teacher_user)
    test_db.commit()

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: teacher_user

    client = TestClient(app)
    res = client.get("/api/v1/students/me/learning-assistant/overview")
    app.dependency_overrides.clear()

    # Must be 403 Forbidden because endpoint requires STUDENT role
    assert res.status_code == 403


def test_add_custom_study_plan_item(test_db, mock_student_setup):
    """TC-AILA-14: Verify 1-click scheduling of a weak-topic remediation session into today's study plan."""
    user = mock_student_setup["user"]

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)
    res = client.post(
        "/api/v1/students/me/learning-assistant/daily-plan/items",
        json={
            "subject_name": "Mathematics",
            "topic_title": "Quadratic Equations Diagnostic Focus",
            "duration_minutes": 25,
            "activity_type": "WEAK_TOPIC_REVISION"
        }
    )
    app.dependency_overrides.clear()

    assert res.status_code == 201
    data = res.json()
    item_titles = [i["topic_title"] for i in data["items"]]
    assert "Quadratic Equations Diagnostic Focus" in item_titles
    new_item = next(i for i in data["items"] if i["topic_title"] == "Quadratic Equations Diagnostic Focus")
    assert new_item["duration_minutes"] == 25
    assert new_item["activity_type"] == "WEAK_TOPIC_REVISION"
    assert not new_item["is_completed"]
