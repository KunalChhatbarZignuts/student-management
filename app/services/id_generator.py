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


def generate_employee_code(db: Session) -> str:
    """Generate employee code in format: EMP-0001."""
    seq = get_next_sequence_value(db, "teacher:employee_code")
    return f"EMP-{seq:04d}"
