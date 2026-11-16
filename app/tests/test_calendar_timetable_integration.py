import datetime as dt
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Period,
    Section,
    Shift,
    StudentEnrollment,
    Timetable,
    TimetableEntry,
)
from app.models.calendar import SchoolHoliday, HolidayCategory, CalendarSpecialWorkingDay
from app.models.classroom import Subject
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.parent import Parent, ParentStudentLink
from app.models.user import User, UserRole, UserStatus
from app.services.calendar_service import check_date_working_status
from app.services import timetable_service


@pytest.fixture
def integration_fixture(db: Session):
    uid = uuid.uuid4().hex[:6]

    # 1. Academic Year (covers Nov 2026)
    ay = AcademicYear(
        name=f"2026-2027-{uid}",
        start_date=dt.date(2026, 6, 1),
        end_date=dt.date(2027, 5, 31),
        is_current=True,
        status="active",
    )
    db.add(ay)

    # 2. Users
    admin_u = User(
        email=f"admin_cal_{uid}@school.edu",
        role=UserRole.ADMIN.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    teacher_u = User(
        email=f"teacher_cal_{uid}@school.edu",
        role=UserRole.TEACHER.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    student_u = User(
        email=f"student_cal_{uid}@school.edu",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    parent_u = User(
        email=f"parent_cal_{uid}@school.edu",
        role=UserRole.PARENT.value,
        status=UserStatus.ACTIVE.value,
        password_hash=hash_password("Pass123!"),
    )
    db.add_all([admin_u, teacher_u, student_u, parent_u])
    db.flush()

    # 3. Teacher profile
    t1 = Teacher(
        user_id=teacher_u.id,
        first_name="Ramesh",
        last_name="Gupta",
        employee_code=f"EMP-{uid}",
        department="Mathematics",
    )
    db.add(t1)
    db.flush()

    # 4. Subject
    math_sub = Subject(name=f"Mathematics {uid}", code=f"MATH-{uid}")
    db.add(math_sub)
    db.flush()

    # 5. Shift & Periods
    shift = Shift(
        name=f"Morning Shift {uid}",
        start_time=dt.time(7, 30),
        end_time=dt.time(13, 0),
        working_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday",
        status="active",
    )
    db.add(shift)
    db.flush()

    p1 = Period(
        shift_id=shift.id,
        number=1,
        name="Period 1",
        start_time=dt.time(7, 30),
        end_time=dt.time(8, 15),
        is_break=False,
    )
    p2 = Period(
        shift_id=shift.id,
        number=2,
        name="Period 2",
        start_time=dt.time(8, 15),
        end_time=dt.time(9, 0),
        is_break=False,
    )
    db.add_all([p1, p2])
    db.flush()

    # 6. Grade and Section
    grade_10 = Grade(
        name=f"Grade 10 {uid}",
        code=f"G10-{uid}",
        level=10,
        shift_id=shift.id,
        academic_year_id=ay.id,
        status="active",
    )
    db.add(grade_10)
    db.flush()

    sec_a = Section(
        grade_id=grade_10.id,
        name="10-A",
        academic_year_id=ay.id,
        status="active",
    )
    db.add(sec_a)
    db.flush()

    # 7. Student and Parent
    stu = Student(
        user_id=student_u.id,
        student_code=f"STU-{uid}",
        first_name="Ananya",
        last_name="Sharma",
        enrollment_number=f"ENR-{uid}",
        admission_date=dt.date.today(),
        dob=dt.date(2010, 5, 12),
        gender="female",
        class_name=grade_10.name,
        section=sec_a.name,
        department="General",
        status="active",
    )
    db.add(stu)
    db.flush()

    enr = StudentEnrollment(
        student_id=stu.id,
        grade_id=grade_10.id,
        section_id=sec_a.id,
        academic_year_id=ay.id,
        roll_no=1,
        status="ACTIVE",
    )
    db.add(enr)

    parent_profile = Parent(
        user_id=parent_u.id,
        first_name="Sanjay",
        last_name="Sharma",
        phone="9876543210",
    )
    db.add(parent_profile)
    db.flush()

    link = ParentStudentLink(
        parent_id=parent_profile.id,
        student_id=stu.id,
        relationship_type="father",
        is_primary_guardian=True,
        status="active",
    )
    db.add(link)

    # 8. Published Timetable with slots for Monday (1), Tuesday (2), Saturday (6)
    tt = Timetable(
        academic_year_id=ay.id,
        grade_id=grade_10.id,
        section_id=sec_a.id,
        shift_id=shift.id,
        version=1,
        status="published",
        published_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(tt)
    db.flush()

    # Monday slot
    e_mon = TimetableEntry(
        timetable_id=tt.id,
        day_of_week=1,
        period_id=p1.id,
        subject_id=math_sub.id,
        teacher_id=t1.id,
        room_number="Room 101",
    )
    # Tuesday slot
    e_tue = TimetableEntry(
        timetable_id=tt.id,
        day_of_week=2,
        period_id=p1.id,
        subject_id=math_sub.id,
        teacher_id=t1.id,
        room_number="Room 101",
    )
    # Wednesday slot
    e_wed = TimetableEntry(
        timetable_id=tt.id,
        day_of_week=3,
        period_id=p1.id,
        subject_id=math_sub.id,
        teacher_id=t1.id,
        room_number="Room 101",
    )
    # Saturday slot
    e_sat = TimetableEntry(
        timetable_id=tt.id,
        day_of_week=6,
        period_id=p1.id,
        subject_id=math_sub.id,
        teacher_id=t1.id,
        room_number="Room 101",
    )
    db.add_all([e_mon, e_tue, e_wed, e_sat])

    # 9. Holiday Category
    cat = db.query(HolidayCategory).filter(HolidayCategory.code == "diwali_vacation").first()
    if not cat:
        cat = HolidayCategory(name="Diwali Vacation", code="diwali_vacation", is_system=True, is_active=True)
        db.add(cat)
        db.flush()

    pub_cat = db.query(HolidayCategory).filter(HolidayCategory.code == "public_holiday").first()
    if not pub_cat:
        pub_cat = HolidayCategory(name="Public Holiday", code="public_holiday", is_system=True, is_active=True)
        db.add(pub_cat)
        db.flush()

    db.commit()

    admin_token = create_access_token(admin_u.id, admin_u.role)
    teacher_token = create_access_token(teacher_u.id, teacher_u.role)
    student_token = create_access_token(student_u.id, student_u.role)
    parent_token = create_access_token(parent_u.id, parent_u.role)

    return {
        "ay": ay,
        "shift": shift,
        "grade": grade_10,
        "section": sec_a,
        "teacher": t1,
        "teacher_user": teacher_u,
        "student": stu,
        "student_user": student_u,
        "parent_user": parent_u,
        "timetable": tt,
        "vacation_cat": cat,
        "pub_cat": pub_cat,
        "admin_token": admin_token,
        "teacher_token": teacher_token,
        "student_token": student_token,
        "parent_token": parent_token,
    }


def test_calendar_timetable_integration_all_scenarios(client: TestClient, integration_fixture, db: Session):
    fix = integration_fixture
    ay = fix["ay"]
    section = fix["section"]
    cat = fix["vacation_cat"]
    pub_cat = fix["pub_cat"]

    # Target Dates:
    # 2026-11-02: Monday (Regular working day)
    # 2026-11-03: Tuesday (Regular working day)
    # 2026-11-07: Saturday (Regular working day)
    # 2026-11-08: Sunday (Standard weekly off)
    # 2026-11-09 to 2026-11-14: Diwali Vacation (Multi-day school holiday)
    # 2026-11-16: Monday (First working day after vacation)
    # 2026-11-25: Wednesday (Guru Nanak Jayanti - single day public holiday)
    mon_date = dt.date(2026, 11, 2)
    tue_date = dt.date(2026, 11, 3)
    sat_date = dt.date(2026, 11, 7)
    sun_date = dt.date(2026, 11, 8)
    vacation_start = dt.date(2026, 11, 9)
    vacation_mid = dt.date(2026, 11, 11)
    vacation_end = dt.date(2026, 11, 14)
    after_vacation_date = dt.date(2026, 11, 16)
    single_holiday_date = dt.date(2026, 11, 25)

    # Add holidays to calendar
    single_holiday = SchoolHoliday(
        name="Guru Nanak Jayanti",
        category_id=pub_cat.id,
        academic_year_id=ay.id,
        start_date=single_holiday_date,
        end_date=single_holiday_date,
        description="Public holiday for Guru Nanak Jayanti",
        status="active",
    )
    diwali_vacation = SchoolHoliday(
        name="Diwali Festival Vacation",
        category_id=cat.id,
        academic_year_id=ay.id,
        start_date=vacation_start,
        end_date=vacation_end,
        description="Annual Diwali School Vacation",
        status="active",
    )
    db.add_all([single_holiday, diwali_vacation])
    db.commit()

    # ----------------------------------------------------
    # Scenario 1: Monday - regular timetable appears
    # ----------------------------------------------------
    res_mon = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=mon_date)
    assert res_mon is not None
    assert res_mon.is_holiday is False
    assert res_mon.date_status.is_working_day is True
    assert len(res_mon.entries) == 1
    assert res_mon.entries[0].day_of_week == 1

    # ----------------------------------------------------
    # Scenario 2: Tuesday - regular timetable appears
    # ----------------------------------------------------
    res_tue = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=tue_date)
    assert res_tue is not None
    assert res_tue.is_holiday is False
    assert res_tue.date_status.is_working_day is True
    assert len(res_tue.entries) == 1
    assert res_tue.entries[0].day_of_week == 2

    # ----------------------------------------------------
    # Scenario 3: Saturday - regular timetable appears
    # ----------------------------------------------------
    res_sat = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=sat_date)
    assert res_sat is not None
    assert res_sat.is_holiday is False
    assert res_sat.date_status.is_working_day is True
    assert len(res_sat.entries) == 1
    assert res_sat.entries[0].day_of_week == 6

    # ----------------------------------------------------
    # Scenario 4: Sunday - no regular timetable appears (weekly off)
    # ----------------------------------------------------
    res_sun = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=sun_date)
    assert res_sun is not None
    assert res_sun.is_holiday is True
    assert res_sun.date_status.is_working_day is False
    assert res_sun.date_status.day_type == "weekly_off"
    assert len(res_sun.entries) == 0  # Regular classes suppressed

    # ----------------------------------------------------
    # Scenario 5: Normal school holiday - timetable suppressed
    # ----------------------------------------------------
    res_single_hol = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=single_holiday_date)
    assert res_single_hol is not None
    assert res_single_hol.is_holiday is True
    assert res_single_hol.date_status.is_working_day is False
    assert res_single_hol.date_status.day_type == "holiday"
    assert res_single_hol.date_status.holiday_name == "Guru Nanak Jayanti"
    assert len(res_single_hol.entries) == 0  # Regular classes suppressed

    # ----------------------------------------------------
    # Scenario 6: Multi-day vacation - timetable suppressed for entire vacation
    # ----------------------------------------------------
    for d in [vacation_start, vacation_mid, vacation_end]:
        res_vac = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=d)
        assert res_vac is not None
        assert res_vac.is_holiday is True
        assert res_vac.date_status.is_working_day is False
        assert res_vac.date_status.day_type == "holiday"
        assert res_vac.date_status.holiday_name == "Diwali Festival Vacation"
        assert len(res_vac.entries) == 0  # Regular classes suppressed

    # ----------------------------------------------------
    # Scenario 7: Special working Sunday - follows calendar override
    # ----------------------------------------------------
    special_sun = CalendarSpecialWorkingDay(
        academic_year_id=ay.id,
        date=sun_date,
        reason="Pre-exam compensatory class",
    )
    db.add(special_sun)
    db.commit()

    res_special_sun = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=sun_date)
    assert res_special_sun is not None
    assert res_special_sun.is_holiday is False
    assert res_special_sun.date_status.is_working_day is True
    assert res_special_sun.date_status.day_type == "special_working_day"
    assert len(res_special_sun.entries) > 0  # Scheduled classes active!

    # ----------------------------------------------------
    # Scenario 8: Special working holiday - follows calendar override
    # ----------------------------------------------------
    special_vac = CalendarSpecialWorkingDay(
        academic_year_id=ay.id,
        date=vacation_mid,
        reason="Remedial workshop during break",
    )
    db.add(special_vac)
    db.commit()

    res_special_vac = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=vacation_mid)
    assert res_special_vac is not None
    assert res_special_vac.is_holiday is False
    assert res_special_vac.date_status.is_working_day is True
    assert res_special_vac.date_status.day_type == "special_working_day"
    assert len(res_special_vac.entries) > 0  # Classes active!

    # Clean up special working days
    db.delete(special_sun)
    db.delete(special_vac)
    db.commit()

    # ----------------------------------------------------
    # Scenario 9: First working day after vacation - regular timetable resumes automatically
    # ----------------------------------------------------
    res_after = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=after_vacation_date)
    assert res_after is not None
    assert res_after.is_holiday is False
    assert res_after.date_status.is_working_day is True
    assert len(res_after.entries) == 1
    assert res_after.entries[0].day_of_week == 1

    # ----------------------------------------------------
    # Scenario 10: Teacher portal views with calendar integration
    # ----------------------------------------------------
    teach_u = fix["teacher_user"]
    # Regular Monday
    teach_mon = timetable_service.get_teacher_personal_schedule(teach_u.id, ay.id, db, target_date=mon_date)
    assert teach_mon.is_holiday is False
    assert teach_mon.date_status.is_working_day is True
    assert len(teach_mon.slots) == 4
    assert any(s.day_of_week == 1 for s in teach_mon.slots)

    # Holiday
    teach_hol = timetable_service.get_teacher_personal_schedule(teach_u.id, ay.id, db, target_date=vacation_start)
    assert teach_hol.is_holiday is True
    assert teach_hol.date_status.is_working_day is False
    assert len(teach_hol.slots) == 0

    # ----------------------------------------------------
    # Scenario 11: Student portal view with calendar integration
    # ----------------------------------------------------
    stu_u = fix["student_user"]
    # Regular day
    stu_mon = timetable_service.get_student_timetable(stu_u.id, db, target_date=mon_date)
    assert stu_mon.is_holiday is False
    assert stu_mon.date_status.is_working_day is True
    assert len(stu_mon.entries) == 1

    # Holiday
    stu_hol = timetable_service.get_student_timetable(stu_u.id, db, target_date=vacation_start)
    assert stu_hol.is_holiday is True
    assert stu_hol.date_status.is_working_day is False
    assert len(stu_hol.entries) == 0

    # ----------------------------------------------------
    # Scenario 12: Parent portal view with calendar integration
    # ----------------------------------------------------
    parent_u = fix["parent_user"]
    stu = fix["student"]
    par_mon = timetable_service.get_child_timetable_for_parent(parent_u.id, stu.id, db, target_date=mon_date)
    assert par_mon.is_holiday is False
    assert par_mon.date_status.is_working_day is True
    assert len(par_mon.entries) == 1

    par_hol = timetable_service.get_child_timetable_for_parent(parent_u.id, stu.id, db, target_date=vacation_start)
    assert par_hol.is_holiday is True
    assert par_hol.date_status.is_working_day is False
    assert len(par_hol.entries) == 0

    # ----------------------------------------------------
    # Scenario 13: Attendance & Timetable consistency check
    # ----------------------------------------------------
    cal_status_mon = check_date_working_status(mon_date, ay.id, section.grade_id, section.id, db)
    assert cal_status_mon.is_working_day == res_mon.date_status.is_working_day
    assert cal_status_mon.day_type == res_mon.date_status.day_type

    cal_status_hol = check_date_working_status(vacation_start, ay.id, section.grade_id, section.id, db)
    assert cal_status_hol.is_working_day == res_vac.date_status.is_working_day
    assert cal_status_hol.day_type == res_vac.date_status.day_type

    # ----------------------------------------------------
    # Scenario 14: Existing weekly timetable without date parameter continues working
    # ----------------------------------------------------
    res_weekly = timetable_service.get_section_timetable(ay.id, section.id, False, db, target_date=None)
    assert res_weekly is not None
    assert res_weekly.target_date is None
    assert res_weekly.date_status is None
    assert res_weekly.is_holiday is False
    assert len(res_weekly.entries) == 4  # All 4 configured days (Mon, Tue, Wed, Sat)

    # ----------------------------------------------------
    # Scenario 15: Existing calendar APIs continue working
    # ----------------------------------------------------
    res_cal_check = client.get(
        f"/api/v1/admin/calendar/check-date?date={vacation_start.isoformat()}&academic_year_id={ay.id}",
        headers={"Authorization": f"Bearer {fix['admin_token']}"},
    )
    assert res_cal_check.status_code == 200
    cal_json = res_cal_check.json()
    assert cal_json["is_working_day"] is False
    assert cal_json["day_type"] == "holiday"
