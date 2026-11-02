import datetime as dt
import uuid
from sqlalchemy import select
from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.classroom import TeacherAssignment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceAuditHistory


def seed_attendance():
    db = SessionLocal()
    try:
        # 1. Fetch Academic Year 2026-2027
        ay = db.execute(select(AcademicYear).where(AcademicYear.is_current == True)).scalars().first()
        if not ay:
            print("No current academic year found!")
            return

        # 2. Fetch Grades and Sections
        grade_2 = db.execute(select(Grade).where(Grade.name == "Grade 2", Grade.academic_year_id == ay.id)).scalars().first()
        grade_3 = db.execute(select(Grade).where(Grade.name == "Grade 3", Grade.academic_year_id == ay.id)).scalars().first()

        if not grade_2 or not grade_3:
            print("Grade 2 or Grade 3 not found!")
            return

        sec_2a = db.execute(select(Section).where(Section.name == "2-A", Section.grade_id == grade_2.id)).scalars().first()
        sec_2b = db.execute(select(Section).where(Section.name == "2-B", Section.grade_id == grade_2.id)).scalars().first()
        sec_3a = db.execute(select(Section).where(Section.name == "3-A", Section.grade_id == grade_3.id)).scalars().first()

        if not sec_2a or not sec_2b or not sec_3a:
            print("Sections 2-A, 2-B, or 3-A not found!")
            return

        # 3. Fetch Teachers
        sunita = db.execute(select(Teacher).where(Teacher.first_name == "Sunita")).scalars().first()
        rajesh = db.execute(select(Teacher).where(Teacher.first_name == "Rajesh")).scalars().first()
        pooja = db.execute(select(Teacher).where(Teacher.first_name == "Pooja")).scalars().first()
        alan = db.execute(select(Teacher).where(Teacher.first_name == "Alan")).scalars().first()

        # 4. Assign Teachers to Sections
        assignments_to_create = [
            (sunita, sec_2a, "CLASS_TEACHER", True),
            (alan, sec_2a, "SUBJECT_TEACHER", False),
            (rajesh, sec_2b, "CLASS_TEACHER", True),
            (pooja, sec_3a, "CLASS_TEACHER", True),
        ]

        for tch, sec, role, is_ct in assignments_to_create:
            if not tch:
                continue
            existing = db.execute(
                select(TeacherAssignment).where(
                    TeacherAssignment.teacher_id == tch.id,
                    TeacherAssignment.section_id == sec.id,
                )
            ).scalars().first()
            if not existing:
                db.add(TeacherAssignment(
                    teacher_id=tch.id,
                    section_id=sec.id,
                    assignment_type=role,
                    is_class_teacher=is_ct,
                    is_active=True,
                    status="active",
                ))
        db.flush()

        # 5. Seed Students & Enrollments for 2-A, 2-B, 3-A if needed
        demo_students_data = {
            sec_2a: [
                ("Aarav", "Sharma", "MALE", "2018-04-12"),
                ("Diya", "Patel", "FEMALE", "2018-07-25"),
                ("Kabir", "Mehta", "MALE", "2018-02-18"),
                ("Ananya", "Deshmukh", "FEMALE", "2018-09-05"),
                ("Ishaan", "Nair", "MALE", "2018-11-30"),
                ("Myra", "Bose", "FEMALE", "2018-03-14"),
            ],
            sec_2b: [
                ("Rohan", "Chopra", "MALE", "2018-05-19"),
                ("Saanvi", "Reddy", "FEMALE", "2018-08-22"),
                ("Vivaan", "Joshi", "MALE", "2018-01-10"),
                ("Kiara", "Kapoor", "FEMALE", "2018-10-15"),
                ("Reyansh", "Singh", "MALE", "2018-06-29"),
                ("Tara", "Malhotra", "FEMALE", "2018-12-04"),
            ],
            sec_3a: [
                ("Arjun", "Menon", "MALE", "2017-03-08"),
                ("Zara", "Khan", "FEMALE", "2017-06-17"),
                ("Aditya", "Rao", "MALE", "2017-09-21"),
                ("Riya", "Bansal", "FEMALE", "2017-11-11"),
                ("Samarth", "Kulkarni", "MALE", "2017-01-28"),
                ("Avani", "Gupta", "FEMALE", "2017-08-04"),
            ],
        }

        enrolled_by_section: dict[uuid.UUID, list[StudentEnrollment]] = {
            sec_2a.id: [],
            sec_2b.id: [],
            sec_3a.id: [],
        }

        # Check existing enrollments
        for sec, students_list in demo_students_data.items():
            existing_enrs = db.execute(
                select(StudentEnrollment).where(
                    StudentEnrollment.section_id == sec.id,
                    StudentEnrollment.status == "ACTIVE",
                ).order_by(StudentEnrollment.roll_no.asc())
            ).scalars().all()

            if len(existing_enrs) >= 4:
                enrolled_by_section[sec.id] = list(existing_enrs)
                print(f"Section {sec.name} already has {len(existing_enrs)} enrolled students.")
            else:
                roll = 1
                for fn, ln, gnd, dob_str in students_list:
                    uname = f"{fn.lower()}.{ln.lower()}_{uuid.uuid4().hex[:4]}@student.school.edu"
                    s_user = User(
                        email=uname,
                        role=UserRole.STUDENT.value,
                        status=UserStatus.ACTIVE.value,
                        password_hash=hash_password("Student@123"),
                    )
                    db.add(s_user)
                    db.flush()

                    st_code = f"STU-{fn[:3].upper()}{uuid.uuid4().hex[:4].upper()}"
                    enr_num = f"ENR-2026-{uuid.uuid4().hex[:5].upper()}"

                    stu = Student(
                        user_id=s_user.id,
                        first_name=fn,
                        last_name=ln,
                        student_code=st_code,
                        enrollment_number=enr_num,
                        dob=dt.date.fromisoformat(dob_str),
                        gender=gnd,
                        class_name=sec.grade.name,
                        section=sec.name,
                        department="Primary",
                        admission_date=dt.date(2026, 4, 1),
                        status="active",
                    )
                    db.add(stu)
                    db.flush()

                    enr = StudentEnrollment(
                        student_id=stu.id,
                        academic_year_id=ay.id,
                        grade_id=sec.grade_id,
                        section_id=sec.id,
                        roll_no=roll,
                        status="ACTIVE",
                        enrollment_date=dt.date(2026, 4, 1),
                    )
                    db.add(enr)
                    db.flush()
                    enrolled_by_section[sec.id].append(enr)
                    roll += 1
                print(f"Enrolled {len(students_list)} students in Section {sec.name}.")

        db.commit()

        # 6. Seed Attendance Sessions for the past 5 school days
        # E.g., yesterday and prior days
        today = dt.date.today()
        dates_to_seed = []
        cur = today - dt.timedelta(days=1)
        while len(dates_to_seed) < 4:
            if cur.weekday() < 5:  # Monday to Friday
                dates_to_seed.append(cur)
            cur -= dt.timedelta(days=1)
        dates_to_seed.reverse()

        admin_user = db.execute(select(User).where(User.role == UserRole.ADMIN.value)).scalars().first()

        for d in dates_to_seed:
            for sec, tch in [(sec_2a, sunita), (sec_2b, rajesh), (sec_3a, pooja)]:
                # Check if session exists
                existing_session = db.execute(
                    select(AttendanceSession).where(
                        AttendanceSession.section_id == sec.id,
                        AttendanceSession.date == d,
                        AttendanceSession.period == 1,
                    )
                ).scalars().first()

                if existing_session:
                    continue

                session = AttendanceSession(
                    academic_year_id=ay.id,
                    grade_id=sec.grade_id,
                    section_id=sec.id,
                    date=d,
                    period=1,
                    submission_status="submitted",
                    taken_by_teacher_id=tch.id if tch else None,
                    marked_by_user_id=tch.user_id if tch and tch.user_id else (admin_user.id if admin_user else None),
                )
                db.add(session)
                db.flush()

                enrs = enrolled_by_section[sec.id]
                for idx, enr in enumerate(enrs):
                    # Distribute status realistically: mostly PRESENT, occasionally ABSENT, LATE, or EXCUSED
                    if idx == 1:
                        st = "ABSENT"
                        rem = "Unwell"
                    elif idx == 3:
                        st = "LATE"
                        rem = "School bus delay"
                    elif idx == 5:
                        st = "EXCUSED"
                        rem = "Family function leave sanctioned"
                    else:
                        st = "PRESENT"
                        rem = None

                    rec = AttendanceRecord(
                        session_id=session.id,
                        student_id=enr.student_id,
                        enrollment_id=enr.id,
                        status=st,
                        remark=rem,
                        date=d,
                        marked_by_user_id=session.marked_by_user_id,
                    )
                    db.add(rec)
                    db.flush()

                    # Add an audit record for demonstration if it's the 1st day and 1st student
                    if d == dates_to_seed[0] and idx == 1 and admin_user:
                        audit = AttendanceAuditHistory(
                            record_id=rec.id,
                            session_id=session.id,
                            student_id=enr.student_id,
                            previous_status="UNMARKED",
                            new_status=st,
                            reason="Initial roll call recorded by class teacher",
                            modified_by_user_id=admin_user.id,
                        )
                        db.add(audit)

        db.commit()
        print("Attendance dummy data successfully seeded!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding attendance: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_attendance()

