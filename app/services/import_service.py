import csv
import io
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import send_invite_email
from app.core.security import generate_secure_token, hash_token
from app.models.invite import Invite
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole, UserStatus
from app.services.audit_service import log_action
from app.services.id_generator import generate_employee_code, generate_student_code


def parse_and_validate_csv(
    db: Session,
    content: str,
    dry_run: bool = True,
    actor_id: Any = None,
    ip: str | None = None,
) -> dict[str, Any]:
    """Parse CSV, validate format, and either return validation report (dry_run) or import records."""
    f = io.StringIO(content.strip())
    reader = csv.DictReader(f)

    if not reader.fieldnames:
        return {"error": "Empty or invalid CSV file", "total_rows": 0, "rows": []}

    rows_report = []
    seen_emails_in_csv = set()
    total_valid = 0
    total_invalid = 0

    # Fetch existing emails from DB
    existing_emails = set(
        db.execute(select(User.email)).scalars().all()
    )

    for idx, row in enumerate(reader, start=1):
        errors = []
        user_type = (row.get("type") or "").strip().lower()
        email = (row.get("email") or "").strip().lower()
        first_name = (row.get("first_name") or "").strip()
        last_name = (row.get("last_name") or "").strip()
        dept = (row.get("department") or "").strip()

        # Validation checks
        if not user_type or user_type not in ("student", "teacher"):
            errors.append("Field 'type' must be either 'student' or 'teacher'")
        if not email or "@" not in email:
            errors.append("Invalid or missing email")
        elif email in seen_emails_in_csv:
            errors.append(f"Duplicate email '{email}' in CSV")
        elif email in existing_emails:
            errors.append(f"Email '{email}' already registered in database")
        else:
            seen_emails_in_csv.add(email)

        if not first_name:
            errors.append("Field 'first_name' is required")
        if not last_name:
            errors.append("Field 'last_name' is required")
        if not dept:
            errors.append("Field 'department' is required")

        dob_val = None
        adm_val = None
        if user_type == "student":
            dob_str = (row.get("dob") or "").strip()
            adm_str = (row.get("admission_date") or "").strip()
            class_name = (row.get("class_name") or "").strip()
            section = (row.get("section") or "").strip()

            if not class_name:
                errors.append("Field 'class_name' is required for students")
            if not section:
                errors.append("Field 'section' is required for students")

            try:
                dob_val = datetime.strptime(dob_str, "%Y-%m-%d").date() if dob_str else None
                if not dob_val:
                    errors.append("Field 'dob' (YYYY-MM-DD) is required for students")
            except ValueError:
                errors.append("Invalid 'dob' date format, expected YYYY-MM-DD")

            try:
                adm_val = datetime.strptime(adm_str, "%Y-%m-%d").date() if adm_str else None
                if not adm_val:
                    errors.append("Field 'admission_date' (YYYY-MM-DD) is required for students")
            except ValueError:
                errors.append("Invalid 'admission_date' date format, expected YYYY-MM-DD")

        if errors:
            total_invalid += 1
            rows_report.append({
                "row_index": idx,
                "status": "failed",
                "email": email,
                "errors": errors,
            })
            continue

        # If dry run, count as valid and skip creation
        if dry_run:
            total_valid += 1
            rows_report.append({
                "row_index": idx,
                "status": "valid",
                "type": user_type,
                "email": email,
                "name": f"{first_name} {last_name}",
            })
            continue

        # Non-dry-run: execute creation
        try:
            role = UserRole.STUDENT.value if user_type == "student" else UserRole.TEACHER.value
            user = User(
                email=email,
                role=role,
                status=UserStatus.INVITED.value,
                password_hash=None,
            )
            db.add(user)
            db.flush()

            identifier_code = ""
            if user_type == "student":
                identifier_code = generate_student_code(db, adm_val.year, dept)
                student = Student(
                    student_code=identifier_code,
                    user_id=user.id,
                    first_name=first_name,
                    last_name=last_name,
                    dob=dob_val,
                    class_name=row.get("class_name", "").strip(),
                    section=row.get("section", "").strip(),
                    department=dept,
                    admission_date=adm_val,
                    guardian_name=row.get("guardian_name"),
                    guardian_phone=row.get("guardian_phone"),
                    guardian_email=row.get("guardian_email"),
                )
                db.add(student)
            else:
                identifier_code = generate_employee_code(db)
                teacher = Teacher(
                    employee_code=identifier_code,
                    user_id=user.id,
                    first_name=first_name,
                    last_name=last_name,
                    department=dept,
                    phone=row.get("phone"),
                )
                db.add(teacher)

            db.flush()

            # Create invite
            raw_token = generate_secure_token()
            invite = Invite(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.INVITE_EXPIRE_HOURS),
            )
            db.add(invite)
            db.commit()

            # Dispatch invite email
            send_invite_email(user.email, raw_token)

            existing_emails.add(email)
            total_valid += 1
            rows_report.append({
                "row_index": idx,
                "status": "created",
                "email": email,
                "identifier": identifier_code,
                "type": user_type,
            })
        except Exception as e:
            db.rollback()
            total_invalid += 1
            rows_report.append({
                "row_index": idx,
                "status": "failed",
                "email": email,
                "errors": [str(e)],
            })

    if not dry_run and total_valid > 0:
        log_action(
            db,
            actor_user_id=actor_id,
            action="bulk_import_completed",
            entity_type="bulk_import",
            metadata={"total_valid": total_valid, "total_invalid": total_invalid},
            ip=ip,
        )

    return {
        "dry_run": dry_run,
        "total_rows": len(rows_report),
        "valid_rows": total_valid,
        "invalid_rows": total_invalid,
        "report": rows_report,
    }
