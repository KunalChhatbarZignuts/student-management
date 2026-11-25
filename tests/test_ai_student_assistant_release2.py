import datetime as dt
import io
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from PIL import Image

import app.modules.models
from app.db.base import Base
from app.core.deps import get_db, get_current_user
from app.main import app
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.students.models import Student
from app.modules.academics.classroom_models import Subject
from app.modules.academics.structure_models import AcademicYear, Grade, Section, StudentEnrollment
from app.modules.examinations.models import Examination, ExaminationSchedule


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
        email="ada.lovelace@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        student_code="STU-2026-00001",
        enrollment_number="ENR-2026-00001",
        first_name="Ada",
        last_name="Lovelace",
        dob=dt.date(2008, 12, 10),
        admission_date=dt.date(2026, 9, 1),
        class_name="Grade 12",
        section="12-A",
        department="Computer Science",
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

    grade = Grade(id=uuid.uuid4(), name="Grade 12", academic_year_id=ay.id)
    db.add(grade)
    db.flush()

    section = Section(id=uuid.uuid4(), name="12-A", grade_id=grade.id, academic_year_id=ay.id)
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

    sub_math = Subject(id=uuid.uuid4(), name="Mathematics", code="MATH-101")
    sub_sci = Subject(id=uuid.uuid4(), name="Science", code="SCI-101")
    db.add_all([sub_math, sub_sci])
    db.flush()

    today = dt.date.today()
    exam = Examination(
        id=uuid.uuid4(),
        academic_year_id=ay.id,
        name="Term 2 Finals",
        exam_type="FINAL",
        term="Term 2",
        start_date=today + dt.timedelta(days=10),
        end_date=today + dt.timedelta(days=20),
        status="SCHEDULED",
    )
    db.add(exam)
    db.flush()

    sched = ExaminationSchedule(
        id=uuid.uuid4(),
        examination_id=exam.id,
        subject_id=sub_math.id,
        grade_id=grade.id,
        section_id=section.id,
        exam_date=today + dt.timedelta(days=10),
        start_time=dt.time(9, 0),
        end_time=dt.time(12, 0),
        max_marks=100.0,
        pass_marks=35.0,
        status="SCHEDULED",
    )
    db.add(sched)
    db.commit()

    return {
        "user": student_user,
        "student": student,
        "sub_math": sub_math,
        "sub_sci": sub_sci,
        "sched": sched,
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
# Release 2 Test Cases
# ---------------------------------------------------------------------------

def test_tc_rel2_01_quiz_generation(client):
    """TC-REL2-01: Generates curriculum-aligned practice quiz."""
    resp = client.post(
        "/api/v1/student/assistant/quiz/generate",
        json={
            "subject_name": "Mathematics",
            "chapter_title": "Linear Equations",
            "difficulty": "MEDIUM",
            "question_count": 3,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "quiz_id" in data
    assert data["subject_name"] == "Mathematics"
    assert len(data["questions"]) == 3
    assert len(data["questions"][0]["options"]) > 0


def test_tc_rel2_02_quiz_evaluation(client):
    """TC-REL2-02: Evaluates student answers and calculates score."""
    # 1. Generate quiz first
    gen_resp = client.post(
        "/api/v1/student/assistant/quiz/generate",
        json={"subject_name": "Science", "question_count": 2},
    )
    quiz_id = gen_resp.json()["quiz_id"]
    q1_id = gen_resp.json()["questions"][0]["id"]
    q2_id = gen_resp.json()["questions"][1]["id"]

    # 2. Submit answers
    eval_resp = client.post(
        "/api/v1/student/assistant/quiz/evaluate",
        json={
            "quiz_id": quiz_id,
            "answers": [
                {"question_id": q1_id, "selected_option_index": 1},
                {"question_id": q2_id, "selected_option_index": 2},
            ],
        },
    )
    assert eval_resp.status_code == 200
    data = eval_resp.json()
    assert data["total_questions"] == 2
    assert "score_percentage" in data
    assert len(data["feedback"]) == 2
    assert "recommendation" in data


def test_tc_rel2_03_flashcards_generation(client):
    """TC-REL2-03: Generates revision flashcards with hints."""
    resp = client.post(
        "/api/v1/student/assistant/flashcards/generate?subject_name=Mathematics&card_count=3"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["subject_name"] == "Mathematics"
    assert len(data["cards"]) == 3
    assert "front" in data["cards"][0]
    assert "back" in data["cards"][0]


def test_tc_rel2_04_exam_prep_plan(client):
    """TC-REL2-04: Generates countdown revision checklist from scheduled exams."""
    resp = client.get("/api/v1/student/assistant/exam-prep?subject_name=Mathematics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["days_remaining"] == 10
    assert len(data["checklist"]) > 0
    assert len(data["key_tips"]) > 0


def test_tc_rel2_05_homework_socratic_guidance(client):
    """TC-REL2-05: Returns Socratic hints without giving away answer."""
    resp = client.post(
        "/api/v1/student/assistant/homework-hint?problem_text=Find+the+roots+of+x%5E2+-+5x+%2B+6+%3D+0"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "guidance" in data
    assert "Step" in data["guidance"] or "Concept" in data["guidance"]


def test_tc_rel2_06_image_upload_validation(client):
    """TC-REL2-06: Processes valid image file and rejects unsupported format."""
    # 1. Valid PNG image
    img = Image.new("RGB", (200, 200), color="blue")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    resp = client.post(
        "/api/v1/student/assistant/upload-image",
        files={"file": ("math_problem.png", img_byte_arr, "image/png")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "step_by_step_solution" in data
    assert len(data["step_by_step_solution"]) > 0

    # 2. Unsupported format rejection
    bad_resp = client.post(
        "/api/v1/student/assistant/upload-image",
        files={"file": ("bad_script.sh", b"echo hacked", "text/x-shellscript")},
    )
    assert bad_resp.status_code == 400


def test_tc_rel2_07_document_upload_summarization(client):
    """TC-REL2-07: Summarizes uploaded notes document and extracts definitions."""
    sample_notes = (
        "Cell Biology Notes\n"
        "Mitochondria is the powerhouse of the cell producing ATP energy.\n"
        "Ribosomes synthesize proteins according to mRNA instructions.\n"
    ).encode("utf-8")

    resp = client.post(
        "/api/v1/student/assistant/upload-document",
        files={"file": ("biology_chapter1.txt", sample_notes, "text/plain")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert len(data["key_definitions"]) > 0
    assert len(data["revision_questions"]) > 0


def test_tc_rel2_08_in_chat_academic_intent_routing(client):
    """TC-REL2-08: In-chat message triggers interactive quiz generation."""
    resp = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "Can you generate a quiz for Mathematics?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "generate_quiz" in data["tools_used"]
    assert "Quiz" in data["content"] or "Question" in data["content"]
