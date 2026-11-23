"""Automated Test Suite for AI Student Assistant (Release 3 - Interactive AI)

Covers:
1. TC-REL3-01: English grammar analysis, error explanation, and CEFR grading.
2. TC-REL3-02: Structured 3-round debate flow and final rubric scorecard.
3. TC-REL3-03: 2D interactive SVG concept map generator.
4. TC-REL3-04: Grounded class lecture notes and takeaways.
5. TC-REL3-05: In-chat natural language routing for interactive tools.
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
        email="ada.lovelace.rel3@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        student_code="STU-2026-REL301",
        enrollment_number="ENR-2026-REL301",
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
    sub_sci = Subject(id=uuid.uuid4(), name="Biology", code="BIO-10")
    db.add_all([sub_math, sub_sci])
    db.commit()

    return {
        "user": student_user,
        "student": student,
        "sub_math": sub_math,
        "sub_sci": sub_sci,
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
# Release 3 Test Cases
# ---------------------------------------------------------------------------

def test_tc_rel3_01_grammar_evaluation(client):
    """TC-REL3-01: Verifies English grammar evaluation, correction rules, and CEFR rating."""
    payload = {
        "student_text": "He go to school everyday and they goes together.",
        "target_grade_level": "Grade 10",
    }
    res = client.post("/api/v1/student/assistant/language/evaluate", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["original_text"] == payload["student_text"]
    assert "goes" in data["corrected_text"]
    assert len(data["corrections"]) >= 1
    assert data["cefr_level"] in ("A2", "B1", "B2", "C1")
    assert len(data["vocabulary_enhancements"]) >= 1
    assert "encouragement" in data


def test_tc_rel3_02_debate_round_progression(client):
    """TC-REL3-02: Verifies structured 3-round debate flow and final rubric scorecard."""
    topic = "Should Artificial Intelligence replace traditional homework?"

    # Round 1: Opening
    r1_payload = {
        "topic": topic,
        "stance": "affirmative",
        "current_round": 1,
        "student_argument": "AI provides instant personalized tutoring for every student regardless of background.",
    }
    res1 = client.post("/api/v1/student/assistant/debate/round", json=r1_payload)
    assert res1.status_code == 200, res1.text
    d1 = res1.json()
    assert d1["current_round"] == 1
    assert d1["is_concluded"] is False
    assert len(d1["suggested_rebuttal_points"]) >= 1
    assert d1["rubric_scorecard"] is None

    # Round 2: Rebuttal
    r2_payload = {
        "topic": topic,
        "stance": "affirmative",
        "current_round": 2,
        "student_argument": "While digital divide exists, mobile AI access is far cheaper than private human tutors.",
    }
    res2 = client.post("/api/v1/student/assistant/debate/round", json=r2_payload)
    assert res2.status_code == 200, res2.text
    d2 = res2.json()
    assert d2["current_round"] == 2
    assert d2["is_concluded"] is False

    # Round 3: Closing & Adjudication
    r3_payload = {
        "topic": topic,
        "stance": "affirmative",
        "current_round": 3,
        "student_argument": "In conclusion, AI enhances self-efficacy and democratizes educational access worldwide.",
    }
    res3 = client.post("/api/v1/student/assistant/debate/round", json=r3_payload)
    assert res3.status_code == 200, res3.text
    d3 = res3.json()
    assert d3["current_round"] == 3
    assert d3["is_concluded"] is True
    assert d3["rubric_scorecard"] is not None
    sc = d3["rubric_scorecard"]
    assert sc["total_score"] > 0
    assert len(sc["strengths"]) >= 1
    assert len(sc["areas_for_growth"]) >= 1


def test_tc_rel3_03_concept_map_generation(client):
    """TC-REL3-03: Verifies 2D interactive concept map generation with nodes and relations."""
    res = client.get("/api/v1/student/assistant/concept-map?topic=Photosynthesis&subject_name=Biology")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["root_topic"] == "Photosynthesis"
    assert data["subject"] == "Biology"
    assert len(data["nodes"]) >= 4
    assert len(data["edges"]) >= 3

    # Check node categories
    categories = {n["category"] for n in data["nodes"]}
    assert "root" in categories
    assert "primary" in categories

    # Verify edge linkages
    node_ids = {n["id"] for n in data["nodes"]}
    for edge in data["edges"]:
        assert edge["source"] in node_ids
        assert edge["target"] in node_ids
        assert edge["relationship"]


def test_tc_rel3_04_class_topic_notes(client):
    """TC-REL3-04: Verifies structured class lecture revision notes."""
    res = client.get("/api/v1/student/assistant/class-notes?subject_name=Mathematics")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["subject_name"] == "Mathematics"
    assert len(data["core_concepts"]) >= 1
    assert len(data["formulas_or_rules"]) >= 1
    assert len(data["homework_or_followup"]) >= 1
    assert "Class Revision Notes" in data["summary_markdown"]


def test_tc_rel3_05_in_chat_interactive_routing(client):
    """TC-REL3-05: Verifies natural language intent detection executes interactive tools in chat."""
    # 1. Grammar intent
    res_g = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "Please correct this sentence and check my english grammar: he go to school"},
    )
    assert res_g.status_code == 200
    dg = res_g.json()
    assert "evaluate_grammar" in dg["tools_used"]
    assert "English Language & Grammar Feedback" in dg["content"]

    # 2. Debate intent
    res_d = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "Let's debate about renewable energy vs fossil fuels, I am on affirmative side."},
    )
    assert res_d.status_code == 200
    dd = res_d.json()
    assert "debate_round" in dd["tools_used"]
    assert "AI Debate Partner" in dd["content"]

    # 3. Concept map intent
    res_m = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "Show me a visual concept map for photosynthesis"},
    )
    assert res_m.status_code == 200
    dm = res_m.json()
    assert "generate_concept_map" in dm["tools_used"]
    assert "Concept Map: Photosynthesis" in dm["content"]
