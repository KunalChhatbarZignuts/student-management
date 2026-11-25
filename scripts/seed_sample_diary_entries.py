import datetime as dt
import uuid
from app.db.session import SessionLocal
from app.models.academic_structure import Section
from app.models.classroom import Subject
from app.models.diary import (
    DiaryAcknowledgement,
    DiaryConversation,
    DiaryEntry,
    DiaryEntryRecipient,
    DiaryMessage,
    DiaryNotification,
)
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User

def seed_diary():
    db = SessionLocal()
    try:
        # Check if entries already exist
        if db.query(DiaryEntry).count() > 0:
            print("Diary entries already exist. Skipping seed.")
            return

        teacher = db.query(Teacher).first()
        if not teacher:
            print("No teacher found in database.")
            return

        students = db.query(Student).all()
        if not students:
            print("No students found in database.")
            return

        subjects = db.query(Subject).all()
        math_subj = next((s for s in subjects if "Math" in s.name), subjects[0] if subjects else None)
        sci_subj = next((s for s in subjects if "Science" in s.name or "Physics" in s.name), subjects[1] if len(subjects) > 1 else math_subj)

        now = dt.datetime.now(dt.timezone.utc)
        today = dt.date.today()

        # 1. Homework Assignment (Requires Acknowledgement)
        e1 = DiaryEntry(
            teacher_id=teacher.id,
            section_id=students[0].current_section_id,
            subject_id=math_subj.id if math_subj else None,
            title="Quadratic Equations Practice Set 3",
            description="Solve exercises 3.1 to 3.5 on page 78. Ensure step-by-step proofs for word problems are written neatly in the homework notebook.",
            entry_type="HOMEWORK",
            category="Mathematics",
            entry_date=today,
            due_date=today + dt.timedelta(days=2),
            visibility="STUDENT_AND_PARENT",
            requires_acknowledgement=True,
            is_conversation_allowed=True,
            status="PUBLISHED",
            published_at=now,
            internal_notes="Focus group: check arithmetic signs for questions 4 and 5.",
            attachments=[{"name": "quadratics_worksheet.pdf", "url": "/docs/quadratics.pdf", "file_type": "pdf", "file_size": 204800}],
        )
        db.add(e1)
        db.flush()

        # 2. Daily Classroom Update
        e2 = DiaryEntry(
            teacher_id=teacher.id,
            section_id=students[0].current_section_id,
            subject_id=sci_subj.id if sci_subj else None,
            title="Classroom Update: Optics & Ray Diagrams",
            description="Today we covered Snell's law and total internal reflection with laser prism demonstrations. Please revise the angle of incidence formulas for tomorrow's quiz.",
            entry_type="DAILY_UPDATE",
            category="Science",
            entry_date=today,
            visibility="STUDENT_AND_PARENT",
            requires_acknowledgement=False,
            is_conversation_allowed=True,
            status="PUBLISHED",
            published_at=now,
        )
        db.add(e2)
        db.flush()

        # 3. Student Achievement & Positive Feedback
        e3 = DiaryEntry(
            teacher_id=teacher.id,
            section_id=students[0].current_section_id,
            title="Outstanding Debate Performance",
            description="Showed exemplary presentation skills and critical analysis in the Inter-Class Debate today. Keep up the high standard of preparation!",
            entry_type="ACHIEVEMENT",
            category="Extracurricular",
            entry_date=today,
            visibility="STUDENT_AND_PARENT",
            requires_acknowledgement=False,
            is_conversation_allowed=True,
            status="PUBLISHED",
            published_at=now,
        )
        db.add(e3)
        db.flush()

        # 4. Important Notice
        e4 = DiaryEntry(
            teacher_id=teacher.id,
            section_id=students[0].current_section_id,
            title="Annual Science Exhibition Registration",
            description="The Science Fair takes place next Friday. Parents are requested to sign the participation slip and submit project model proposals by tomorrow.",
            entry_type="NOTICE",
            category="General",
            entry_date=today,
            due_date=today + dt.timedelta(days=1),
            visibility="STUDENT_AND_PARENT",
            requires_acknowledgement=True,
            is_conversation_allowed=True,
            status="PUBLISHED",
            published_at=now,
        )
        db.add(e4)
        db.flush()

        # Add all students (or the first 15) as recipients
        target_students = students[:15]
        for e in [e1, e2, e3, e4]:
            for s in target_students:
                rec = DiaryEntryRecipient(
                    diary_entry_id=e.id,
                    student_id=s.id,
                    is_read_by_student=False,
                )
                db.add(rec)

        db.flush()

        # Add sample parent acknowledgement for student 0
        parent_link = db.query(ParentStudentLink).filter(ParentStudentLink.student_id == target_students[0].id).first()
        if parent_link:
            ack = DiaryAcknowledgement(
                diary_entry_id=e4.id,
                parent_id=parent_link.parent_id,
                student_id=target_students[0].id,
                notes="Reviewed notice and signed permission form.",
            )
            db.add(ack)

        db.commit()
        print(f"Successfully seeded 4 diary entries for {len(target_students)} students!")

    except Exception as exc:
        db.rollback()
        print(f"Seeding failed: {exc}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_diary()
