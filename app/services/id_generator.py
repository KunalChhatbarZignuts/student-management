from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.id_counter import IdCounter


def get_next_sequence_value(db: Session, counter_name: str) -> int:
    """Safely increment and return the next counter integer using atomic PostgreSQL upsert."""
    stmt = (
        insert(IdCounter)
        .values(name=counter_name, current_value=1)
        .on_conflict_do_update(
            index_elements=[IdCounter.name],
            set_={"current_value": IdCounter.current_value + 1},
        )
        .returning(IdCounter.current_value)
    )
    result = db.execute(stmt).scalar_one()
    db.flush()
    return result


def generate_student_code(db: Session, year: int, department: str) -> str:
    """Generate student code in format: YEAR-DEPT-SEQUENCE (e.g., 2026-CS-0001)."""
    clean_dept = department.strip().upper()
    counter_name = f"student:{year}:{clean_dept}"
    seq = get_next_sequence_value(db, counter_name)
    return f"{year}-{clean_dept}-{seq:04d}"


def generate_enrollment_number(db: Session, admission_year: int) -> str:
    """Generate immutable, unique student enrollment number in format: STU-YEAR-00001.
    
    Guarantees the counter starts above any existing enrollment numbers in the database.
    """
    counter_name = f"student:enrollment:{admission_year}"
    
    # Initialize counter if not yet present
    existing_counter = db.get(IdCounter, counter_name)
    if not existing_counter:
        from app.models.student import Student
        from sqlalchemy import select
        prefix = f"STU-{admission_year}-%"
        max_existing = db.execute(
            select(Student.enrollment_number)
            .where(Student.enrollment_number.like(prefix))
            .order_by(Student.enrollment_number.desc())
        ).scalars().first()
        init_val = 0
        if max_existing:
            try:
                init_val = int(max_existing.split("-")[-1])
            except ValueError:
                init_val = 0
        
        insert_stmt = (
            insert(IdCounter)
            .values(name=counter_name, current_value=init_val)
            .on_conflict_do_nothing(index_elements=[IdCounter.name])
        )
        db.execute(insert_stmt)
        db.flush()

    seq = get_next_sequence_value(db, counter_name)
    return f"STU-{admission_year}-{seq:05d}"


def generate_employee_code(db: Session) -> str:
    """Generate employee code in format: EMP-0001."""
    seq = get_next_sequence_value(db, "teacher:employee_code")
    return f"EMP-{seq:04d}"


def generate_admission_number(db: Session, admission_year: int) -> str:
    """Generate admission number in format: ADM-YEAR-00001."""
    counter_name = f"admission:number:{admission_year}"
    seq = get_next_sequence_value(db, counter_name)
    return f"ADM-{admission_year}-{seq:05d}"
