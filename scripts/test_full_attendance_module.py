import datetime as dt
import json
import os
import sys
import time
import urllib.request
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.academic_structure import AcademicYear, Grade, Section
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.classroom import TeacherAssignment
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole


LOG_FILE = "attendance_full_test_run.log"


class TestLogger:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.log_file = open(filepath, "w", encoding="utf-8")
        self.total = 0
        self.passed = 0
        self.failed = 0
        self._write_header()

    def _write_header(self):
        timestamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.log_file.write("=" * 80 + "\n")
        self.log_file.write(f"FULL ATTENDANCE MODULE TEST RUN - {timestamp}\n")
        self.log_file.write("=" * 80 + "\n\n")

    def log_result(self, name: str, method: str, url: str, status_code: int, expected_code: int, latency_ms: float, detail: str = "", payload: dict = None):
        self.total += 1
        is_pass = status_code == expected_code
        if is_pass:
            self.passed += 1
            verdict = "PASS"
        else:
            self.failed += 1
            verdict = "FAIL"

        msg = f"[{verdict}] {name}\n"
        msg += f"  HTTP: {method} {url}\n"
        msg += f"  Status: {status_code} (Expected: {expected_code}) | Latency: {latency_ms:.1f}ms\n"
        if payload:
            msg += f"  Request Payload: {json.dumps(payload)}\n"
        if detail:
            msg += f"  Response / Info: {detail}\n"
        msg += "-" * 60 + "\n"

        print(f"[{verdict}] {name} ({status_code} vs {expected_code}) - {latency_ms:.1f}ms")
        self.log_file.write(msg)
        self.log_file.flush()

    def finish(self):
        summary = "\n" + "=" * 80 + "\n"
        summary += f"TEST EXECUTION SUMMARY\n"
        summary += f"Total Executed: {self.total}\n"
        summary += f"Passed:         {self.passed}\n"
        summary += f"Failed:         {self.failed}\n"
        summary += f"Success Rate:   {(self.passed / max(1, self.total) * 100):.1f}%\n"
        summary += f"Log written to: {os.path.abspath(self.filepath)}\n"
        summary += "=" * 80 + "\n"
        self.log_file.write(summary)
        self.log_file.close()
        print(summary)


