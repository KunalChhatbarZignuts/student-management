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


def seed_comprehensive_attendance():
    db = SessionLocal()
    try:
        # 1. Fetch Academic Year
        ay = db.execute(select(AcademicYear).where(AcademicYear.is_current == True)).scalars().first()
        if not ay:
            print("No current academic year found!")
            return

        # 2. Fetch Teachers
        teachers = db.execute(select(Teacher)).scalars().all()
        teacher_map = {f"{t.first_name} {t.last_name}": t for t in teachers}
        admin_user = db.execute(select(User).where(User.role == UserRole.ADMIN.value)).scalars().first()

        # Teacher assignments plan:
        # (Grade name, Section name, Teacher full name, is_class_teacher)
        assignment_plan = [
            ("Grade 1", "1-A", "Sunita Sharma", True),
            ("Grade 1", "1-B", "Pooja Iyer", True),
            ("Grade 2", "2-A", "Sunita Sharma", True),
            ("Grade 2", "2-B", "Rajesh Verma", True),
            ("Grade 3", "3-A", "Pooja Iyer", True),
            ("Grade 3", "3-B", "Amit Patel", True),
            ("Grade 4", "4-A", "Meera Nair", True),
            ("Grade 5", "5-A", "Vikas Gupta", True),
            ("Grade 8", "8-A", "Ananya Deshmukh", True),
            ("Grade 10", "10-A", "Karan Malhotra", True),
            ("Grade 10", "10-B", "Alan Turing", True),
        ]

        target_sections: dict[tuple[str, str], Section] = {}

        for g_name, s_name, t_name, is_ct in assignment_plan:
            grade = db.execute(
                select(Grade).where(Grade.name == g_name, Grade.academic_year_id == ay.id)
            ).scalars().first()
            if not grade:
                continue

            sec = db.execute(
                select(Section).where(Section.name == s_name, Section.grade_id == grade.id)
            ).scalars().first()
            if not sec:
                continue

            target_sections[(g_name, s_name)] = sec
            tch = teacher_map.get(t_name)
            if tch:
                existing_assignment = db.execute(
                    select(TeacherAssignment).where(
                        TeacherAssignment.teacher_id == tch.id,
                        TeacherAssignment.section_id == sec.id,
                    )
                ).scalars().first()
                if not existing_assignment:
                    db.add(TeacherAssignment(
                        teacher_id=tch.id,
                        section_id=sec.id,
                        assignment_type="CLASS_TEACHER" if is_ct else "SUBJECT_TEACHER",
                        is_class_teacher=is_ct,
                        is_active=True,
                        status="active",
                    ))

        db.flush()

        # 3. Seed Students & Enrollments for sections with fewer than 5 students
        student_pool = [
            ("Dev", "Patel", "MALE", "2017-02-14"),
            ("Aanya", "Kapoor", "FEMALE", "2017-06-19"),
            ("Rishi", "Sharma", "MALE", "2017-09-08"),
            ("Navya", "Joshi", "FEMALE", "2017-11-23"),
            ("Shaurya", "Verma", "MALE", "2017-03-30"),
            ("Prisha", "Nair", "FEMALE", "2017-08-12"),
            ("Kabir", "Singhania", "MALE", "2017-12-05"),
        ]

        section_enrollments: dict[uuid.UUID, list[StudentEnrollment]] = {}

        for (g_name, s_name), sec in target_sections.items():
            enrs = db.execute(
                select(StudentEnrollment).where(
                    StudentEnrollment.section_id == sec.id,
                    StudentEnrollment.status == "ACTIVE",
                ).order_by(StudentEnrollment.roll_no.asc())
            ).scalars().all()

            current_count = len(enrs)
            section_enrollments[sec.id] = list(enrs)

            if current_count < 5:
                needed = 5 - current_count
                for idx in range(needed):
                    fn, ln, gnd, dob_str = student_pool[idx % len(student_pool)]
                    unique = uuid.uuid4().hex[:4]
                    s_user = User(
                        email=f"{fn.lower()}.{ln.lower()}_{unique}@student.school.edu",
                        role=UserRole.STUDENT.value,
                        status=UserStatus.ACTIVE.value,
                        password_hash=hash_password("Student@123"),
                    )
                    db.add(s_user)
                    db.flush()

                    stu = Student(
                        user_id=s_user.id,
                        first_name=fn,
                        last_name=ln,
                        student_code=f"STU-{fn[:3].upper()}{unique.upper()}",
                        enrollment_number=f"ENR-2026-{uuid.uuid4().hex[:5].upper()}",
                        dob=dt.date.fromisoformat(dob_str),
                        gender=gnd,
                        class_name=g_name,
                        section=s_name,
                        department="General",
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
                        roll_no=current_count + idx + 1,
                        status="ACTIVE",
                        enrollment_date=dt.date(2026, 4, 1),
                    )
                    db.add(enr)
                    db.flush()
                    section_enrollments[sec.id].append(enr)
                print(f"Added {needed} students to {g_name} - {s_name} (Total now: {len(section_enrollments[sec.id])})")

        db.commit()

        # 4. Attendance Dates Setup
        past_dates = [
            dt.date(2026, 10, 27),
            dt.date(2026, 10, 28),
            dt.date(2026, 10, 29),
            dt.date(2026, 10, 30),
        ]
        today_date = dt.date(2026, 11, 2)

        # Today marked sections:
        today_marked_keys = {
            ("Grade 1", "1-A"),
            ("Grade 2", "2-A"),
            ("Grade 3", "3-A"),
            ("Grade 5", "5-A"),
            ("Grade 10", "10-A"),
        }

        # Seed past dates for ALL target sections
        for d in past_dates:
            for (g_name, s_name), sec in target_sections.items():
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
                    marked_by_user_id=admin_user.id if admin_user else None,
                )
                db.add(session)
                db.flush()

                enrs = section_enrollments[sec.id]
                for idx, enr in enumerate(enrs):
                    if idx == 1:
                        st, rem = "ABSENT", "Mild viral fever"
                    elif idx == 3:
                        st, rem = "LATE", "School bus delayed"
                    elif idx == 4:
                        st, rem = "EXCUSED", "Sports tournament sanctioned leave"
                    else:
                        st, rem = "PRESENT", None

                    rec = AttendanceRecord(
                        session_id=session.id,
                        student_id=enr.student_id,
                        enrollment_id=enr.id,
                        status=st,
                        remark=rem,
                        date=d,
                        marked_by_user_id=admin_user.id if admin_user else None,
                    )
                    db.add(rec)

        # Seed TODAY's attendance for the chosen 5 sections only (leaving others UNMARKED)
        records_for_audit = []
        for (g_name, s_name), sec in target_sections.items():
            if (g_name, s_name) not in today_marked_keys:
                continue

            existing_today_session = db.execute(
                select(AttendanceSession).where(
                    AttendanceSession.section_id == sec.id,
                    AttendanceSession.date == today_date,
                    AttendanceSession.period == 1,
                )
            ).scalars().first()

            if existing_today_session:
                continue

            session = AttendanceSession(
                academic_year_id=ay.id,
                grade_id=sec.grade_id,
                section_id=sec.id,
                date=today_date,
                period=1,
                submission_status="submitted",
                marked_by_user_id=admin_user.id if admin_user else None,
            )
            db.add(session)
            db.flush()

            enrs = section_enrollments[sec.id]
            for idx, enr in enumerate(enrs):
                if idx == 1:
                    st, rem = "ABSENT", "Sick leave"
                elif idx == 2 and len(enrs) > 4:
                    st, rem = "LATE", "Family emergency traffic"
                else:
                    st, rem = "PRESENT", None

                rec = AttendanceRecord(
                    session_id=session.id,
                    student_id=enr.student_id,
                    enrollment_id=enr.id,
                    status=st,
                    remark=rem,
                    date=today_date,
                    marked_by_user_id=admin_user.id if admin_user else None,
                )
                db.add(rec)
                db.flush()
                records_for_audit.append((rec, session, enr.student_id))

        # 5. Seed 4-6 rich audit correction logs
        audit_samples = [
            ("ABSENT", "EXCUSED", "Parent submitted verified doctor medical certificate"),
            ("ABSENT", "PRESENT", "Student arrived late during 2nd period roll-call reconciliation"),
            ("LATE", "PRESENT", "School bus gate scanner check confirmed on-time campus arrival"),
            ("ABSENT", "EXCUSED", "Inter-school science quiz competition duty sanctioned"),
        ]

        if admin_user and records_for_audit:
            for i, (rec, session, student_id) in enumerate(records_for_audit[:4]):
                prev_st, new_st, reason = audit_samples[i % len(audit_samples)]
                # update the record to the corrected status
                rec.status = new_st
                rec.remark = f"Corrected: {reason}"

                audit = AttendanceAuditHistory(
                    record_id=rec.id,
                    session_id=session.id,
                    student_id=student_id,
                    previous_status=prev_st,
                    new_status=new_st,
                    reason=reason,
                    modified_by_user_id=admin_user.id,
                    created_at=dt.datetime.now(dt.timezone.utc),
                )
                db.add(audit)

        db.commit()
        print("Comprehensive cross-grade attendance & audit data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding comprehensive attendance: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_comprehensive_attendance()

