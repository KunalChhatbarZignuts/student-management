import datetime as dt
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.models
from app.core.deps import get_current_user, get_db
from app.db.base import Base
from app.main import app
from app.modules.academics.structure_models import AcademicYear, Grade, Section
from app.modules.academics.classroom_models import Subject, TeacherAssignment
from app.modules.diary.models import DiaryAcknowledgement, DiaryConversation, DiaryEntry, DiaryEntryRecipient, DiaryMessage
from app.modules.students.parent_models import Parent, ParentStudentLink
from app.modules.students.models import Student
from app.modules.teachers.models import Teacher
from app.modules.auth.models import User, UserRole, UserStatus


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
def diary_seed(test_db):
    db = test_db

    # Academic Year, Grade, Section, Subject
    ay = AcademicYear(id=uuid.uuid4(), name="2026-2027", start_date=dt.date(2026, 6, 1), end_date=dt.date(2027, 4, 30), status="active")
    grade = Grade(id=uuid.uuid4(), name="Grade 10", level=10, academic_year_id=ay.id)
    section = Section(id=uuid.uuid4(), name="A", grade_id=grade.id, academic_year_id=ay.id, class_capacity=30)
    subject = Subject(id=uuid.uuid4(), name="Mathematics", code="MATH10", department="Science")
    db.add_all([ay, grade, section, subject])
    db.flush()

    # Teacher
    t_user = User(
        id=uuid.uuid4(),
        email="teacher.diary@school.local",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(t_user)
    db.flush()
    teacher = Teacher(
        id=uuid.uuid4(),
        employee_code="EMP-T-01",
        user_id=t_user.id,
        first_name="Anita",
        last_name="Sharma",
        phone="9876543210",
        department="Science",
    )
    db.add(teacher)
    db.flush()

    # Teacher assignment
    t_assign = TeacherAssignment(
        teacher_id=teacher.id,
        section_id=section.id,
        subject_id=subject.id,
        assignment_type="CLASS_TEACHER",
        is_class_teacher=True,
        academic_year="2026-2027",
        status="active",
    )
    db.add(t_assign)

    # Student 1
    s_user1 = User(
        id=uuid.uuid4(),
        email="student.aarav@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(s_user1)
    db.flush()
    student1 = Student(
        id=uuid.uuid4(),
        user_id=s_user1.id,
        student_code="STU-D-01",
        first_name="Aarav",
        last_name="Patel",
        dob=dt.date(2010, 8, 12),
        class_name="Grade 10",
        section="A",
        current_grade_id=grade.id,
        current_section_id=section.id,
        department="Science",
        admission_date=dt.date(2024, 6, 1),
    )
    db.add(student1)

    # Student 2
    s_user2 = User(
        id=uuid.uuid4(),
        email="student.diya@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(s_user2)
    db.flush()
    student2 = Student(
        id=uuid.uuid4(),
        user_id=s_user2.id,
        student_code="STU-D-02",
        first_name="Diya",
        last_name="Shah",
        dob=dt.date(2010, 11, 20),
        class_name="Grade 10",
        section="A",
        current_grade_id=grade.id,
        current_section_id=section.id,
        department="Science",
        admission_date=dt.date(2024, 6, 1),
    )
    db.add(student2)
    db.flush()

    # Parent for Student 1
    p_user = User(
        id=uuid.uuid4(),
        email="parent.patel@school.local",
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(p_user)
    db.flush()
    parent = Parent(
        id=uuid.uuid4(),
        user_id=p_user.id,
        first_name="Vikram",
        last_name="Patel",
        phone="9988776655",
    )
    db.add(parent)
    db.flush()

    # Link parent to Student 1
    link = ParentStudentLink(
        parent_id=parent.id,
        student_id=student1.id,
        relationship_type="Father",
        is_primary_guardian=True,
        verification_status="verified",
        status="active",
    )
    db.add(link)
    db.commit()

    return {
        "teacher_user": t_user,
        "teacher": teacher,
        "student1_user": s_user1,
        "student1": student1,
        "student2_user": s_user2,
        "student2": student2,
        "parent_user": p_user,
        "parent": parent,
        "grade": grade,
        "section": section,
        "subject": subject,
    }


def test_diary_teacher_create_and_list_entries(test_db, diary_seed):
    t_user = diary_seed["teacher_user"]
    sec = diary_seed["section"]
    subj = diary_seed["subject"]
    st1 = diary_seed["student1"]

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_current_user] = lambda: t_user

    client = TestClient(app)

    # 1. Fetch teacher context
    ctx_res = client.get("/api/v1/diary/teacher-context")
    assert ctx_res.status_code == 200
    ctx_data = ctx_res.json()
    assert len(ctx_data["sections"]) >= 1
    assert len(ctx_data["subjects"]) >= 1

    # 2. Create published diary entry for section
    entry_payload = {
        "title": "Algebra Chapter 2 Practice Set",
        "description": "Complete problems 1 to 15 on page 42.",
        "entry_type": "HOMEWORK",
        "category": "Math",
        "entry_date": str(dt.date.today()),
        "due_date": str(dt.date.today() + dt.timedelta(days=2)),
        "section_id": str(sec.id),
        "subject_id": str(subj.id),
        "visibility": "STUDENT_AND_PARENT",
        "requires_acknowledgement": True,
        "is_conversation_allowed": True,
        "status": "PUBLISHED",
        "internal_notes": "Follow up with Aarav on step 3",
        "attachments": [{"name": "worksheet_ex2.pdf", "url": "/docs/ws2.pdf", "file_type": "pdf", "file_size": 1024}],
    }
    create_res = client.post("/api/v1/diary/entries", json=entry_payload)
    assert create_res.status_code == 201
    entry_id = create_res.json()["id"]

    # 3. List teacher entries
    list_res = client.get("/api/v1/diary/entries")
    assert list_res.status_code == 200
    entries = list_res.json()["entries"]
    assert len(entries) == 1
    assert entries[0]["title"] == "Algebra Chapter 2 Practice Set"
    assert entries[0]["requires_acknowledgement"] is True
    assert entries[0]["internal_notes"] == "Follow up with Aarav on step 3"
    assert entries[0]["total_recipients"] == 2  # Both students in Section A

    # 4. Inspect recipients
    rec_res = client.get(f"/api/v1/diary/entries/{entry_id}/recipients")
    assert rec_res.status_code == 200
    rec_list = rec_res.json()
    assert len(rec_list) == 2
    assert any(r["student_name"] == "Aarav Patel" for r in rec_list)

    app.dependency_overrides.clear()


def test_diary_student_feed_and_read_marker(test_db, diary_seed):
    t_user = diary_seed["teacher_user"]
    s_user1 = diary_seed["student1_user"]
    st1 = diary_seed["student1"]
    sec = diary_seed["section"]

    app.dependency_overrides[get_db] = lambda: test_db

    # Teacher creates an entry
    app.dependency_overrides[get_current_user] = lambda: t_user
    client = TestClient(app)
    create_res = client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Science Lab Notice",
            "description": "Bring lab coat on Thursday.",
            "entry_type": "NOTICE",
            "entry_date": str(dt.date.today()),
            "section_id": str(sec.id),
            "visibility": "STUDENT_AND_PARENT",
            "status": "PUBLISHED",
        },
    )
    entry_id = create_res.json()["id"]

    # Teacher creates a parent-only private remark (should NOT be visible to student)
    client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Private Discipline Remark",
            "description": "Needs attention regarding homework submission.",
            "entry_type": "BEHAVIOUR",
            "entry_date": str(dt.date.today()),
            "student_ids": [str(st1.id)],
            "visibility": "PARENT_ONLY",
            "status": "PUBLISHED",
        },
    )

    # Student 1 logs in
    app.dependency_overrides[get_current_user] = lambda: s_user1
    stu_res = client.get("/api/v1/diary/student/entries")
    assert stu_res.status_code == 200
    stu_entries = stu_res.json()["entries"]

    # Student should ONLY see the 1 entry with STUDENT_AND_PARENT visibility
    assert len(stu_entries) == 1
    assert stu_entries[0]["title"] == "Science Lab Notice"
    assert stu_entries[0]["internal_notes"] is None  # Scrubbed from student
    assert stu_entries[0]["is_read_by_student"] is False

    # Mark as read
    read_res = client.post(f"/api/v1/diary/student/entries/{entry_id}/read")
    assert read_res.status_code == 200

    # Verify marked as read
    stu_res2 = client.get("/api/v1/diary/student/entries")
    assert stu_res2.json()["entries"][0]["is_read_by_student"] is True

    app.dependency_overrides.clear()


