import uuid
from datetime import date, datetime, time, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # Ensure all models are registered
from app.core.deps import get_current_teacher, get_current_user, get_db
from app.db.base import Base
from app.main import app
from app.models.online_classroom import (
    OnlineClass,
    OnlineClassParticipant,
    OnlineClassRecording,
    OnlineClassStatus,
    OnlineMeetingSession,
)
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus


@pytest.fixture(scope="function")
def test_db_session():
    # SQLite in-memory with StaticPool ensures all connections share the same memory DB
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
def seed_data(test_db_session):
    db = test_db_session

    # Seed teacher user & teacher
    teacher_user = User(
        id=uuid.uuid4(),
        email="teacher.smith@school.local",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(teacher_user)
    db.flush()

    teacher = Teacher(
        id=uuid.uuid4(),
        user_id=teacher_user.id,
        employee_code="TCH-001",
        first_name="John",
        last_name="Smith",
        department="Mathematics",
    )
    db.add(teacher)

    # Seed student 1
    student1_user = User(
        id=uuid.uuid4(),
        email="student1@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student1_user)
    db.flush()

    student1 = Student(
        id=uuid.uuid4(),
        user_id=student1_user.id,
        student_code="STU-001",
        first_name="Alice",
        last_name="Johnson",
        class_name="Grade 10",
        section="A",
        department="Secondary",
        dob=date(2010, 5, 12),
        admission_date=date(2025, 8, 1),
        status="active",
    )
    db.add(student1)

    # Seed student 2 (unassigned to initial class)
    student2_user = User(
        id=uuid.uuid4(),
        email="student2@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student2_user)
    db.flush()

    student2 = Student(
        id=uuid.uuid4(),
        user_id=student2_user.id,
        student_code="STU-002",
        first_name="Bob",
        last_name="Williams",
        class_name="Grade 10",
        section="B",
        department="Secondary",
        dob=date(2010, 8, 20),
        admission_date=date(2025, 8, 1),
        status="active",
    )
    db.add(student2)

    # Seed Admin User
    admin_user = User(
        id=uuid.uuid4(),
        email="admin@school.local",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(admin_user)

    db.commit()

    return {
        "teacher_user": teacher_user,
        "teacher": teacher,
        "student1_user": student1_user,
        "student1": student1,
        "student2_user": student2_user,
        "student2": student2,
        "admin_user": admin_user,
    }


def test_create_online_class_success(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    student1 = seed_data["student1"]

    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    tomorrow = date.today() + timedelta(days=1)

    payload = {
        "title": "Advanced Calculus Live Seminar",
        "description": "Integration and differentiation problem sets",
        "scheduled_date": tomorrow.isoformat(),
        "start_time": "10:00:00",
        "expected_duration_minutes": 60,
        "student_ids": [str(student1.id)],
        "is_recording_enabled": True,
        "allow_student_mic": True,
        "allow_student_cam": False,
        "allow_student_chat": True,
        "allow_student_whiteboard": True,
    }

    response = client.post("/api/v1/teacher/online-classes", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Advanced Calculus Live Seminar"
    assert data["status"] == "SCHEDULED"
    assert data["allow_student_cam"] is False
    assert data["allow_student_whiteboard"] is True
    assert data["participant_count"] == 1
    assert data["room_name"].startswith("cls-")

    app.dependency_overrides.clear()


def test_create_instant_class_auto_enrolls_all_students(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    today = date.today().isoformat()

    payload = {
        "title": "Instant Classroom - 13:25",
        "scheduled_date": today,
        "start_time": "13:25:00",
        "expected_duration_minutes": 45,
        "settings": {"is_instant": True},
    }

    response = client.post("/api/v1/teacher/online-classes", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Instant Classroom - 13:25"
    assert data["participant_count"] >= 1

    app.dependency_overrides.clear()


def test_create_online_class_past_date_fails(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    yesterday = date.today() - timedelta(days=1)

    payload = {
        "title": "Invalid Past Class",
        "scheduled_date": yesterday.isoformat(),
        "start_time": "10:00:00",
        "expected_duration_minutes": 45,
    }

    response = client.post("/api/v1/teacher/online-classes", json=payload)
    assert response.status_code == 400
    assert "cannot be in the past" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_list_and_stats_teacher_online_classes(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    student1 = seed_data["student1"]

    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    tomorrow = date.today() + timedelta(days=1)

    # Create 2 classes
    client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Physics Lab Online",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "11:00:00",
            "expected_duration_minutes": 45,
            "student_ids": [str(student1.id)],
        },
    )
    client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Chemistry Review Session",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "14:00:00",
            "expected_duration_minutes": 60,
        },
    )

    # List
    res_list = client.get("/api/v1/teacher/online-classes")
    assert res_list.status_code == 200
    assert res_list.json()["total"] == 2

    # Stats
    res_stats = client.get("/api/v1/teacher/online-classes/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_classes"] == 2

    app.dependency_overrides.clear()


def test_update_and_cancel_online_class(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    tomorrow = date.today() + timedelta(days=1)

    create_res = client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Biology Session",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "09:00:00",
            "expected_duration_minutes": 45,
        },
    )
    class_id = create_res.json()["id"]

    # Update
    update_res = client.put(
        f"/api/v1/teacher/online-classes/{class_id}",
        json={"title": "Updated Biology Masterclass", "expected_duration_minutes": 90},
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated Biology Masterclass"
    assert update_res.json()["expected_duration_minutes"] == 90

    # Cancel
    cancel_res = client.delete(f"/api/v1/teacher/online-classes/{class_id}")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Attempting to edit a cancelled class should return 400
    fail_res = client.put(
        f"/api/v1/teacher/online-classes/{class_id}",
        json={"title": "Should Fail"},
    )
    assert fail_res.status_code == 400
    assert "Cannot edit" in fail_res.json()["detail"]

    app.dependency_overrides.clear()


def test_start_and_end_meeting_lifecycle(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    tomorrow = date.today() + timedelta(days=1)

    create_res = client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Live Interactive Lab",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "15:00:00",
            "expected_duration_minutes": 60,
        },
    )
    class_id = create_res.json()["id"]

    # Start class -> status becomes LIVE
    start_res = client.post(f"/api/v1/teacher/online-classes/{class_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "LIVE"

    # End class -> status becomes COMPLETED
    end_res = client.post(f"/api/v1/teacher/online-classes/{class_id}/end")
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "COMPLETED"

    app.dependency_overrides.clear()


def test_student_pre_join_checks(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    student1 = seed_data["student1"]
    student1_user = seed_data["student1_user"]
    student2_user = seed_data["student2_user"]

    tomorrow = date.today() + timedelta(days=1)

    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    create_res = client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Geometry Workshop",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "12:00:00",
            "expected_duration_minutes": 45,
            "student_ids": [str(student1.id)],
        },
    )
    class_id = create_res.json()["id"]

    # 2. Test pre-join as Student 2 (unassigned student -> can_join = False)
    app.dependency_overrides[get_current_user] = lambda: student2_user
    pre_join_res2 = client.get(f"/api/v1/student/online-classes/{class_id}/pre-join")
    assert pre_join_res2.status_code == 200
    assert pre_join_res2.json()["can_join"] is False
    assert "not registered" in pre_join_res2.json()["block_reason"]

    # 3. Test pre-join as Student 1 before start -> can_join = False (too early)
    app.dependency_overrides[get_current_user] = lambda: student1_user
    pre_join_res1 = client.get(f"/api/v1/student/online-classes/{class_id}/pre-join")
    assert pre_join_res1.status_code == 200
    assert pre_join_res1.json()["can_join"] is False
    assert "not started yet" in pre_join_res1.json()["block_reason"]

    # 4. Teacher starts class -> status = LIVE
    app.dependency_overrides[get_current_teacher] = lambda: teacher
    client.post(f"/api/v1/teacher/online-classes/{class_id}/start")

    # 5. Now Student 1 checks pre-join -> can_join = True!
    app.dependency_overrides[get_current_user] = lambda: student1_user
    live_check = client.get(f"/api/v1/student/online-classes/{class_id}/pre-join")
    assert live_check.status_code == 200
    assert live_check.json()["can_join"] is True
    assert live_check.json()["block_reason"] is None

    app.dependency_overrides.clear()


def test_admin_monitoring_and_stats(test_db_session, seed_data):
    admin_user = seed_data["admin_user"]
    teacher = seed_data["teacher"]

    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    tomorrow = date.today() + timedelta(days=1)

    # Teacher creates a class
    create_res = client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "History World Tour",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "13:00:00",
            "expected_duration_minutes": 60,
        },
    )

    # Admin lists classes
    app.dependency_overrides[get_current_user] = lambda: admin_user
    admin_list = client.get("/api/v1/admin/online-classes")
    assert admin_list.status_code == 200
    assert admin_list.json()["total"] >= 1

    admin_stats = client.get("/api/v1/admin/online-classes/stats")
    assert admin_stats.status_code == 200
    assert admin_stats.json()["total_classes"] >= 1

    # Admin updates class student permissions
    perm_res = client.patch(
        f"/api/v1/admin/online-classes/{create_res.json()['id']}/permissions",
        json={
            "allow_student_mic": False,
            "allow_student_cam": False,
            "allow_student_chat": True,
            "allow_student_whiteboard": True,
        },
    )
    assert perm_res.status_code == 200
    assert perm_res.json()["allow_student_mic"] is False
    assert perm_res.json()["allow_student_cam"] is False
    assert perm_res.json()["allow_student_chat"] is True
    assert perm_res.json()["allow_student_whiteboard"] is True

    # Admin schedules a class directly
    sched_res = client.post(
        "/api/v1/admin/online-classes",
        json={
            "teacher_id": str(teacher.id),
            "title": "Admin Scheduled Physics Class",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "15:00:00",
            "expected_duration_minutes": 60,
            "allow_student_mic": True,
            "allow_student_cam": True,
            "allow_student_chat": True,
            "allow_student_whiteboard": False,
        },
    )
    assert sched_res.status_code == 201
    assert sched_res.json()["title"] == "Admin Scheduled Physics Class"

    # Start class and then admin terminates it
    app.dependency_overrides[get_current_teacher] = lambda: teacher
    client.post(f"/api/v1/teacher/online-classes/{sched_res.json()['id']}/start")
    app.dependency_overrides[get_current_user] = lambda: admin_user

    term_res = client.post(f"/api/v1/admin/online-classes/{sched_res.json()['id']}/terminate")
    assert term_res.status_code == 200
    assert term_res.json()["status"] == "COMPLETED"

    app.dependency_overrides.clear()


def test_generate_meeting_tokens_lifecycle(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    teacher_user = seed_data["teacher_user"]
    student1 = seed_data["student1"]
    student1_user = seed_data["student1_user"]
    student2_user = seed_data["student2_user"]
    admin_user = seed_data["admin_user"]

    tomorrow = date.today() + timedelta(days=1)

    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    create_res = client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Quantum Computing 101",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "14:00:00",
            "expected_duration_minutes": 60,
            "student_ids": [str(student1.id)],
        },
    )
    class_id = create_res.json()["id"]

    # 1. Generate Teacher Meeting Token
    app.dependency_overrides[get_current_user] = lambda: teacher_user
    teacher_tok_res = client.post(f"/api/v1/teacher/online-classes/{class_id}/token")
    assert teacher_tok_res.status_code == 200
    t_data = teacher_tok_res.json()
    assert t_data["participant_role"] == "TEACHER"
    assert "token" in t_data
    assert len(t_data["token"]) > 20
    assert t_data["room_name"].startswith("cls-")

    # 2. Student 2 (unassigned) tries to get token -> 403 Forbidden
    app.dependency_overrides[get_current_user] = lambda: student2_user
    s2_tok_res = client.post(f"/api/v1/student/online-classes/{class_id}/token")
    assert s2_tok_res.status_code == 403

    # 3. Start class -> LIVE
    app.dependency_overrides[get_current_teacher] = lambda: teacher
    client.post(f"/api/v1/teacher/online-classes/{class_id}/start")

    # 4. Student 1 (assigned) gets token when LIVE
    app.dependency_overrides[get_current_user] = lambda: student1_user
    s1_tok_res = client.post(f"/api/v1/student/online-classes/{class_id}/token")
    assert s1_tok_res.status_code == 200
    s_data = s1_tok_res.json()
    assert s_data["participant_role"] == "STUDENT"
    assert "token" in s_data

    # 5. Admin generates observer token
    app.dependency_overrides[get_current_user] = lambda: admin_user
    admin_tok_res = client.post(f"/api/v1/admin/online-classes/{class_id}/observer-token")
    assert admin_tok_res.status_code == 200
    a_data = admin_tok_res.json()
    assert a_data["participant_role"] == "ADMIN_OBSERVER"

    app.dependency_overrides.clear()


def test_websocket_realtime_broadcast(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    tomorrow = date.today() + timedelta(days=1)

    create_res = client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Real-time Broadcast Room",
            "scheduled_date": tomorrow.isoformat(),
            "start_time": "16:00:00",
            "expected_duration_minutes": 60,
        },
    )
    class_id = create_res.json()["id"]

    # Test WebSocket connection & chat broadcast
    with client.websocket_connect(f"/api/v1/online-classes/{class_id}/ws?client_id=client-1") as ws1:
        with client.websocket_connect(f"/api/v1/online-classes/{class_id}/ws?client_id=client-2") as ws2:
            # Client 1 sends in-room chat
            chat_payload = {
                "type": "CHAT_MESSAGE",
                "payload": {"senderName": "Alice", "text": "Hello Teacher!"},
            }
            ws1.send_json(chat_payload)

            # Peer (ws2) receives the broadcast; sender (ws1) is excluded to prevent duplicate messages
            msg2 = ws2.receive_json()
            assert msg2["type"] == "CHAT_MESSAGE"
            assert msg2["payload"]["text"] == "Hello Teacher!"

            # Client 1 sends whiteboard draw event
            draw_payload = {
                "type": "WHITEBOARD_DRAW",
                "payload": {"x0": 10, "y0": 20, "x1": 30, "y1": 40, "color": "#ff0000"},
            }
            ws1.send_json(draw_payload)

            draw_msg = ws2.receive_json()
            assert draw_msg["type"] == "WHITEBOARD_DRAW"
            assert draw_msg["payload"]["color"] == "#ff0000"

    app.dependency_overrides.clear()


def test_recording_endpoints_removed(test_db_session, seed_data):
    """Verify that recording endpoints have been completely removed and return 404."""
    teacher = seed_data["teacher"]
    student1 = seed_data["student1"]
    admin_user = seed_data["admin_user"]

    app.dependency_overrides[get_db] = lambda: test_db_session
    client = TestClient(app)

    dummy_id = uuid.uuid4()

    # 1. Student stream endpoint returns 404
    app.dependency_overrides[get_current_user] = lambda: student1.user
    stream_res = client.get(f"/api/v1/recordings/{dummy_id}/stream")
    assert stream_res.status_code == 404

    # 2. Student list recordings returns 404 or 422 (no route, falls through to {class_id: uuid})
    student_recs = client.get("/api/v1/student/online-classes/recordings")
    assert student_recs.status_code in (404, 422)

    # 3. Teacher list recordings returns 404 or 422 (no route, falls through to {class_id: uuid})
    app.dependency_overrides[get_current_teacher] = lambda: teacher
    teacher_recs = client.get("/api/v1/teacher/online-classes/recordings")
    assert teacher_recs.status_code in (404, 422)

    # 4. Admin recordings endpoints return 404 or 422
    app.dependency_overrides[get_current_user] = lambda: admin_user
    admin_recs = client.get("/api/v1/admin/online-classes/recordings")
    assert admin_recs.status_code in (404, 422)

    archive_res = client.post(f"/api/v1/admin/online-classes/recordings/{dummy_id}/archive")
    assert archive_res.status_code == 404

    del_res = client.delete(f"/api/v1/admin/online-classes/recordings/{dummy_id}")
    assert del_res.status_code == 404

    app.dependency_overrides.clear()

    app.dependency_overrides.clear()


def test_websocket_waiting_room_and_polls(test_db_session, seed_data):
    teacher = seed_data["teacher"]
    app.dependency_overrides[get_db] = lambda: test_db_session
    app.dependency_overrides[get_current_teacher] = lambda: teacher

    client = TestClient(app)
    create_res = client.post(
        "/api/v1/teacher/online-classes",
        json={
            "title": "Interactive Engagement Room",
            "scheduled_date": date.today().isoformat(),
            "start_time": "14:00:00",
            "expected_duration_minutes": 60,
        },
    )
    class_id = create_res.json()["id"]

    with client.websocket_connect(f"/api/v1/online-classes/{class_id}/ws?client_id=teacher-1") as teacher_ws:
        # 1. Teacher joins as host
        teacher_ws.send_json({
            "type": "JOIN_ROOM",
            "payload": {"role": "TEACHER", "name": "Prof Smith", "id": "t-1"},
        })
        msg1 = teacher_ws.receive_json()
        assert msg1["type"] == "WAITING_ROOM_STATUS"
        assert msg1["payload"]["status"] == "ADMITTED"
        msg2 = teacher_ws.receive_json()
        assert msg2["type"] == "ROOM_ROSTER"
        perm_msg = teacher_ws.receive_json()
        assert perm_msg["type"] == "PERMISSIONS_UPDATED"
        assert "allow_student_chat" in perm_msg["payload"]
        msg3 = teacher_ws.receive_json()
        assert msg3["type"] == "TEACHER_RECONNECTED"

        # 2. Teacher enables Waiting Room
        teacher_ws.send_json({
            "type": "TOGGLE_WAITING_ROOM",
            "payload": {"enabled": True},
        })
        cfg_msg = teacher_ws.receive_json()
        assert cfg_msg["type"] == "WAITING_ROOM_CONFIG"
        assert cfg_msg["payload"]["enabled"] is True

        # 3. Student connects and attempts to join
        with client.websocket_connect(f"/api/v1/online-classes/{class_id}/ws?client_id=student-1") as student_ws:
            student_ws.send_json({
                "type": "JOIN_ROOM",
                "payload": {"role": "STUDENT", "name": "Ada Lovelace", "id": "s-1"},
            })

            # Student receives WAITING status
            wait_status = student_ws.receive_json()
            assert wait_status["type"] == "WAITING_ROOM_STATUS"
            assert wait_status["payload"]["status"] == "WAITING"

            # Teacher receives STUDENT_KNOCKING notification
            knock_msg = teacher_ws.receive_json()
            assert knock_msg["type"] == "STUDENT_KNOCKING"
            assert knock_msg["payload"]["name"] == "Ada Lovelace"

            # 4. Teacher admits student
            teacher_ws.send_json({
                "type": "ADMIT_STUDENT",
                "payload": {"client_id": "student-1"},
            })

            # Student receives ADMITTED status & enters room
            admitted_msg = student_ws.receive_json()
            assert admitted_msg["type"] == "WAITING_ROOM_STATUS"
            assert admitted_msg["payload"]["status"] == "ADMITTED"
            s_joined = student_ws.receive_json()
            assert s_joined["type"] == "USER_JOINED"

            # Teacher receives USER_JOINED and updated WAITING_ROOM_LIST
            t_joined = teacher_ws.receive_json()
            assert t_joined["type"] == "USER_JOINED"
            t_waitlist = teacher_ws.receive_json()
            assert t_waitlist["type"] == "WAITING_ROOM_LIST"

            # 5. Teacher launches Live Poll
            teacher_ws.send_json({
                "type": "POLL_CREATE",
                "payload": {
                    "question": "What is the complexity of binary search?",
                    "options": ["O(N)", "O(log N)", "O(1)"],
                },
            })

            # Teacher and Student receive POLL_STARTED broadcast
            t_poll = teacher_ws.receive_json()
            assert t_poll["type"] == "POLL_STARTED"

            poll_start = student_ws.receive_json()
            assert poll_start["type"] == "POLL_STARTED"
            assert poll_start["payload"]["question"] == "What is the complexity of binary search?"

            # 6. Student votes
            student_ws.send_json({
                "type": "POLL_VOTE",
                "payload": {"option_index": 1, "user_id": "s-1"},
            })

            s_poll_update = student_ws.receive_json()
            assert s_poll_update["type"] == "POLL_UPDATED"
            t_poll_update = teacher_ws.receive_json()
            assert t_poll_update["type"] == "POLL_UPDATED"
            assert t_poll_update["payload"]["options"][1]["votes"] == 1

            # 7. Student raises hand
            student_ws.send_json({
                "type": "HAND_RAISE",
                "payload": {"id": "s-1", "name": "Ada Lovelace"},
            })

            s_hand_msg = student_ws.receive_json()
            assert s_hand_msg["type"] == "HAND_RAISE_QUEUE"
            hand_msg = teacher_ws.receive_json()
            assert hand_msg["type"] == "HAND_RAISE_QUEUE"
            assert len(hand_msg["payload"]["queue"]) == 1
            assert hand_msg["payload"]["queue"][0]["name"] == "Ada Lovelace"

            # 8. Teacher dynamically updates permissions
            teacher_ws.send_json({
                "type": "UPDATE_PERMISSIONS",
                "payload": {
                    "allow_student_mic": False,
                    "allow_student_cam": False,
                    "allow_student_chat": False,
                    "allow_student_whiteboard": True,
                },
            })
            t_perm_update = teacher_ws.receive_json()
            assert t_perm_update["type"] == "PERMISSIONS_UPDATED"
            assert t_perm_update["payload"]["allow_student_chat"] is False
            assert t_perm_update["payload"]["allow_student_whiteboard"] is True
            s_perm_update = student_ws.receive_json()
            assert s_perm_update["type"] == "PERMISSIONS_UPDATED"
            assert s_perm_update["payload"]["allow_student_chat"] is False
            assert s_perm_update["payload"]["allow_student_whiteboard"] is True

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_classroom_ws_manager_terminate_room_strict_isolation():
    """Verify that when a room is terminated, all participants in that room receive CLASS_ENDED and are closed, while other classes remain completely connected and untouched."""
    import uuid
    from unittest.mock import AsyncMock
    from app.services.classroom_ws_manager import ClassroomWSManager

    manager = ClassroomWSManager()
    class_a = uuid.uuid4()
    class_b = uuid.uuid4()

    ws_a1 = AsyncMock()
    ws_a2 = AsyncMock()
    ws_b1 = AsyncMock()

    await manager.connect(class_a, "student-a1", ws_a1)
    await manager.connect(class_a, "student-a2", ws_a2)
    await manager.connect(class_b, "student-b1", ws_b1)

    assert len(manager.rooms[class_a]) == 2
    assert len(manager.rooms[class_b]) == 1

    # Terminate Class A
    await manager.terminate_room(class_a, reason="Teacher ended session for all")

    # 1. Class A clients received CLASS_ENDED
    assert ws_a1.send_json.call_count == 1
    call_msg_a1 = ws_a1.send_json.call_args[0][0]
    assert call_msg_a1["type"] == "CLASS_ENDED"
    assert call_msg_a1["payload"]["reason"] == "Teacher ended session for all"

    assert ws_a2.send_json.call_count == 1
    call_msg_a2 = ws_a2.send_json.call_args[0][0]
    assert call_msg_a2["type"] == "CLASS_ENDED"

    # 2. Sockets in Class A closed with code 1000
    ws_a1.close.assert_awaited_once_with(code=1000, reason="Teacher ended session for all")
    ws_a2.close.assert_awaited_once_with(code=1000, reason="Teacher ended session for all")

    # 3. Class A is completely flushed from manager memory
    assert class_a not in manager.rooms
    assert class_a not in manager.clients_meta

    # 4. Class B (other call) is 100% UNTOUCHED and STILL ACTIVE
    assert class_b in manager.rooms
    assert len(manager.rooms[class_b]) == 1
    assert "student-b1" in manager.rooms[class_b]
    ws_b1.send_json.assert_not_called()
    ws_b1.close.assert_not_called()


@pytest.mark.asyncio
async def test_classroom_ws_manager_kick_by_user_id_resolution():
    """Verify kick_client resolves target by user_id and client_id accurately."""
    import uuid
    from unittest.mock import AsyncMock
    from app.services.classroom_ws_manager import ClassroomWSManager

    manager = ClassroomWSManager()
    class_id = uuid.uuid4()
    user_id = str(uuid.uuid4())
    client_id = f"client-student-{user_id[:8]}"

    ws = AsyncMock()
    await manager.connect(class_id, client_id, ws)
    await manager.register_client_meta(class_id, client_id, {"id": user_id, "user_id": user_id, "name": "Ada Lovelace"})

    # Kick using the user_id (as sent from People drawer)
    await manager.kick_client(class_id, user_id, reason="Removed by instructor")

    # Verify socket was kicked and closed
    assert ws.send_json.call_count == 1
    call_msg = ws.send_json.call_args[0][0]
    assert call_msg["type"] == "KICKED"
    assert call_msg["payload"]["reason"] == "Removed by instructor"
    ws.close.assert_awaited_once_with(code=4403, reason="Removed by instructor")
    assert client_id not in manager.rooms.get(class_id, {})


@pytest.mark.asyncio
async def test_classroom_ws_manager_resolve_client_and_media_moderation():
    """Verify resolve_client_info resolution across IDs and names for host mute/allow rights."""
    import uuid
    from unittest.mock import AsyncMock
    from app.services.classroom_ws_manager import ClassroomWSManager

    manager = ClassroomWSManager()
    class_id = uuid.uuid4()
    user_id = str(uuid.uuid4())
    student_id = str(uuid.uuid4())
    client_id = f"socket-{user_id[:8]}"

    ws = AsyncMock()
    await manager.connect(class_id, client_id, ws)
    meta = {
        "id": user_id,
        "user_id": user_id,
        "student_id": student_id,
        "name": "Ada Lovelace",
        "role": "STUDENT",
        "isMicOn": True,
        "isCameraOn": True,
        "isMicAllowed": True,
    }
    await manager.register_client_meta(class_id, client_id, meta)

    # 1. Resolve by user_id
    cid1, m1 = manager.resolve_client_info(class_id, user_id)
    assert cid1 == client_id
    assert m1["name"] == "Ada Lovelace"

    # 2. Resolve by student_id
    cid2, m2 = manager.resolve_client_info(class_id, student_id)
    assert cid2 == client_id

    # 3. Resolve by name
    cid3, m3 = manager.resolve_client_info(class_id, "Ada Lovelace")
    assert cid3 == client_id

    # 4. Resolve by socket client_id
    cid4, m4 = manager.resolve_client_info(class_id, client_id)
    assert cid4 == client_id

    # 5. Non-existent identifier
    cid5, m5 = manager.resolve_client_info(class_id, "non-existent")
    assert cid5 is None
    assert m5 is None


@pytest.mark.asyncio
async def test_classroom_ws_manager_global_feed():
    """Verify global feed subscribers receive real-time class lifecycle events."""
    from unittest.mock import AsyncMock
    from app.services.classroom_ws_manager import ClassroomWSManager

    manager = ClassroomWSManager()
    ws_admin = AsyncMock()
    ws_student = AsyncMock()

    await manager.connect_global("admin-feed-1", ws_admin)
    await manager.connect_global("student-feed-2", ws_student)
    assert len(manager.global_subscribers) == 2

    # Broadcast event
    await manager.broadcast_global("CLASS_CREATED", {"title": "Math 101", "class_id": "c123"})
    ws_admin.send_json.assert_awaited_once_with({"type": "CLASS_CREATED", "payload": {"title": "Math 101", "class_id": "c123"}})
    ws_student.send_json.assert_awaited_once_with({"type": "CLASS_CREATED", "payload": {"title": "Math 101", "class_id": "c123"}})

    # Disconnect one subscriber
    manager.disconnect_global("admin-feed-1")
    assert len(manager.global_subscribers) == 1
    assert "student-feed-2" in manager.global_subscribers


def test_online_classroom_feed_websocket_endpoint():
    """Verify connecting to the global feed websocket endpoint via TestClient."""
    client = TestClient(app)
    with client.websocket_connect("/api/v1/online-classes/feed/ws?client_id=test-client-feed") as ws:
        ws.send_text("ping")
        data = ws.receive_text()
        assert data == "pong"







