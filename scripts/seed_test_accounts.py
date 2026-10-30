#!/usr/bin/env python3
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from argon2 import PasswordHasher
from app.db.session import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent, ParentStudentLink
from app.models.invite import Invite
from app.models.password_reset import PasswordReset
from app.core.security import hash_token

ph = PasswordHasher()
DEFAULT_PWD = ph.hash("Password123!")

def seed_test_accounts():
    db = SessionLocal()
    try:
        def get_or_create_user(email, role, status, must_change=False, totp_secret=None, totp_enabled=False, locked=False):
            u = db.query(User).filter(User.email == email.lower()).first()
            if not u:
                u = User(
                    email=email.lower(),
                    password_hash=DEFAULT_PWD,
                    role=role,
                    status=status,
                    must_change_password=must_change,
                    totp_secret=totp_secret,
                    totp_enabled=totp_enabled,
                )
                if locked:
                    u.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                    u.failed_login_count = 5
                db.add(u)
                db.flush()
            else:
                u.password_hash = DEFAULT_PWD
                u.status = status
                u.must_change_password = must_change
                u.totp_secret = totp_secret
                u.totp_enabled = totp_enabled
                if locked:
                    u.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                    u.failed_login_count = 5
                else:
                    u.locked_until = None
                    u.failed_login_count = 0
                db.flush()
            return u

        # Super admin
        admin = get_or_create_user("admin@example.com", UserRole.SUPER_ADMIN.value, UserStatus.ACTIVE.value, must_change=True)

        # Standard admin
        admin2 = get_or_create_user("admin_test@example.com", UserRole.ADMIN.value, UserStatus.ACTIVE.value, must_change=False)

        # Teacher
        t_user = get_or_create_user("teacher_test@example.com", UserRole.TEACHER.value, UserStatus.ACTIVE.value, must_change=False)
        t_prof = db.query(Teacher).filter(Teacher.user_id == t_user.id).first()
        if not t_prof:
            t_prof = Teacher(
                user_id=t_user.id,
                employee_code="EMP-2026-001",
                first_name="Alan",
                last_name="Turing",
                department="CS",
                phone="555-0101",
            )
            db.add(t_prof)

        # Student 1
        s_user1 = get_or_create_user("student_test@example.com", UserRole.STUDENT.value, UserStatus.ACTIVE.value, must_change=False)
        s_prof1 = db.query(Student).filter(Student.user_id == s_user1.id).first()
        if not s_prof1:
            s_prof1 = Student(
                user_id=s_user1.id,
                student_code="2026-CS-0001",
                first_name="Ada",
                last_name="Lovelace",
                dob=date(2008, 12, 10),
                class_name="Grade 10",
                section="A",
                department="CS",
                admission_date=date(2026, 9, 1),
                guardian_name="Lord Byron",
                guardian_phone="555-0201",
            )
            db.add(s_prof1)

        # Student 2
        s_user2 = get_or_create_user("student2_test@example.com", UserRole.STUDENT.value, UserStatus.ACTIVE.value, must_change=False)
        s_prof2 = db.query(Student).filter(Student.user_id == s_user2.id).first()
        if not s_prof2:
            s_prof2 = Student(
                user_id=s_user2.id,
                student_code="2026-CS-0002",
                first_name="Charles",
                last_name="Babbage",
                dob=date(2008, 11, 26),
                class_name="Grade 10",
                section="B",
                department="CS",
                admission_date=date(2026, 9, 1),
            )
            db.add(s_prof2)

        # Parent
        p_user = get_or_create_user("parent_test@example.com", UserRole.PARENT.value, UserStatus.ACTIVE.value, must_change=False)
        p_prof = db.query(Parent).filter(Parent.user_id == p_user.id).first()
        if not p_prof:
            p_prof = Parent(
                user_id=p_user.id,
                first_name="Lord",
                last_name="Byron",
                phone="555-0201",
            )
            db.add(p_prof)
            db.flush()

        # Link parent to student 1
        link = db.query(ParentStudentLink).filter(
            ParentStudentLink.parent_id == p_prof.id,
            ParentStudentLink.student_id == s_prof1.id,
        ).first()
        if not link:
            link = ParentStudentLink(parent_id=p_prof.id, student_id=s_prof1.id)
            db.add(link)

        # Suspended user
        get_or_create_user("suspended_test@example.com", UserRole.STUDENT.value, UserStatus.SUSPENDED.value)

        # Deactivated user
        get_or_create_user("deactivated_test@example.com", UserRole.STUDENT.value, UserStatus.DEACTIVATED.value)

        # Locked user
        get_or_create_user("locked_test@example.com", UserRole.STUDENT.value, UserStatus.LOCKED.value, locked=True)

        # Must change password
        get_or_create_user("must_change_test@example.com", UserRole.STUDENT.value, UserStatus.ACTIVE.value, must_change=True)

        # Admin with 2FA enabled
        get_or_create_user(
            "admin_2fa_test@example.com",
            UserRole.ADMIN.value,
            UserStatus.ACTIVE.value,
            totp_secret="JBSWY3DPEHPK3PXP",
            totp_enabled=True,
        )

        # Create valid and expired invites
        now = datetime.now(timezone.utc)
        inv_user = get_or_create_user("invite_user@example.com", UserRole.STUDENT.value, UserStatus.INVITED.value)

        # Valid invite token: "valid-invite-token-1234567890"
        val_hash = hash_token("valid-invite-token-1234567890")
        db.query(Invite).filter(Invite.token_hash == val_hash).delete()
        db.add(Invite(user_id=inv_user.id, token_hash=val_hash, expires_at=now + timedelta(days=2)))

        # Expired invite token: "expired-invite-token-1234567890"
        exp_hash = hash_token("expired-invite-token-1234567890")
        db.query(Invite).filter(Invite.token_hash == exp_hash).delete()
        db.add(Invite(user_id=inv_user.id, token_hash=exp_hash, expires_at=now - timedelta(days=2)))

        # Used invite token: "used-invite-token-1234567890"
        used_hash = hash_token("used-invite-token-1234567890")
        db.query(Invite).filter(Invite.token_hash == used_hash).delete()
        db.add(Invite(user_id=inv_user.id, token_hash=used_hash, expires_at=now + timedelta(days=2), used_at=now - timedelta(hours=1)))

        # Create valid and expired password resets for admin2
        val_rst_hash = hash_token("valid-reset-token-1234567890")
        db.query(PasswordReset).filter(PasswordReset.token_hash == val_rst_hash).delete()
        db.add(PasswordReset(user_id=admin2.id, token_hash=val_rst_hash, expires_at=now + timedelta(minutes=30)))

        exp_rst_hash = hash_token("expired-reset-token-1234567890")
        db.query(PasswordReset).filter(PasswordReset.token_hash == exp_rst_hash).delete()
        db.add(PasswordReset(user_id=admin2.id, token_hash=exp_rst_hash, expires_at=now - timedelta(minutes=30)))

        # Seed Academic Records for Ada Lovelace (s_prof1)
        from app.models.academic import AttendanceRecord, StudentMark, FeeInvoice
        db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s_prof1.id).delete()
        for i in range(1, 21):
            db.add(AttendanceRecord(
                student_id=s_prof1.id,
                date=date(2026, 10, i if i <= 28 else 28),
                status="excused" if i == 5 else ("absent" if i == 12 else "present"),
                notes="Dentist appointment" if i == 5 else None,
            ))

        db.query(StudentMark).filter(StudentMark.student_id == s_prof1.id).delete()
        marks_data = [
            ("Mathematics", "MATH-101", 100, 92, "A+", "Pass"),
            ("Computer Science", "CS-102", 100, 96, "A+", "Pass"),
            ("Physics", "PHY-103", 100, 84, "A", "Pass"),
            ("English Communication", "ENG-104", 100, 88, "A", "Pass"),
            ("Chemistry", "CHEM-105", 100, 78, "B+", "Pass"),
        ]
        for subj, code, max_s, obt_s, grd, st in marks_data:
            db.add(StudentMark(
                student_id=s_prof1.id,
                subject=subj,
                code=code,
                max_score=max_s,
                obtained_score=obt_s,
                grade=grd,
                status=st,
                term="Term 1 (2026-2027)",
            ))

        db.query(FeeInvoice).filter(FeeInvoice.student_id == s_prof1.id).delete()
        db.add(FeeInvoice(
            student_id=s_prof1.id,
            invoice_number="INV-2026-001",
            description="Term 1 Tuition & Laboratory Fee",
            amount=1250.00,
            due_date=date(2026, 9, 15),
            status="Paid",
        ))
        db.add(FeeInvoice(
            student_id=s_prof1.id,
            invoice_number="INV-2026-002",
            description="Term 2 Tuition & Facilities",
            amount=1250.00,
            due_date=date(2027, 1, 15),
            status="Pending",
        ))

        # Sync id_counters so sequence generator avoids colliding with seeded 0001/0002
        from sqlalchemy import text
        db.execute(text('''
            INSERT INTO id_counters (name, current_value) VALUES ('student:2026:CS', 10)
            ON CONFLICT (name) DO UPDATE SET current_value = GREATEST(id_counters.current_value, 10);
            INSERT INTO id_counters (name, current_value) VALUES ('teacher:employee_code', 10)
            ON CONFLICT (name) DO UPDATE SET current_value = GREATEST(id_counters.current_value, 10);
        '''))

        db.commit()
        print("✔ Seeded all test probe accounts and tokens successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_accounts()