def test_diary_parent_feed_acknowledge_and_conversation(test_db, diary_seed):
    t_user = diary_seed["teacher_user"]
    p_user = diary_seed["parent_user"]
    st1 = diary_seed["student1"]
    sec = diary_seed["section"]

    app.dependency_overrides[get_db] = lambda: test_db

    # Teacher posts an important homework requiring parent acknowledgement
    app.dependency_overrides[get_current_user] = lambda: t_user
    client = TestClient(app)
    create_res = client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Project Submission Checkpoint",
            "description": "Please verify your child has completed Phase 1.",
            "entry_type": "HOMEWORK",
            "entry_date": str(dt.date.today()),
            "section_id": str(sec.id),
            "visibility": "STUDENT_AND_PARENT",
            "requires_acknowledgement": True,
            "is_conversation_allowed": True,
            "status": "PUBLISHED",
        },
    )
    entry_id = create_res.json()["id"]

    # Parent logs in and views diary
    app.dependency_overrides[get_current_user] = lambda: p_user
    p_res = client.get(f"/api/v1/diary/parent/entries?student_id={st1.id}")
    assert p_res.status_code == 200
    p_entries = p_res.json()["entries"]
    assert len(p_entries) == 1
    assert p_entries[0]["title"] == "Project Submission Checkpoint"
    assert p_entries[0]["is_acknowledged"] is False

    # Parent acknowledges entry
    ack_res = client.post(
        f"/api/v1/diary/parent/entries/{entry_id}/acknowledge",
        json={"student_id": str(st1.id), "notes": "Reviewed and checked with Aarav."},
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["parent_name"] == "Vikram Patel"

    # Verify acknowledgement is reflected in parent list
    p_res2 = client.get(f"/api/v1/diary/parent/entries?student_id={st1.id}")
    assert p_res2.json()["entries"][0]["is_acknowledged"] is True

    # Parent opens a 1-on-1 conversation thread with teacher
    conv_init = client.post(
        f"/api/v1/diary/conversations?entry_id={entry_id}&student_id={st1.id}"
    )
    assert conv_init.status_code == 200
    conv_id = conv_init.json()["conversation_id"]

    # Parent sends a query message
    msg_res = client.post(
        f"/api/v1/diary/conversations/{conv_id}/messages",
        json={"message": "Does Phase 1 include the bibliography?", "attachments": []},
    )
    assert msg_res.status_code == 200
    assert msg_res.json()["sender_role"] == "PARENT"
    assert msg_res.json()["sender_name"] == "Vikram Patel"

    # Teacher logs in and replies
    app.dependency_overrides[get_current_user] = lambda: t_user
    t_msg_res = client.post(
        f"/api/v1/diary/conversations/{conv_id}/messages",
        json={"message": "Yes, standard APA bibliography is expected.", "attachments": []},
    )
    assert t_msg_res.status_code == 200
    assert t_msg_res.json()["sender_role"] == "TEACHER"

    # Teacher resolves the conversation thread
    res_conv = client.post(
        f"/api/v1/diary/conversations/{conv_id}/resolve?close=false",
        json={"resolution_notes": "Clarified bibliography requirements."},
    )
    assert res_conv.status_code == 200
    assert res_conv.json()["status"] == "RESOLVED"

    # Fetch conversation history
    thread_res = client.get(f"/api/v1/diary/conversations/{conv_id}")
    assert thread_res.status_code == 200
    thread_data = thread_res.json()
    assert thread_data["status"] == "RESOLVED"
    assert len(thread_data["messages"]) == 2
    assert thread_data["resolution_notes"] == "Clarified bibliography requirements."

    app.dependency_overrides.clear()


def test_diary_retract_and_authorization_guards(test_db, diary_seed):
    t_user = diary_seed["teacher_user"]
    p_user = diary_seed["parent_user"]
    st2 = diary_seed["student2"]  # Not linked to this parent!
    sec = diary_seed["section"]

    app.dependency_overrides[get_db] = lambda: test_db

    # Teacher posts an entry
    app.dependency_overrides[get_current_user] = lambda: t_user
    client = TestClient(app)
    create_res = client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Field Trip Note",
            "description": "Please sign consent form.",
            "entry_type": "NOTICE",
            "entry_date": str(dt.date.today()),
            "section_id": str(sec.id),
            "visibility": "STUDENT_AND_PARENT",
            "requires_acknowledgement": True,
            "status": "PUBLISHED",
        },
    )
    entry_id = create_res.json()["id"]

    # Parent tries to acknowledge for Student 2 (NOT linked to parent -> 403)
    app.dependency_overrides[get_current_user] = lambda: p_user
    unauth_ack = client.post(
        f"/api/v1/diary/parent/entries/{entry_id}/acknowledge",
        json={"student_id": str(st2.id), "notes": "Hacking ack"},
    )
    assert unauth_ack.status_code == 403

    # Teacher retracts the entry
    app.dependency_overrides[get_current_user] = lambda: t_user
    retract_res = client.post(
        f"/api/v1/diary/entries/{entry_id}/retract",
        json={"reason": "Trip postponed due to weather."},
    )
    assert retract_res.status_code == 200
    assert retract_res.json()["status"] == "RETRACTED"

    # Check notification for parent
    app.dependency_overrides[get_current_user] = lambda: p_user
    notif_res = client.get("/api/v1/diary/notifications")
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert len(notifs) >= 1

    # Mark notifications as read
    mark_res = client.post("/api/v1/diary/notifications/mark-read")
    assert mark_res.status_code == 200

    app.dependency_overrides.clear()


