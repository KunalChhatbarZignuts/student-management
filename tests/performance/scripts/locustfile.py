"""
Student Management System — Locust Performance Test Suite v2
=============================================================
Key improvements over v1:
- Tokens obtained once at startup, shared across all users of same role
- No re-login during test run (avoids rate-limit 429)
- Student/parent endpoints fixed (correct path resolution)
- Parent child_id properly resolved
- Failure on 4xx/5xx explicitly flagged

Usage:
    source venv/bin/activate && python -m locust \
        --headless --users 10 --spawn-rate 2 --run-time 2m \
        --host http://127.0.0.1:8000 \
        --html tests/performance/reports/baseline_report.html \
        --csv  tests/performance/reports/baseline \
        -f tests/performance/scripts/locustfile.py
"""

import logging
import requests as _requests  # stdlib requests for setup, not locust client

from locust import HttpUser, TaskSet, task, between, events

log = logging.getLogger(__name__)

BASE_URL = "http://127.0.0.1:8000"
PASSWORD = "PerfTest@123"

LOGIN_CREDS = {
    "admin":   "perf.admin@perf.test",
    "teacher": "perf.teacher01@perf.test",
    "student": "perf.student01@perf.test",
    "parent":  "perf.parent01@perf.test",
}

# Pre-fetched shared tokens (populated in test_start event)
TOKENS: dict[str, str] = {}
CHILD_ID: str | None = None


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Login all roles once at test start to avoid rate-limit issues."""
    global CHILD_ID
    log.info("Pre-fetching auth tokens for all roles...")
    for role, email in LOGIN_CREDS.items():
        try:
            r = _requests.post(
                f"{BASE_URL}/api/v1/auth/login",
                json={"identifier": email, "password": PASSWORD},
                timeout=10,
            )
            if r.status_code == 200:
                TOKENS[role] = r.json()["access_token"]
                log.info(f"  ✅ {role} token acquired")
            else:
                log.error(f"  ❌ {role} login failed: {r.status_code} {r.text[:100]}")
        except Exception as e:
            log.error(f"  ❌ {role} login exception: {e}")

    # Resolve parent's first child ID
    if "parent" in TOKENS:
        try:
            r = _requests.get(
                f"{BASE_URL}/api/v1/parents/me/children",
                headers={"Authorization": f"Bearer {TOKENS['parent']}"},
                timeout=5,
            )
            if r.status_code == 200:
                data = r.json()
                items = data if isinstance(data, list) else (data.get("items") or data.get("data") or [])
                if items:
                    CHILD_ID = items[0].get("id") or items[0].get("student_id")
                    log.info(f"  Parent child_id: {CHILD_ID}")
        except Exception as e:
            log.warning(f"  Could not resolve parent child_id: {e}")


def auth_header(role: str) -> dict:
    token = TOKENS.get(role, "")
    return {"Authorization": f"Bearer {token}"}


def get(client, url, name, role, expected=(200, 204)):
    """Convenience wrapper — marks failure if status not in expected."""
    with client.get(url, name=name, headers=auth_header(role),
                    catch_response=True) as resp:
        if resp.status_code not in expected:
            resp.failure(f"{resp.status_code}: {resp.text[:80]}")
        else:
            resp.success()


# ─── Admin Journey ────────────────────────────────────────────────────────────

class AdminJourney(TaskSet):
    @task(5)
    def students_list(self):
        get(self.client, "/api/v1/admin/students?page=1&page_size=20",
            "[admin] GET /admin/students", "admin")

    @task(4)
    def teachers_list(self):
        get(self.client, "/api/v1/admin/teachers?page=1&page_size=20",
            "[admin] GET /admin/teachers", "admin")

    @task(3)
    def grades(self):
        get(self.client, "/api/v1/admin/grades",
            "[admin] GET /admin/grades", "admin")

    @task(3)
    def sections(self):
        get(self.client, "/api/v1/admin/sections",
            "[admin] GET /admin/sections", "admin")

    @task(2)
    def fees_dashboard(self):
        get(self.client, "/api/v1/admin/fees/dashboard",
            "[admin] GET /admin/fees/dashboard", "admin")

    @task(2)
    def exam_dashboard(self):
        get(self.client, "/api/v1/admin/examinations/dashboard-metrics",
            "[admin] GET /admin/examinations/dashboard-metrics", "admin")

    @task(2)
    def academic_years(self):
        get(self.client, "/api/v1/admin/academic-years",
            "[admin] GET /admin/academic-years", "admin")

    @task(1)
    def parents_list(self):
        get(self.client, "/api/v1/admin/parents?page=1&page_size=20",
            "[admin] GET /admin/parents", "admin")

    @task(1)
    def substitutions(self):
        get(self.client, "/api/v1/substitutions",
            "[admin] GET /substitutions", "admin")


# ─── Teacher Journey ──────────────────────────────────────────────────────────

class TeacherJourney(TaskSet):
    @task(5)
    def my_timetable(self):
        get(self.client, "/api/v1/teacher/timetable/me",
            "[teacher] GET /teacher/timetable/me", "teacher")

    @task(4)
    def my_sections(self):
        get(self.client, "/api/v1/teacher/my-sections",
            "[teacher] GET /teacher/my-sections", "teacher")

    @task(4)
    def my_classes(self):
        get(self.client, "/api/v1/teacher/classes",
            "[teacher] GET /teacher/classes", "teacher")

    @task(3)
    def attendance_sections(self):
        get(self.client, "/api/v1/teacher/attendance/sections",
            "[teacher] GET /teacher/attendance/sections", "teacher")

    @task(2)
    def my_subjects(self):
        get(self.client, "/api/v1/teacher/my-subjects",
            "[teacher] GET /teacher/my-subjects", "teacher")

    @task(2)
    def my_profile(self):
        get(self.client, "/api/v1/teacher/my-profile",
            "[teacher] GET /teacher/my-profile", "teacher")

    @task(2)
    def examinations(self):
        get(self.client, "/api/v1/teacher/examinations",
            "[teacher] GET /teacher/examinations", "teacher")

    @task(1)
    def calendar_holidays(self):
        get(self.client, "/api/v1/teacher/calendar/holidays",
            "[teacher] GET /teacher/calendar/holidays", "teacher")


# ─── Student Journey ──────────────────────────────────────────────────────────

class StudentJourney(TaskSet):
    @task(5)
    def my_profile(self):
        get(self.client, "/api/v1/students/me",
            "[student] GET /students/me", "student")

    @task(4)
    def my_attendance(self):
        get(self.client, "/api/v1/students/me/attendance",
            "[student] GET /students/me/attendance", "student")

    @task(4)
    def my_fees(self):
        get(self.client, "/api/v1/students/me/fees",
            "[student] GET /students/me/fees", "student")

    @task(3)
    def my_marks(self):
        get(self.client, "/api/v1/students/me/marks",
            "[student] GET /students/me/marks", "student")

    @task(2)
    def exam_results(self):
        get(self.client, "/api/v1/students/me/examinations/results",
            "[student] GET /students/me/examinations/results", "student")

    @task(2)
    def upcoming_exams(self):
        get(self.client, "/api/v1/students/me/examinations/upcoming",
            "[student] GET /students/me/examinations/upcoming", "student")

    @task(1)
    def my_enrollments(self):
        get(self.client, "/api/v1/students/me/enrollments",
            "[student] GET /students/me/enrollments", "student")


# ─── Parent Journey ───────────────────────────────────────────────────────────

class ParentJourney(TaskSet):
    @task(5)
    def my_children(self):
        get(self.client, "/api/v1/parents/me/children",
            "[parent] GET /parents/me/children", "parent")

    @task(3)
    def notifications(self):
        get(self.client, "/api/v1/parent/notifications",
            "[parent] GET /parent/notifications", "parent")

    @task(2)
    def child_attendance(self):
        if CHILD_ID:
            get(self.client, f"/api/v1/parents/me/children/{CHILD_ID}/attendance",
                "[parent] GET /parents/me/children/:id/attendance", "parent")

    @task(2)
    def child_fees(self):
        if CHILD_ID:
            get(self.client, f"/api/v1/parents/me/children/{CHILD_ID}/fees",
                "[parent] GET /parents/me/children/:id/fees", "parent")

    @task(1)
    def child_marks(self):
        if CHILD_ID:
            get(self.client, f"/api/v1/parents/me/children/{CHILD_ID}/marks",
                "[parent] GET /parents/me/children/:id/marks", "parent")


# ─── HttpUser classes (traffic weights) ──────────────────────────────────────

class AdminUser(HttpUser):
    tasks = [AdminJourney]
    wait_time = between(1, 3)
    weight = 20


class TeacherUser(HttpUser):
    tasks = [TeacherJourney]
    wait_time = between(1, 4)
    weight = 30


class StudentUser(HttpUser):
    tasks = [StudentJourney]
    wait_time = between(0.5, 2)
    weight = 35


class ParentUser(HttpUser):
    tasks = [ParentJourney]
    wait_time = between(2, 5)
    weight = 15