def run_tests():
    logger = TestLogger(LOG_FILE)
    client = TestClient(app)
    db = SessionLocal()

    try:
        # 1. Fetch Users for Roles
        admin_user = db.execute(select(User).where(User.role == UserRole.ADMIN.value)).scalars().first()
        admin_token = create_access_token(admin_user.id, admin_user.role)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Teacher: Sunita Sharma
        sunita = db.execute(select(Teacher).where(Teacher.first_name == "Sunita")).scalars().first()
        t_sunita_user = sunita.user if sunita else None
        teacher_token = create_access_token(t_sunita_user.id, t_sunita_user.role) if t_sunita_user else ""
        teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

        # Teacher: Alan Turing
        alan = db.execute(select(Teacher).where(Teacher.first_name == "Alan")).scalars().first()
        t_alan_user = alan.user if alan else None
        alan_token = create_access_token(t_alan_user.id, t_alan_user.role) if t_alan_user else ""
        alan_headers = {"Authorization": f"Bearer {alan_token}"}

        # Student: Ada Lovelace
        ada_student = db.execute(select(Student).where(Student.first_name == "Ada")).scalars().first()
        ada_user = ada_student.user if ada_student else None
        student_token = create_access_token(ada_user.id, ada_user.role) if ada_user else ""
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # Parent: Lord Byron (linked to Ada Lovelace)
        byron_parent = db.execute(select(Parent).where(Parent.first_name == "Lord")).scalars().first()
        byron_user = byron_parent.user if byron_parent else None
        parent_token = create_access_token(byron_user.id, byron_user.role) if byron_user else ""
        parent_headers = {"Authorization": f"Bearer {parent_token}"}

        # Academic structure objects
        ay = db.execute(select(AcademicYear).where(AcademicYear.is_current == True)).scalars().first()
        grade_2 = db.execute(select(Grade).where(Grade.name == "Grade 2", Grade.academic_year_id == ay.id)).scalars().first()
        sec_2a = db.execute(select(Section).where(Section.name == "2-A", Section.grade_id == grade_2.id)).scalars().first() if grade_2 else None
        sec_2b = db.execute(select(Section).where(Section.name == "2-B", Section.grade_id == grade_2.id)).scalars().first() if grade_2 else None

        # Section 8-A (not assigned to Sunita)
        grade_8 = db.execute(select(Grade).where(Grade.name == "Grade 8", Grade.academic_year_id == ay.id)).scalars().first()
        sec_8a = db.execute(select(Section).where(Section.name == "8-A", Section.grade_id == grade_8.id)).scalars().first() if grade_8 else None

        # =========================================================================
        # PART 1: ADMIN ATTENDANCE APIS
        # =========================================================================
        # 1.1 Admin Daily Overview - Today
        t0 = time.time()
        res = client.get("/api/v1/admin/attendance/overview?date=2026-11-02", headers=admin_headers)
        logger.log_result(
            "Admin Overview (Today 2026-11-02)",
            "GET",
            "/api/v1/admin/attendance/overview?date=2026-11-02",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Marked: {res.json().get('marked_sections')}/{res.json().get('total_sections')}, Pct: {res.json().get('overall_percentage')}%" if res.status_code == 200 else res.text,
        )

        # 1.2 Admin Daily Overview - Past Date (2026-10-30)
        t0 = time.time()
        res = client.get("/api/v1/admin/attendance/overview?date=2026-10-30", headers=admin_headers)
        logger.log_result(
            "Admin Overview (Past Date 2026-10-30)",
            "GET",
            "/api/v1/admin/attendance/overview?date=2026-10-30",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Marked: {res.json().get('marked_sections')}/{res.json().get('total_sections')}, Total: {res.json().get('total_students')}" if res.status_code == 200 else res.text,
        )

        # 1.3 Admin Overview Filtered by Grade (Grade 2)
        if grade_2:
            t0 = time.time()
            res = client.get(f"/api/v1/admin/attendance/overview?date=2026-11-02&grade_id={grade_2.id}", headers=admin_headers)
            logger.log_result(
                "Admin Overview (Filter by Grade 2)",
                "GET",
                f"/api/v1/admin/attendance/overview?date=2026-11-02&grade_id={grade_2.id}",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Grade 2 sections: {len(res.json().get('sections', []))}" if res.status_code == 200 else res.text,
            )

        # 1.4 Admin Overview Filtered by Academic Year
        if ay:
            t0 = time.time()
            res = client.get(f"/api/v1/admin/attendance/overview?date=2026-11-02&academic_year_id={ay.id}", headers=admin_headers)
            logger.log_result(
                "Admin Overview (Filter by Academic Year)",
                "GET",
                f"/api/v1/admin/attendance/overview?date=2026-11-02&academic_year_id={ay.id}",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Total sections: {res.json().get('total_sections')}" if res.status_code == 200 else res.text,
            )

        # 1.4a Admin Overview Search Filter (Grade 2)
        t0 = time.time()
        res = client.get("/api/v1/admin/attendance/overview?date=2026-11-02&search=Grade%202", headers=admin_headers)
        logger.log_result(
            "Admin Overview (Search Filter: Grade 2)",
            "GET",
            "/api/v1/admin/attendance/overview?date=2026-11-02&search=Grade%202",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Matching sections: {len(res.json().get('sections', []))}" if res.status_code == 200 else res.text,
        )

        # 1.4b Admin Overview Search Filter (Section 1-A)
        t0 = time.time()
        res = client.get("/api/v1/admin/attendance/overview?date=2026-11-02&search=1-A", headers=admin_headers)
        logger.log_result(
            "Admin Overview (Search Filter: 1-A)",
            "GET",
            "/api/v1/admin/attendance/overview?date=2026-11-02&search=1-A",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Matching sections: {len(res.json().get('sections', []))}" if res.status_code == 200 else res.text,
        )

        # 1.5 Admin Section Roster
        if sec_2a:
            t0 = time.time()
            res = client.get(f"/api/v1/admin/attendance/sections/{sec_2a.id}/roster", headers=admin_headers)
            logger.log_result(
                "Admin Section Roster (Section 2-A)",
                "GET",
                f"/api/v1/admin/attendance/sections/{sec_2a.id}/roster",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Roster student count: {len(res.json())}" if res.status_code == 200 else res.text,
            )

        # 1.6 Admin Section Attendance Session (Section 2-A)
        if sec_2a:
            t0 = time.time()
            res = client.get(f"/api/v1/admin/attendance/sections/{sec_2a.id}?date=2026-11-02&period=1", headers=admin_headers)
            logger.log_result(
                "Admin Section Attendance Session",
                "GET",
                f"/api/v1/admin/attendance/sections/{sec_2a.id}?date=2026-11-02&period=1",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Session found, present={res.json().get('present_count')}, absent={res.json().get('absent_count')}" if res.status_code == 200 and res.json() else "None",
            )

        # 1.7 Admin Section Attendance History
        if sec_2a:
            t0 = time.time()
            res = client.get(f"/api/v1/admin/attendance/sections/{sec_2a.id}/history?limit=30", headers=admin_headers)
            logger.log_result(
                "Admin Section History",
                "GET",
                f"/api/v1/admin/attendance/sections/{sec_2a.id}/history?limit=30",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Historical sessions: {len(res.json())}" if res.status_code == 200 else res.text,
            )

        # 1.8 Admin Student Attendance History Profile
        if ada_student:
            t0 = time.time()
            res = client.get(f"/api/v1/admin/attendance/students/{ada_student.id}", headers=admin_headers)
            logger.log_result(
                "Admin Student Attendance Profile (Ada Lovelace)",
                "GET",
                f"/api/v1/admin/attendance/students/{ada_student.id}",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Working days: {res.json().get('total_working_days')}, Attendance %: {res.json().get('attendance_percentage')}%" if res.status_code == 200 else res.text,
            )

        # 1.9 Admin Edit Attendance Record with Mandatory Reason
        rec_to_edit = db.execute(select(AttendanceRecord).where(AttendanceRecord.date == dt.date(2026, 11, 2))).scalars().first()
        if rec_to_edit:
            edit_payload = {
                "status": "EXCUSED",
                "reason": "Official parental medical authorization verified by nurse",
                "remark": "Medical excused",
            }
            t0 = time.time()
            res = client.put(f"/api/v1/admin/attendance/records/{rec_to_edit.id}", json=edit_payload, headers=admin_headers)
            logger.log_result(
                "Admin Edit Attendance Record",
                "PUT",
                f"/api/v1/admin/attendance/records/{rec_to_edit.id}",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"New status: {res.json().get('status')}" if res.status_code == 200 else res.text,
                payload=edit_payload,
            )

        # 1.10 Admin Audit History (All)
        t0 = time.time()
        res = client.get("/api/v1/admin/attendance/audit-history", headers=admin_headers)
        logger.log_result(
            "Admin Audit History (All)",
            "GET",
            "/api/v1/admin/attendance/audit-history",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Audit log entries: {len(res.json())}" if res.status_code == 200 else res.text,
        )

        # 1.11 Admin Audit History Filtered by Section
        if sec_2a:
            t0 = time.time()
            res = client.get(f"/api/v1/admin/attendance/audit-history?section_id={sec_2a.id}", headers=admin_headers)
            logger.log_result(
                "Admin Audit History (Filter by Section 2-A)",
                "GET",
                f"/api/v1/admin/attendance/audit-history?section_id={sec_2a.id}",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Section audit logs: {len(res.json())}" if res.status_code == 200 else res.text,
            )

        # 1.12 Admin Audit History Filtered by Date
        t0 = time.time()
        res = client.get("/api/v1/admin/attendance/audit-history?date=2026-11-02", headers=admin_headers)
        logger.log_result(
            "Admin Audit History (Filter by Date 2026-11-02)",
            "GET",
            "/api/v1/admin/attendance/audit-history?date=2026-11-02",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Date audit logs: {len(res.json())}" if res.status_code == 200 else res.text,
        )

        # =========================================================================
        # PART 2: TEACHER ATTENDANCE APIS
        # =========================================================================
        # 2.1 Teacher Assigned Sections
        t0 = time.time()
        res = client.get("/api/v1/teacher/attendance/sections", headers=teacher_headers)
        logger.log_result(
            "Teacher Assigned Sections (Sunita Sharma)",
            "GET",
            "/api/v1/teacher/attendance/sections",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Sections: {len(res.json())}" if res.status_code == 200 else res.text,
        )

        # 2.2 Teacher Section Roster (Authorized: Section 2-A)
        if sec_2a:
            t0 = time.time()
            res = client.get(f"/api/v1/teacher/attendance/sections/{sec_2a.id}/roster", headers=teacher_headers)
            logger.log_result(
                "Teacher Section Roster (Authorized 2-A)",
                "GET",
                f"/api/v1/teacher/attendance/sections/{sec_2a.id}/roster",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Roster count: {len(res.json())}" if res.status_code == 200 else res.text,
            )

        # 2.3 Teacher Section Roster (Forbidden: Section 8-A not assigned to Sunita)
        if sec_8a:
            t0 = time.time()
            res = client.get(f"/api/v1/teacher/attendance/sections/{sec_8a.id}/roster", headers=teacher_headers)
            logger.log_result(
                "Teacher Section Roster (Forbidden Unassigned Section)",
                "GET",
                f"/api/v1/teacher/attendance/sections/{sec_8a.id}/roster",
                res.status_code,
                403,
                (time.time() - t0) * 1000,
                f"Detail: {res.json().get('detail')}" if res.status_code == 403 else res.text,
            )

        # 2.4 Teacher Retrieve Attendance Session (2-A on 2026-11-02)
        if sec_2a:
            t0 = time.time()
            res = client.get(f"/api/v1/teacher/attendance/sections/{sec_2a.id}?date=2026-11-02&period=1", headers=teacher_headers)
            logger.log_result(
                "Teacher Retrieve Section Session",
                "GET",
                f"/api/v1/teacher/attendance/sections/{sec_2a.id}?date=2026-11-02&period=1",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Session exists: {res.json() is not None}",
            )

        # 2.5 Teacher Future Date Rejection
        if sec_2a:
            future_date = (dt.date.today() + dt.timedelta(days=2)).isoformat()
            t0 = time.time()
            res = client.post(
                f"/api/v1/teacher/attendance/sections/{sec_2a.id}",
                json={"date": future_date, "period": 1, "records": [{"student_id": str(ada_student.id), "status": "PRESENT"}]},
                headers=teacher_headers,
            )
            logger.log_result(
                "Teacher Future Date Rejection",
                "POST",
                f"/api/v1/teacher/attendance/sections/{sec_2a.id}",
                res.status_code,
                400,
                (time.time() - t0) * 1000,
                f"Detail: {res.json().get('detail')}" if res.status_code == 400 else res.text,
            )

        # 2.6 Teacher Duplicate Submission (Duplicate 2-A on 2026-11-02 returns 409)
        if sec_2a:
            t0 = time.time()
            res = client.post(
                f"/api/v1/teacher/attendance/sections/{sec_2a.id}",
                json={"date": "2026-11-02", "period": 1, "records": [{"student_id": str(ada_student.id), "status": "PRESENT"}]},
                headers=teacher_headers,
            )
            logger.log_result(
                "Teacher Duplicate Submission Conflict (409)",
                "POST",
                f"/api/v1/teacher/attendance/sections/{sec_2a.id}",
                res.status_code,
                409,
                (time.time() - t0) * 1000,
                f"Conflict message: {res.json().get('detail')}" if res.status_code == 409 else res.text,
            )

        # 2.7 Teacher Section History
        if sec_2a:
            t0 = time.time()
            res = client.get(f"/api/v1/teacher/attendance/sections/{sec_2a.id}/history", headers=teacher_headers)
            logger.log_result(
                "Teacher Section History",
                "GET",
                f"/api/v1/teacher/attendance/sections/{sec_2a.id}/history",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Past sessions: {len(res.json())}" if res.status_code == 200 else res.text,
            )

        # =========================================================================
        # PART 3: STUDENT PORTAL ATTENDANCE APIS
        # =========================================================================
        # 3.1 Student Self Attendance
        t0 = time.time()
        res = client.get("/api/v1/students/me/attendance", headers=student_headers)
        logger.log_result(
            "Student Portal Attendance (/students/me/attendance)",
            "GET",
            "/api/v1/students/me/attendance",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Total: {res.json().get('total_classes')}, Attended: {res.json().get('attended_classes')}, Pct: {res.json().get('percentage')}%, Records: {len(res.json().get('records', []))}" if res.status_code == 200 else res.text,
        )

        # 3.2 Student Self Attendance (Alias /student/me/attendance)
        t0 = time.time()
        res = client.get("/api/v1/student/me/attendance", headers=student_headers)
        logger.log_result(
            "Student Portal Attendance Alias (/student/me/attendance)",
            "GET",
            "/api/v1/student/me/attendance",
            res.status_code,
            200,
            (time.time() - t0) * 1000,
            f"Success: {res.status_code == 200}",
        )

        # =========================================================================
        # PART 4: PARENT PORTAL ATTENDANCE APIS
        # =========================================================================
        # 4.1 Parent Child Attendance
        if ada_student:
            t0 = time.time()
            res = client.get(f"/api/v1/parents/me/children/{ada_student.id}/attendance", headers=parent_headers)
            logger.log_result(
                "Parent Portal Child Attendance (/parents/me/children/{id}/attendance)",
                "GET",
                f"/api/v1/parents/me/children/{ada_student.id}/attendance",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Total: {res.json().get('total_classes')}, Attended: {res.json().get('attended_classes')}, Pct: {res.json().get('percentage')}%" if res.status_code == 200 else res.text,
            )

            # 4.2 Parent Child Attendance Alias
            t0 = time.time()
            res = client.get(f"/api/v1/parent/children/{ada_student.id}/attendance", headers=parent_headers)
            logger.log_result(
                "Parent Portal Child Attendance Alias (/parent/children/{id}/attendance)",
                "GET",
                f"/api/v1/parent/children/{ada_student.id}/attendance",
                res.status_code,
                200,
                (time.time() - t0) * 1000,
                f"Success: {res.status_code == 200}",
            )

        # 4.3 Parent Unlinked Child Rejection (403/404)
        dummy_student_id = uuid.uuid4()
        t0 = time.time()
        res = client.get(f"/api/v1/parents/me/children/{dummy_student_id}/attendance", headers=parent_headers)
        logger.log_result(
            "Parent Unlinked Child Access Rejected",
            "GET",
            f"/api/v1/parents/me/children/{dummy_student_id}/attendance",
            res.status_code,
            403,
            (time.time() - t0) * 1000,
            f"Detail: {res.json().get('detail')}" if res.status_code == 403 else res.text,
        )

        # =========================================================================
        # PART 5: FRONTEND URL AVAILABILITY CHECKS
        # =========================================================================
        frontend_urls = [
            ("Admin Attendance UI", "http://localhost:3000/attendance"),
            ("Student Portal Attendance UI", "http://localhost:3001/attendance"),
            ("Parent Portal Children UI", "http://localhost:3001/children"),
        ]

        for name, url in frontend_urls:
            t0 = time.time()
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    code = response.getcode()
                    logger.log_result(name, "GET", url, code, 200, (time.time() - t0) * 1000, "Frontend page rendered successfully")
            except Exception as e:
                logger.log_result(name, "GET", url, 500, 200, (time.time() - t0) * 1000, f"Error reaching frontend: {e}")

        # 5.2 Next.js Proxy to Backend API (/api/v1/admin/attendance/overview)
        t0 = time.time()
        try:
            proxy_url = "http://localhost:3000/api/v1/admin/attendance/overview?date=2026-11-02"
            proxy_req = urllib.request.Request(
                proxy_url,
                headers={"Authorization": f"Bearer {admin_token}", "Accept": "application/json", "User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(proxy_req, timeout=5) as p_res:
                p_code = p_res.getcode()
                p_data = json.loads(p_res.read().decode())
                logger.log_result(
                    "Next.js Proxy API (/api/v1/admin/attendance/overview)",
                    "GET",
                    proxy_url,
                    p_code,
                    200,
                    (time.time() - t0) * 1000,
                    f"Proxied successfully via port 3000: marked={p_data.get('marked_sections')}/{p_data.get('total_sections')}"
                )
        except Exception as e:
            logger.log_result("Next.js Proxy API", "GET", proxy_url, 500, 200, (time.time() - t0) * 1000, f"Error: {e}")

    finally:
        db.close()
        logger.finish()


if __name__ == "__main__":
    run_tests()