def test_draft_entries_not_leaked_to_students_or_parents(test_db, diary_seed):
    t_user = diary_seed["teacher_user"]
    s_user1 = diary_seed["student1_user"]
    p_user = diary_seed["parent_user"]
    st1 = diary_seed["student1"]
    sec = diary_seed["section"]

    app.dependency_overrides[get_db] = lambda: test_db

    # 1. Teacher creates draft
    app.dependency_overrides[get_current_user] = lambda: t_user
    client = TestClient(app)
    draft_res = client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Secret Upcoming Test Draft",
            "description": "Questions on thermodynamics.",
            "entry_type": "NOTICE",
            "entry_date": str(dt.date.today()),
            "section_id": str(sec.id),
            "visibility": "STUDENT_AND_PARENT",
            "requires_acknowledgement": True,
            "status": "DRAFT",
        },
    )
    assert draft_res.status_code == 201
    entry_id = draft_res.json()["id"]

    # 2. Student queries feed -> Draft must NOT appear
    app.dependency_overrides[get_current_user] = lambda: s_user1
    stu_res = client.get("/api/v1/diary/student/entries")
    assert stu_res.status_code == 200
    assert not any(e["id"] == entry_id for e in stu_res.json()["entries"])

    # 3. Parent queries feed -> Draft must NOT appear
    app.dependency_overrides[get_current_user] = lambda: p_user
    p_res = client.get(f"/api/v1/diary/parent/entries?student_id={st1.id}")
    assert p_res.status_code == 200
    assert not any(e["id"] == entry_id for e in p_res.json()["entries"])

    # 4. Parent tries to acknowledge draft -> 404
    ack_res = client.post(
        f"/api/v1/diary/parent/entries/{entry_id}/acknowledge",
        json={"student_id": str(st1.id)},
    )
    assert ack_res.status_code == 404

    # 5. Teacher publishes draft
    app.dependency_overrides[get_current_user] = lambda: t_user
    pub_res = client.post(f"/api/v1/diary/entries/{entry_id}/publish")
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"

    # 6. Now both student and parent can view it
    app.dependency_overrides[get_current_user] = lambda: s_user1
    stu_res2 = client.get("/api/v1/diary/student/entries")
    assert any(e["id"] == entry_id for e in stu_res2.json()["entries"])

    app.dependency_overrides[get_current_user] = lambda: p_user
    p_res2 = client.get(f"/api/v1/diary/parent/entries?student_id={st1.id}")
    assert any(e["id"] == entry_id for e in p_res2.json()["entries"])

    app.dependency_overrides.clear()


