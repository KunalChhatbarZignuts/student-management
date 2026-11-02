"""
Development Idempotent Dummy Data Seeder
Creates:
- Academic Years (2025-2026, 2026-2027 [current], 2027-2028)
- Grades: Nursery, LKG, UKG, Grade 1 through Grade 12
- Sections: Multiple sections per grade (e.g. 1-A, 1-B, 5-A, 5-B, 5-C, 10-A, 10-B, 10-C, 12-A, 12-B)
- Realistic sample Teachers assigned as Class Teachers
- Sample Students with STU-YYYY-XXXXX format enrollment numbers
Never resets, deletes, or truncates existing records. Safe to run repeatedly.
"""

import datetime as dt
import os
import sys
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.academic import FeeInvoice, StudentMark
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.attendance import AttendanceRecord
from app.models.classroom import TeacherAssignment
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services.id_generator import generate_employee_code, generate_enrollment_number, generate_student_code


def seed_data(db: Session) -> dict:
    env_name = getattr(settings, "ENVIRONMENT", os.getenv("ENVIRONMENT", "development"))
    if env_name.lower() == "production":
        raise RuntimeError("Refusing to seed dummy data in PRODUCTION environment!")

    report = {"years": 0, "grades": 0, "sections": 0, "teachers": 0, "students": 0, "parents": 0, "links": 0}

    # 1. Academic Years
    years_def = [
        {"name": "2025-2026", "start": dt.date(2025, 6, 1), "end": dt.date(2026, 4, 30), "current": False},
        {"name": "2026-2027", "start": dt.date(2026, 6, 1), "end": dt.date(2027, 4, 30), "current": True},
        {"name": "2027-2028", "start": dt.date(2027, 6, 1), "end": dt.date(2028, 4, 30), "current": False},
    ]
    years_map: dict[str, AcademicYear] = {}

    for y in years_def:
        existing_year = db.execute(select(AcademicYear).where(AcademicYear.name == y["name"])).scalar_one_or_none()
        if not existing_year:
            existing_year = AcademicYear(
                name=y["name"],
                start_date=y["start"],
                end_date=y["end"],
                is_current=y["current"],
                status="active",
            )
            db.add(existing_year)
            db.flush()
            report["years"] += 1
        years_map[y["name"]] = existing_year

    current_year = years_map["2026-2027"]

    # 2. Grades List
    grades_def = [
        ("Nursery", "NUR", 0),
        ("LKG", "LKG", 0),
        ("UKG", "UKG", 0),
        ("Grade 1", "G1", 1),
        ("Grade 2", "G2", 2),
        ("Grade 3", "G3", 3),
        ("Grade 4", "G4", 4),
        ("Grade 5", "G5", 5),
        ("Grade 6", "G6", 6),
        ("Grade 7", "G7", 7),
        ("Grade 8", "G8", 8),
        ("Grade 9", "G9", 9),
        ("Grade 10", "G10", 10),
        ("Grade 11", "G11", 11),
        ("Grade 12", "G12", 12),
    ]

    grades_map: dict[str, Grade] = {}
    for name, code, level in grades_def:
        g = db.execute(
            select(Grade).where(
                Grade.academic_year_id == current_year.id,
                Grade.name == name,
            )
        ).scalar_one_or_none()
        if not g:
            g = Grade(
                name=name,
                code=code,
                level=level,
                academic_year_id=current_year.id,
                status="active",
            )
            db.add(g)
            db.flush()
            report["grades"] += 1
        grades_map[name] = g

    # 3. Sections Configuration
    # Specific section counts matching requirements
    sections_plan = {
        "Nursery": ["A"],
        "LKG": ["A", "B"],
        "UKG": ["A", "B"],
        "Grade 1": ["1-A", "1-B"],
        "Grade 2": ["2-A", "2-B"],
        "Grade 3": ["3-A", "3-B"],
        "Grade 4": ["4-A", "4-B"],
        "Grade 5": ["5-A", "5-B", "5-C"],
        "Grade 6": ["6-A", "6-B"],
        "Grade 7": ["7-A", "7-B"],
        "Grade 8": ["8-A", "8-B"],
        "Grade 9": ["9-A", "9-B"],
        "Grade 10": ["10-A", "10-B", "10-C"],
        "Grade 11": ["11-A", "11-B"],
        "Grade 12": ["12-A", "12-B"],
    }

    sections_map: dict[str, Section] = {}
    for g_name, sec_names in sections_plan.items():
        grade = grades_map[g_name]
        for s_name in sec_names:
            key = f"{g_name}:{s_name}"
            sec = db.execute(
                select(Section).where(
                    Section.grade_id == grade.id,
                    Section.name == s_name,
                    Section.academic_year_id == current_year.id,
                )
            ).scalar_one_or_none()
            if not sec:
                sec = Section(
                    grade_id=grade.id,
                    name=s_name,
                    code=f"SEC-{s_name.replace(' ', '')}",
                    academic_year_id=current_year.id,
                    class_capacity=35,
                    status="active",
                )
                db.add(sec)
                db.flush()
                report["sections"] += 1
            sections_map[key] = sec

    # 4. Teachers Setup
    teachers_data = [
        {"first": "Sunita", "last": "Sharma", "email": "sunita.sharma@school.edu", "dept": "Mathematics"},
        {"first": "Rajesh", "last": "Verma", "email": "rajesh.verma@school.edu", "dept": "Science"},
        {"first": "Pooja", "last": "Iyer", "email": "pooja.iyer@school.edu", "dept": "English"},
        {"first": "Amit", "last": "Patel", "email": "amit.patel@school.edu", "dept": "Social Studies"},
        {"first": "Meera", "last": "Nair", "email": "meera.nair@school.edu", "dept": "Hindi"},
        {"first": "Vikas", "last": "Gupta", "email": "vikas.gupta@school.edu", "dept": "Computer Science"},
        {"first": "Ananya", "last": "Deshmukh", "email": "ananya.deshmukh@school.edu", "dept": "Physics"},
        {"first": "Karan", "last": "Malhotra", "email": "karan.malhotra@school.edu", "dept": "Chemistry"},
    ]

    teacher_objs: list[Teacher] = []
    default_pw_hash = hash_password("Teacher@1234")

    for t_data in teachers_data:
        u = db.execute(select(User).where(User.email == t_data["email"])).scalar_one_or_none()
        if not u:
            u = User(
                email=t_data["email"],
                password_hash=default_pw_hash,
                role=UserRole.TEACHER.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(u)
            db.flush()

        t = db.execute(select(Teacher).where(Teacher.user_id == u.id)).scalar_one_or_none()
        if not t:
            emp_code = generate_employee_code(db)
            t = Teacher(
                employee_code=emp_code,
                user_id=u.id,
                first_name=t_data["first"],
                last_name=t_data["last"],
                department=t_data["dept"],
                phone="+91 91234 56789",
            )
            db.add(t)
            db.flush()
            report["teachers"] += 1
        teacher_objs.append(t)

    # Assign Teachers as Class Teachers to Sections
    for idx, (sec_key, sec_obj) in enumerate(sections_map.items()):
        assigned_teacher = teacher_objs[idx % len(teacher_objs)]
        # Check if already assigned
        existing_assign = db.execute(
            select(TeacherAssignment).where(
                TeacherAssignment.section_id == sec_obj.id,
                TeacherAssignment.is_class_teacher.is_(True),
            )
        ).scalar_one_or_none()
        if not existing_assign:
            ta = TeacherAssignment(
                teacher_id=assigned_teacher.id,
                section_id=sec_obj.id,
                academic_year=current_year.name,
                assignment_type="CLASS_TEACHER",
                is_class_teacher=True,
                is_active=True,
                status="active",
            )
            db.add(ta)

    db.flush()

    # 5. Sample Students across Sections
    student_templates = [
        {"first": "Aarav", "last": "Mehta", "dob": dt.date(2011, 4, 15), "grade": "Grade 10", "sec": "10-A"},
        {"first": "Diya", "last": "Shah", "dob": dt.date(2011, 8, 22), "grade": "Grade 10", "sec": "10-A"},
        {"first": "Rohan", "last": "Joshi", "dob": dt.date(2011, 1, 10), "grade": "Grade 10", "sec": "10-B"},
        {"first": "Ananya", "last": "Pandey", "dob": dt.date(2011, 11, 5), "grade": "Grade 10", "sec": "10-C"},
        {"first": "Kabir", "last": "Kapoor", "dob": dt.date(2016, 5, 12), "grade": "Grade 5", "sec": "5-A"},
        {"first": "Sanya", "last": "Mirza", "dob": dt.date(2016, 9, 30), "grade": "Grade 5", "sec": "5-B"},
        {"first": "Vivaan", "last": "Reddy", "dob": dt.date(2016, 3, 18), "grade": "Grade 5", "sec": "5-C"},
        {"first": "Ishaan", "last": "Bansal", "dob": dt.date(2020, 7, 24), "grade": "Grade 1", "sec": "1-A"},
        {"first": "Avani", "last": "Sen", "dob": dt.date(2020, 10, 8), "grade": "Grade 1", "sec": "1-B"},
        {"first": "Arjun", "last": "Singhania", "dob": dt.date(2009, 2, 14), "grade": "Grade 12", "sec": "12-A"},
        {"first": "Tara", "last": "Sutaria", "dob": dt.date(2009, 6, 29), "grade": "Grade 12", "sec": "12-B"},
        {"first": "Reyansh", "last": "Chopra", "dob": dt.date(2022, 12, 1), "grade": "Nursery", "sec": "A"},
    ]

    student_pw_hash = hash_password("Student@1234")

    for idx, st_tpl in enumerate(student_templates, 1):
        email = f"{st_tpl['first'].lower()}.{st_tpl['last'].lower()}@student.school.edu"
        u = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if not u:
            u = User(
                email=email,
                password_hash=student_pw_hash,
                role=UserRole.STUDENT.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(u)
            db.flush()

        st = db.execute(select(Student).where(Student.user_id == u.id)).scalar_one_or_none()
        adm_year = 2026
        if not st:
            enrollment_num = generate_enrollment_number(db, adm_year)
            st_code = generate_student_code(db, adm_year, "GEN")
            st = Student(
                student_code=st_code,
                enrollment_number=enrollment_num,
                user_id=u.id,
                first_name=st_tpl["first"],
                last_name=st_tpl["last"],
                dob=st_tpl["dob"],
                class_name=st_tpl["grade"],
                section=st_tpl["sec"],
                department="General",
                admission_date=dt.date(adm_year, 6, 1),
                guardian_name=f"Parent of {st_tpl['first']}",
                guardian_phone="+91 98765 43210",
                guardian_email=f"parent.{st_tpl['first'].lower()}@example.com",
                status="active",
            )
            db.add(st)
            db.flush()
            report["students"] += 1

            # Create StudentEnrollment
            sec_lookup_key = f"{st_tpl['grade']}:{st_tpl['sec']}"
            sec_obj = sections_map.get(sec_lookup_key)
            grade_obj = grades_map.get(st_tpl["grade"])

            if sec_obj and grade_obj:
                enroll = StudentEnrollment(
                    student_id=st.id,
                    grade_id=grade_obj.id,
                    section_id=sec_obj.id,
                    academic_year_id=current_year.id,
                    roll_no=idx,
                    status="ACTIVE",
                    enrollment_date=dt.date(adm_year, 6, 1),
                    joined_on=dt.date(adm_year, 6, 1),
                )
                db.add(enroll)

    db.flush()

    # 6. Sample Parents & Parent-Student Relationships
    parent_pw_hash = hash_password("Parent@1234")
    parents_def = [
        {
            "email": "robert.kapoor@parent.school.edu",
            "first_name": "Robert",
            "last_name": "Kapoor",
            "phone": "+91 98220 11223",
            "address": "42 Galaxy Apartments, High Street",
            "children": [
                {"first": "Kabir", "last": "Kapoor", "relation": "Father", "primary": True},
                {"first": "Ishaan", "last": "Bansal", "relation": "Guardian", "primary": True},
            ],
        },
        {
            "email": "meera.kapoor@parent.school.edu",
            "first_name": "Meera",
            "last_name": "Kapoor",
            "phone": "+91 98220 11224",
            "address": "42 Galaxy Apartments, High Street",
            "children": [
                {"first": "Kabir", "last": "Kapoor", "relation": "Mother", "primary": False},
            ],
        },
        {
            "email": "rajesh.mehta@parent.school.edu",
            "first_name": "Rajesh",
            "last_name": "Mehta",
            "phone": "+91 98110 33445",
            "address": "15 Lotus Boulevard, Green Valley",
            "children": [
                {"first": "Aarav", "last": "Mehta", "relation": "Father", "primary": True},
            ],
        },
    ]

    for p_def in parents_def:
        p_user = db.execute(select(User).where(User.email == p_def["email"])).scalar_one_or_none()
        if not p_user:
            p_user = User(
                email=p_def["email"],
                password_hash=parent_pw_hash,
                role=UserRole.PARENT.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(p_user)
            db.flush()

        parent_rec = db.execute(select(Parent).where(Parent.user_id == p_user.id)).scalar_one_or_none()
        if not parent_rec:
            parent_rec = Parent(
                user_id=p_user.id,
                first_name=p_def["first_name"],
                last_name=p_def["last_name"],
                phone=p_def["phone"],
                address=p_def["address"],
            )
            db.add(parent_rec)
            db.flush()
            report["parents"] += 1

        # Link children
        for child_link_def in p_def["children"]:
            child_student = db.execute(
                select(Student).where(
                    Student.first_name == child_link_def["first"],
                    Student.last_name == child_link_def["last"],
                )
            ).scalar_one_or_none()

            if child_student:
                existing_link = db.execute(
                    select(ParentStudentLink).where(
                        ParentStudentLink.parent_id == parent_rec.id,
                        ParentStudentLink.student_id == child_student.id,
                    )
                ).scalar_one_or_none()

                if not existing_link:
                    link = ParentStudentLink(
                        parent_id=parent_rec.id,
                        student_id=child_student.id,
                        relationship_type=child_link_def["relation"],
                        is_primary_guardian=child_link_def["primary"],
                        verification_status="verified",
                        status="active",
                    )
                    db.add(link)
                    report["links"] += 1

                # Seed sample marks, attendance, and fee invoices for child if missing
                existing_mark = db.execute(
                    select(StudentMark).where(StudentMark.student_id == child_student.id)
                ).first()
                if not existing_mark:
                    subjects = [
                        ("Mathematics", "MATH-101", 100, 92, "A+"),
                        ("Science", "SCI-101", 100, 88, "A"),
                        ("English Language", "ENG-101", 100, 85, "A"),
                        ("Social Studies", "SOC-101", 100, 78, "B+"),
                    ]
                    for sub, code, max_s, obt_s, gr in subjects:
                        db.add(
                            StudentMark(
                                student_id=child_student.id,
                                subject=sub,
                                code=code,
                                max_score=max_s,
                                obtained_score=obt_s,
                                grade=gr,
                                status="Pass",
                                term="Term 1 (2026-2027)",
                            )
                        )

                existing_invoice = db.execute(
                    select(FeeInvoice).where(FeeInvoice.student_id == child_student.id)
                ).first()
                if not existing_invoice:
                    inv_code = f"INV-2026-{child_student.student_code[-4:]}"
                    db.add(
                        FeeInvoice(
                            student_id=child_student.id,
                            invoice_number=inv_code,
                            description="Term 1 Academic Tuition & Lab Fees",
                            amount=1250.0,
                            due_date=dt.date(2026, 9, 30),
                            status="Paid",
                        )
                    )
                    inv_code2 = f"INV-2027-{child_student.student_code[-4:]}"
                    db.add(
                        FeeInvoice(
                            student_id=child_student.id,
                            invoice_number=inv_code2,
                            description="Term 2 Academic Tuition Fees",
                            amount=1250.0,
                            due_date=dt.date(2027, 1, 15),
                            status="Pending",
                        )
                    )

                existing_att = db.execute(
                    select(AttendanceRecord).where(AttendanceRecord.student_id == child_student.id)
                ).first()
                if not existing_att:
                    today = dt.date.today()
                    for day_offset, st in enumerate(["present", "present", "present", "excused", "present"]):
                        db.add(
                            AttendanceRecord(
                                student_id=child_student.id,
                                date=today - dt.timedelta(days=day_offset + 1),
                                status=st,
                                notes="Medical appointment" if st == "excused" else "Regular attendance",
                            )
                        )

    db.commit()
    return report


if __name__ == "__main__":
    db = SessionLocal()
    try:
        res = seed_data(db)
        print("Idempotent seeding completed successfully:")
        for k, v in res.items():
            print(f"  - Added {v} new {k}")
    finally:
        db.close()
