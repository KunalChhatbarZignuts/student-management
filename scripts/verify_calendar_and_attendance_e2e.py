import datetime as dt
import json

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.academic_structure import AcademicYear, Section
from app.models.teacher import Teacher
from app.models.user import User, UserRole

client = TestClient(app)


def main():
    db = SessionLocal()
    try:
        print("--- 1. Fetching Admin & Teacher Users ---")
        admin = db.execute(select(User).where(User.role.in_([UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]))).scalars().first()
        teacher_user = db.execute(select(User).where(User.role == UserRole.TEACHER.value)).scalars().first()

        assert admin is not None, "Admin user not found"
        assert teacher_user is not None, "Teacher user not found"

        admin_token = create_access_token(admin.id, admin.role)
        teacher_token = create_access_token(teacher_user.id, teacher_user.role)
        print("Generated tokens for admin and teacher.")

        print("\n--- 2. Fetch Holiday Categories ---")
        resp = client.get("/api/v1/admin/calendar/categories", headers={"Authorization": f"Bearer {admin_token}"})
        print(f"Status: {resp.status_code}, Categories count: {len(resp.json())}")
        assert resp.status_code == 200 and len(resp.json()) >= 8

        print("\n--- 3. Fetch Active School Holidays ---")
        resp = client.get("/api/v1/admin/calendar/holidays", headers={"Authorization": f"Bearer {admin_token}"})
        holidays = resp.json()
        print(f"Status: {resp.status_code}, Holidays count: {len(holidays)}")
        for h in holidays:
            print(f"  - {h['name']} ({h['start_date']} to {h['end_date']}) [{h['category_name']}]")
        assert resp.status_code == 200 and len(holidays) >= 6

        print("\n--- 4. Check November 2026 Monthly Calendar ---")
        resp = client.get("/api/v1/admin/calendar/monthly?year=2026&month=11", headers={"Authorization": f"Bearer {admin_token}"})
        month = resp.json()
        print(f"Status: {resp.status_code}, Total days: {month['total_days']}, Working: {month['working_days']}, Holidays: {month['holidays']}, Weekly Offs: {month['weekly_offs']}")
        assert resp.status_code == 200 and month["holidays"] >= 8

        print("\n--- 5. Date Working Status Checks ---")
        # Date during Diwali (2026-11-06)
        r1 = client.get("/api/v1/admin/calendar/check-date?date=2026-11-06", headers={"Authorization": f"Bearer {admin_token}"}).json()
        print(f"2026-11-06 (Diwali): is_working_day={r1['is_working_day']}, holiday_name={r1['holiday_name']}")
        assert r1["is_working_day"] is False and "Diwali" in r1["holiday_name"]

        # Sunday (2026-11-15, outside Diwali)
        r2 = client.get("/api/v1/admin/calendar/check-date?date=2026-11-15", headers={"Authorization": f"Bearer {admin_token}"}).json()
        print(f"2026-11-15 (Sunday): is_working_day={r2['is_working_day']}, day_type={r2['day_type']}")
        assert r2["is_working_day"] is False and r2["day_type"] == "weekly_off"

        # Regular Working Day (2026-11-02)
        r3 = client.get("/api/v1/admin/calendar/check-date?date=2026-11-02", headers={"Authorization": f"Bearer {admin_token}"}).json()
        print(f"2026-11-02 (Monday): is_working_day={r3['is_working_day']}, can_mark_attendance={r3['can_mark_attendance']}")
        assert r3["is_working_day"] is True and r3["can_mark_attendance"] is True

        print("\n--- 6. Teacher Read-Only Calendar Checks ---")
        resp = client.get("/api/v1/teacher/calendar/holidays", headers={"Authorization": f"Bearer {teacher_token}"})
        t_holidays = resp.json()
        print(f"Teacher holidays status: {resp.status_code}, count: {len(t_holidays)}")
        assert resp.status_code == 200

        print("\n--- 7. Attempt Attendance on Holiday (2026-11-06) -> MUST FAIL (400) ---")
        sec_resp = client.get("/api/v1/teacher/attendance/sections", headers={"Authorization": f"Bearer {teacher_token}"})
        sections = sec_resp.json()
        if sections:
            sec_id = sections[0]["section_id"]
            fail_resp = client.post(
                f"/api/v1/teacher/attendance/sections/{sec_id}",
                json={
                    "date": "2026-11-06",
                    "period": 1,
                    "records": [{"student_id": "00000000-0000-0000-0000-000000000001", "status": "PRESENT"}]
                },
                headers={"Authorization": f"Bearer {teacher_token}"},
            )
            print(f"Attendance marking on holiday HTTP Status: {fail_resp.status_code}, Response: {fail_resp.json()}")
            assert fail_resp.status_code == 400
            print("PASS: Backend correctly blocked attendance submission on holiday!")

        print("\n========================================================")
        print("ALL END-TO-END CALENDAR & DAILY ATTENDANCE CHECKS PASSED!")
        print("========================================================")

    finally:
        db.close()


if __name__ == "__main__":
    main()