def test_closed_conversation_rejects_further_messages(test_db, diary_seed):
    t_user = diary_seed["teacher_user"]
    p_user = diary_seed["parent_user"]
    st1 = diary_seed["student1"]
    sec = diary_seed["section"]

    app.dependency_overrides[get_db] = lambda: test_db
    client = TestClient(app)

    # Teacher creates published entry
    app.dependency_overrides[get_current_user] = lambda: t_user
    c_res = client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Discussion Check",
            "description": "Notice for chat closure testing.",
            "entry_type": "GENERAL",
            "section_id": str(sec.id),
            "status": "PUBLISHED",
        },
    )
    entry_id = c_res.json()["id"]

    # Open conversation
    app.dependency_overrides[get_current_user] = lambda: p_user
    conv_res = client.post(f"/api/v1/diary/conversations?entry_id={entry_id}&student_id={st1.id}")
    conv_id = conv_res.json()["conversation_id"]

    # Post message
    msg_res = client.post(
        f"/api/v1/diary/conversations/{conv_id}/messages",
        json={"message": "First query"},
    )
    assert msg_res.status_code == 200

    # Teacher permanently closes the conversation
    app.dependency_overrides[get_current_user] = lambda: t_user
    res_close = client.post(
        f"/api/v1/diary/conversations/{conv_id}/resolve?close=true",
        json={"resolution_notes": "Issue concluded permanently."},
    )
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "CLOSED"

    # Parent attempts to send a message on closed conversation -> 400
    app.dependency_overrides[get_current_user] = lambda: p_user
    blocked_res = client.post(
        f"/api/v1/diary/conversations/{conv_id}/messages",
        json={"message": "Can I still ask something?"},
    )
    assert blocked_res.status_code == 400
    assert "closed conversation" in blocked_res.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_section_scoping_and_update_lifecycle(test_db, diary_seed):
    t_user = diary_seed["teacher_user"]
    s_user1 = diary_seed["student1_user"]
    grade = diary_seed["grade"]
    sec = diary_seed["section"]

    # Create Section B and Student in Section B
    db = test_db
    sec_b = Section(id=uuid.uuid4(), name="B", grade_id=grade.id, academic_year_id=grade.academic_year_id, class_capacity=30)
    db.add(sec_b)
    s_user_b = User(
        id=uuid.uuid4(),
        email="student.secb@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(s_user_b)
    db.flush()
    student_b = Student(
        id=uuid.uuid4(),
        user_id=s_user_b.id,
        student_code="STU-B-01",
        first_name="Karan",
        last_name="Mehta",
        dob=dt.date(2010, 3, 25),
        class_name="Grade 10",
        section="B",
        current_grade_id=grade.id,
        current_section_id=sec_b.id,
        department="Science",
        admission_date=dt.date(2024, 6, 1),
    )
    db.add(student_b)
    db.commit()

    app.dependency_overrides[get_db] = lambda: test_db
    client = TestClient(app)

    # Teacher posts an entry ONLY for Section B
    app.dependency_overrides[get_current_user] = lambda: t_user
    create_res = client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Section B Exclusive Project",
            "description": "Physics Experiment 4.",
            "entry_type": "HOMEWORK",
            "section_id": str(sec_b.id),
            "status": "PUBLISHED",
        },
    )
    entry_id = create_res.json()["id"]

    # Student 1 in Section A checks feed -> Should NOT receive it
    app.dependency_overrides[get_current_user] = lambda: s_user1
    feed_res = client.get("/api/v1/diary/student/entries")
    assert not any(e["id"] == entry_id for e in feed_res.json()["entries"])

    # Student in Section B checks feed -> Should receive it
    app.dependency_overrides[get_current_user] = lambda: s_user_b
    feed_b = client.get("/api/v1/diary/student/entries")
    assert any(e["id"] == entry_id for e in feed_b.json()["entries"])

    # Teacher updates entry
    app.dependency_overrides[get_current_user] = lambda: t_user
    update_res = client.put(
        f"/api/v1/diary/entries/{entry_id}",
        json={
            "title": "Section B Updated Physics Project",
            "description": "Physics Experiment 4 with lab report.",
        },
    )
    assert update_res.status_code == 200

    # Student B verifies updated content
    app.dependency_overrides[get_current_user] = lambda: s_user_b
    feed_b_updated = client.get("/api/v1/diary/student/entries")
    entry_found = next(e for e in feed_b_updated.json()["entries"] if e["id"] == entry_id)
    assert entry_found["title"] == "Section B Updated Physics Project"

    app.dependency_overrides.clear()


