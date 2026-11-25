import datetime as dt
import json
import uuid
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.academic_structure import Section
from app.models.classroom import Subject
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User


def run_full_role_test():
    db = SessionLocal()
    client = TestClient(app)

    print("=" * 80)
    print("STARTING FULL END-TO-END DIGITAL DIARY TEST: TEACHER, STUDENT, PARENT")
    print("=" * 80)

    # 1. Fetch live database records
    teacher = db.query(Teacher).filter(Teacher.first_name == "Alan", Teacher.last_name == "Turing").first()
    if not teacher:
        teacher = db.query(Teacher).first()
    teacher_user = db.get(User, teacher.user_id)

    student = db.query(Student).filter(Student.first_name == "Ada", Student.last_name == "Lovelace").first()
    if not student:
        student = db.query(Student).first()
    student_user = db.get(User, student.user_id)

    link = db.query(ParentStudentLink).filter(ParentStudentLink.student_id == student.id).first()
    parent = db.get(Parent, link.parent_id) if link else db.query(Parent).first()
    parent_user = db.get(User, parent.user_id)

    print(f"Teacher: {teacher.first_name} {teacher.last_name} ({teacher_user.email})")
    print(f"Student: {student.first_name} {student.last_name} ({student_user.email})")
    print(f"Parent:  {parent.first_name} {parent.last_name} ({parent_user.email})")
    print("-" * 80)

    # Generate Bearer tokens
    teacher_token = create_access_token(user_id=teacher_user.id, role=teacher_user.role)
    student_token = create_access_token(user_id=student_user.id, role=student_user.role)
    parent_token = create_access_token(user_id=parent_user.id, role=parent_user.role)

    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}
    parent_headers = {"Authorization": f"Bearer {parent_token}"}

    # -------------------------------------------------------------------------
    # STEP 1: TEACHER CREATES A HOMEWORK DIARY ENTRY (CREATE)
    # -------------------------------------------------------------------------
    print("\n[STEP 1: TEACHER] Creating a new published homework diary entry...")
    today = dt.date.today()
    create_payload = {
        "title": "Calculus Assignment: Integration by Parts & Trigonometry",
        "description": "Complete problems 1 through 15 from Chapter 7. Show all algebraic steps clearly in your assignment notebook.",
        "entry_type": "HOMEWORK",
        "category": "Mathematics",
        "entry_date": str(today),
        "due_date": str(today + dt.timedelta(days=2)),
        "section_id": str(student.current_section_id) if student.current_section_id else None,
        "student_ids": [str(student.id)],
        "visibility": "STUDENT_AND_PARENT",
        "requires_acknowledgement": True,
        "is_conversation_allowed": True,
        "status": "PUBLISHED",
        "internal_notes": "Pay special attention to integration of sec^3(x) in step 8.",
        "attachments": [{"name": "calculus_hw4.pdf", "url": "/static/calc4.pdf", "file_type": "pdf", "file_size": 150000}],
    }
    create_res = client.post("/api/v1/diary/entries", json=create_payload, headers=teacher_headers)
    assert create_res.status_code == 201, f"Failed: {create_res.text}"
    entry_id = create_res.json()["id"]
    print(f"-> SUCCESS: Created diary entry ID: {entry_id} (Status: {create_res.json()['status']})")

    # -------------------------------------------------------------------------
    # STEP 2: TEACHER READS AUTHORED ENTRIES (READ)
    # -------------------------------------------------------------------------
    print("\n[STEP 2: TEACHER] Verifying entry in teacher's authored dashboard...")
    teacher_feed_res = client.get("/api/v1/diary/entries", headers=teacher_headers)
    assert teacher_feed_res.status_code == 200
    t_entries = teacher_feed_res.json()["entries"]
    found_entry = next((e for e in t_entries if e["id"] == entry_id), None)
    assert found_entry is not None
    print(f"-> SUCCESS: Entry '{found_entry['title']}' is listed.")
    print(f"   Recipients: {found_entry['total_recipients']} | Read: {found_entry['read_count']} | Acknowledged: {found_entry['acknowledged_count']}")

    # -------------------------------------------------------------------------
    # STEP 3: STUDENT PORTAL FEED & READ RECEIPT (READ & UPDATE)
    # -------------------------------------------------------------------------
    print("\n[STEP 3: STUDENT] Checking student portal feed for homework...")
    student_feed_res = client.get("/api/v1/diary/student/entries", headers=student_headers)
    assert student_feed_res.status_code == 200
    stu_entries = student_feed_res.json()["entries"]
    stu_entry = next((e for e in stu_entries if e["id"] == entry_id), None)
    assert stu_entry is not None
    print(f"-> SUCCESS: Student sees entry: '{stu_entry['title']}'")
    print(f"   Due Date: {stu_entry['due_date']} | Read by Student: {stu_entry['is_read_by_student']}")
    assert stu_entry["internal_notes"] is None, "Security Violation: Internal notes leaked to student!"

    print("-> Student marks entry as read...")
    read_marker_res = client.post(f"/api/v1/diary/student/entries/{entry_id}/read", headers=student_headers)
    assert read_marker_res.status_code == 200
    print("-> SUCCESS: Student read receipt generated.")

    # -------------------------------------------------------------------------
    # STEP 4: PARENT PORTAL FEED & DIGITAL SIGNATURE (READ & CREATE/UPDATE)
    # -------------------------------------------------------------------------
    print(f"\n[STEP 4: PARENT] Checking parent portal feed for student {student.first_name}...")
    parent_feed_res = client.get(f"/api/v1/diary/parent/entries?student_id={student.id}", headers=parent_headers)
    assert parent_feed_res.status_code == 200
    p_entries = parent_feed_res.json()["entries"]
    p_entry = next((e for e in p_entries if e["id"] == entry_id), None)
    assert p_entry is not None
    print(f"-> SUCCESS: Parent sees entry: '{p_entry['title']}'")
    print(f"   Signature Required: {p_entry['requires_acknowledgement']} | Is Signed: {p_entry['is_acknowledged']}")
    assert p_entry["is_acknowledged"] is False

    print("-> Parent submits verified digital signature / acknowledgement...")
    ack_res = client.post(
        f"/api/v1/diary/parent/entries/{entry_id}/acknowledge",
        json={"student_id": str(student.id), "notes": f"Reviewed with {student.first_name}, working on problem set."},
        headers=parent_headers,
    )
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    print(f"-> SUCCESS: Digital signature stamped by: {ack_data['parent_name']} at {ack_data['acknowledged_at']}")

    # Verify parent feed now shows acknowledged = True
    parent_feed_res2 = client.get(f"/api/v1/diary/parent/entries?student_id={student.id}", headers=parent_headers)
    p_entry2 = next((e for e in parent_feed_res2.json()["entries"] if e["id"] == entry_id), None)
    assert p_entry2["is_acknowledged"] is True
    print(f"-> Verified: Entry is now marked as Acknowledged in Parent view!")

    # -------------------------------------------------------------------------
    # STEP 5: TWO-WAY DISCUSSION (PARENT SENDS MESSAGE TO TEACHER)
    # -------------------------------------------------------------------------
    print("\n[STEP 5: PARENT-TEACHER CHAT] Parent opens discussion thread with teacher...")
    conv_init_res = client.post(
        f"/api/v1/diary/conversations?entry_id={entry_id}&student_id={student.id}",
        headers=parent_headers,
    )
    assert conv_init_res.status_code == 200
    conv_id = conv_init_res.json()["conversation_id"]
    print(f"-> SUCCESS: Discussion thread opened (ID: {conv_id})")

    print("-> Parent posts a question to the teacher...")
    p_msg_res = client.post(
        f"/api/v1/diary/conversations/{conv_id}/messages",
        json={"message": "Good evening Mr. Turing, does problem 7 require substitution before parts?"},
        headers=parent_headers,
    )
    assert p_msg_res.status_code == 200
    p_msg = p_msg_res.json()
    print(f"-> SUCCESS: Message sent by {p_msg['sender_name']} ({p_msg['sender_role']}): '{p_msg['message']}'")

    # -------------------------------------------------------------------------
    # STEP 6: TEACHER REPLIES & RESOLVES THREAD
    # -------------------------------------------------------------------------
    print("\n[STEP 6: TEACHER] Teacher checks discussion thread and responds...")
    t_conv_res = client.get(f"/api/v1/diary/conversations/{conv_id}", headers=teacher_headers)
    assert t_conv_res.status_code == 200
    conv_data = t_conv_res.json()
    print(f"-> Teacher reads thread. Message count: {len(conv_data['messages'])}")

    print("-> Teacher replies to parent...")
    t_msg_res = client.post(
        f"/api/v1/diary/conversations/{conv_id}/messages",
        json={"message": "Yes, let u = sqrt(x) first, and the integral simplifies directly."},
        headers=teacher_headers,
    )
    assert t_msg_res.status_code == 200
    t_msg = t_msg_res.json()
    print(f"-> SUCCESS: Teacher response sent: '{t_msg['message']}'")

    print("-> Teacher marks the discussion thread as RESOLVED...")
    resolve_res = client.post(
        f"/api/v1/diary/conversations/{conv_id}/resolve",
        json={"resolution_notes": "Clarified substitution method for problem 7."},
        headers=teacher_headers,
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    print(f"-> SUCCESS: Conversation marked as RESOLVED.")

    # -------------------------------------------------------------------------
    # STEP 7: TEACHER RECIPIENT AUDIT VERIFICATION
    # -------------------------------------------------------------------------
    print("\n[STEP 7: TEACHER AUDIT] Teacher inspects recipient status breakdown...")
    rec_res = client.get(f"/api/v1/diary/entries/{entry_id}/recipients", headers=teacher_headers)
    assert rec_res.status_code == 200
    recipients = rec_res.json()
    ada_rec = next((r for r in recipients if r["student_id"] == str(student.id)), None)
    assert ada_rec is not None
    print(f"-> Recipient: {ada_rec['student_name']} ({ada_rec['student_code']})")
    print(f"   Student Read Status: {ada_rec['is_read']} (Read at: {ada_rec['read_at']})")
    print(f"   Parent Ack Status:   {ada_rec['is_acknowledged']} (Signed by: {ada_rec['parent_name']})")
    assert ada_rec["is_read"] is True
    assert ada_rec["is_acknowledged"] is True
    print("-> SUCCESS: Full audit verified! Both student read and parent acknowledgement confirmed.")

    # -------------------------------------------------------------------------
    # STEP 8: TEACHER UPDATES ENTRY (UPDATE)
    # -------------------------------------------------------------------------
    print("\n[STEP 8: TEACHER] Updating the diary entry details (UPDATE)...")
    update_res = client.put(
        f"/api/v1/diary/entries/{entry_id}",
        json={
            "title": "Calculus Assignment: Integration by Parts (With Hints)",
            "description": "Complete problems 1 through 15 from Chapter 7. Hint for Problem 7: substitute u = sqrt(x).",
        },
        headers=teacher_headers,
    )
    assert update_res.status_code == 200
    print("-> SUCCESS: Diary entry updated.")

    # -------------------------------------------------------------------------
    # STEP 9: TEACHER CREATES DRAFT & DELETES IT (DELETE)
    # -------------------------------------------------------------------------
    print("\n[STEP 9: TEACHER] Creating a temporary draft entry and deleting it (DELETE)...")
    draft_res = client.post(
        "/api/v1/diary/entries",
        json={
            "title": "Temporary Draft Observation Note",
            "description": "Draft notes to be discarded.",
            "entry_type": "CUSTOM",
            "student_ids": [str(student.id)],
            "status": "DRAFT",
        },
        headers=teacher_headers,
    )
    assert draft_res.status_code == 201
    draft_id = draft_res.json()["id"]
    print(f"-> Created draft ID: {draft_id}")

    del_res = client.delete(f"/api/v1/diary/entries/{draft_id}", headers=teacher_headers)
    assert del_res.status_code == 200
    print(f"-> SUCCESS: Deleted entry ID {draft_id}: {del_res.json()['message']}")

    print("\n" + "=" * 80)
    print("ALL TESTS PASSED: TEACHER, STUDENT, AND PARENT WORKFLOWS FULLY VERIFIED!")
    print("=" * 80)

    db.close()


if __name__ == "__main__":
    run_full_role_test()
