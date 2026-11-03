"""
Seed Script: Teacher Subject Assignments & Curriculum Subjects
Creates:
- Core Curriculum Subjects (Mathematics, Science, English, etc.)
- Realistic Faculty & Teacher accounts
- Academic Year, Grades & Sections associations
- Teacher Subject Assignments across multiple Grades & Sections
Safe & idempotent: checks before insert, never deletes existing data.
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
from app.models.academic_structure import AcademicYear, Grade, Section, TeacherSubject
from app.models.classroom import Subject
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services.id_generator import generate_employee_code


def seed_teacher_subjects(db: Session) -> dict:
    report = {
        "subjects_created": 0,
        "teachers_created": 0,
        "teacher_subjects_assigned": 0,
    }

    # 1. Academic Year (2026-2027)
    ay = db.execute(
        select(AcademicYear).where(AcademicYear.name == "2026-2027")
    ).scalar_one_or_none()
    if not ay:
        ay = AcademicYear(
            name="2026-2027",
            start_date=dt.date(2026, 6, 1),
            end_date=dt.date(2027, 4, 30),
            is_current=True,
            status="active",
        )
        db.add(ay)
        db.flush()

    # 2. Ensure Grades & Sections exist
    grades_to_seed = ["Grade 1", "Grade 2", "Grade 3"]
    grades_map: dict[str, Grade] = {}
    sections_map: dict[str, dict[str, Section]] = {}

    for idx, g_name in enumerate(grades_to_seed, start=1):
        grade = db.execute(select(Grade).where(Grade.name == g_name)).scalar_one_or_none()
        if not grade:
            grade = Grade(
                name=g_name,
                level=idx,
                academic_year_id=ay.id,
                status="active",
            )
            db.add(grade)
            db.flush()
        grades_map[g_name] = grade
        sections_map[g_name] = {}

        for sec_name in ["A", "B"]:
            sec = db.execute(
                select(Section).where(
                    Section.grade_id == grade.id,
                    Section.name == sec_name,
                )
            ).scalar_one_or_none()
            if not sec:
                sec = Section(
                    name=sec_name,
                    grade_id=grade.id,
                    academic_year_id=ay.id,
                    class_capacity=40,
                    status="active",
                )
                db.add(sec)
                db.flush()
            sections_map[g_name][sec_name] = sec

    # 3. Core Curriculum Subjects
    subjects_def = [
        {"name": "Mathematics", "code": "MATH-101", "dept": "Mathematics"},
        {"name": "General Science", "code": "SCI-101", "dept": "Science"},
        {"name": "English Literature", "code": "ENG-101", "dept": "Languages"},
        {"name": "Social Studies", "code": "SST-101", "dept": "Humanities"},
        {"name": "Computer Science", "code": "CS-101", "dept": "Computer Science"},
        {"name": "Visual Arts", "code": "ART-101", "dept": "Creative Arts"},
        {"name": "Physical Education", "code": "PE-101", "dept": "Athletics"},
    ]
    subjects_map: dict[str, Subject] = {}

    for s_def in subjects_def:
        subj = db.execute(
            select(Subject).where(Subject.code == s_def["code"])
        ).scalar_one_or_none()
        if not subj:
            subj = Subject(
                name=s_def["name"],
                code=s_def["code"],
                department=s_def["dept"],
                status="active",
            )
            db.add(subj)
            db.flush()
            report["subjects_created"] += 1
        else:
            subj.department = s_def["dept"]
            if subj.status != "active":
                subj.status = "active"
            db.flush()
        subjects_map[s_def["code"]] = subj

    # 4. Realistic Teachers
    teachers_def = [
        {
            "email": "rahul.sharma@school.edu",
            "first_name": "Rahul",
            "last_name": "Sharma",
            "department": "Mathematics",
            "phone": "+91-9876543210",
        },
        {
            "email": "priya.patel@school.edu",
            "first_name": "Priya",
            "last_name": "Patel",
            "department": "Science",
            "phone": "+91-9876543211",
        },
        {
            "email": "amit.verma@school.edu",
            "first_name": "Amit",
            "last_name": "Verma",
            "department": "Languages",
            "phone": "+91-9876543212",
        },
        {
            "email": "neha.gupta@school.edu",
            "first_name": "Neha",
            "last_name": "Gupta",
            "department": "Computer Science",
            "phone": "+91-9876543213",
        },
        {
            "email": "vikram.desai@school.edu",
            "first_name": "Vikram",
            "last_name": "Desai",
            "department": "Creative Arts",
            "phone": "+91-9876543214",
        },
    ]
    teachers_map: dict[str, Teacher] = {}

    for t_def in teachers_def:
        user = db.execute(
            select(User).where(User.email == t_def["email"])
        ).scalar_one_or_none()
        if not user:
            user = User(
                email=t_def["email"],
                password_hash=hash_password("Teacher@123"),
                role=UserRole.TEACHER.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(user)
            db.flush()

        teacher = db.execute(
            select(Teacher).where(Teacher.user_id == user.id)
        ).scalar_one_or_none()
        if not teacher:
            code = generate_employee_code(db)
            teacher = Teacher(
                employee_code=code,
                user_id=user.id,
                first_name=t_def["first_name"],
                last_name=t_def["last_name"],
                department=t_def["department"],
                phone=t_def["phone"],
            )
            db.add(teacher)
            db.flush()
            report["teachers_created"] += 1
        teachers_map[t_def["email"]] = teacher

    # 5. Teacher Subject Assignments
    assignments_plan = [
        # Rahul Sharma -> Mathematics
        ("rahul.sharma@school.edu", "MATH-101", "Grade 1", "A"),
        ("rahul.sharma@school.edu", "MATH-101", "Grade 2", "A"),
        ("rahul.sharma@school.edu", "MATH-101", "Grade 3", "B"),
        # Priya Patel -> Science
        ("priya.patel@school.edu", "SCI-101", "Grade 1", "A"),
        ("priya.patel@school.edu", "SCI-101", "Grade 2", "B"),
        ("priya.patel@school.edu", "SCI-101", "Grade 3", "A"),
        # Amit Verma -> English Literature & Social Studies
        ("amit.verma@school.edu", "ENG-101", "Grade 1", "A"),
        ("amit.verma@school.edu", "ENG-101", "Grade 2", "A"),
        ("amit.verma@school.edu", "SST-101", "Grade 2", "A"),
        ("amit.verma@school.edu", "SST-101", "Grade 3", "A"),
        # Neha Gupta -> Computer Science
        ("neha.gupta@school.edu", "CS-101", "Grade 2", "A"),
        ("neha.gupta@school.edu", "CS-101", "Grade 3", "A"),
        ("neha.gupta@school.edu", "CS-101", "Grade 3", "B"),
        # Vikram Desai -> Visual Arts & Physical Education
        ("vikram.desai@school.edu", "ART-101", "Grade 1", "B"),
        ("vikram.desai@school.edu", "ART-101", "Grade 2", "B"),
        ("vikram.desai@school.edu", "PE-101", "Grade 1", "A"),
        ("vikram.desai@school.edu", "PE-101", "Grade 2", "A"),
    ]

    for t_email, s_code, g_name, sec_name in assignments_plan:
        t = teachers_map[t_email]
        s = subjects_map[s_code]
        g = grades_map[g_name]
        sec = sections_map[g_name][sec_name]

        existing_ts = db.execute(
            select(TeacherSubject).where(
                TeacherSubject.teacher_id == t.id,
                TeacherSubject.subject_id == s.id,
                TeacherSubject.academic_year_id == ay.id,
                TeacherSubject.grade_id == g.id,
                TeacherSubject.section_id == sec.id,
            )
        ).scalar_one_or_none()

        if not existing_ts:
            ts = TeacherSubject(
                teacher_id=t.id,
                subject_id=s.id,
                academic_year_id=ay.id,
                grade_id=g.id,
                section_id=sec.id,
                status="active",
            )
            db.add(ts)
            db.flush()
            report["teacher_subjects_assigned"] += 1
        elif existing_ts.status != "active":
            existing_ts.status = "active"
            db.flush()

    db.commit()
    return report


if __name__ == "__main__":
    db = SessionLocal()
    try:
        res = seed_teacher_subjects(db)
        print("Successfully seeded teacher subjects dummy test data:")
        print(f" - Subjects Created: {res['subjects_created']}")
        print(f" - Teachers Created: {res['teachers_created']}")
        print(f" - Teacher Subjects Assigned: {res['teacher_subjects_assigned']}")
    finally:
        db.close()
