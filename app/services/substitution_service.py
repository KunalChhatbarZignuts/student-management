import datetime as dt
import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.academic_structure import (
    AcademicYear,
    Grade,
    Period,
    Section,
    TeacherSubject,
    TeacherSubstitution,
    Timetable,
    TimetableEntry,
)
from app.models.classroom import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.substitution import (
    AbsentTeacherCoverageResponse,
    AffectedTimetableSlot,
    SubstituteCandidate,
    SubstitutionCreateRequest,
    SubstitutionResponse,
)


def get_absent_teacher_coverage(
    db: Session,
    teacher_id: uuid.UUID,
    target_date: dt.date,
) -> AbsentTeacherCoverageResponse:
    """Fetch timetable slots for a teacher on a specific date and their substitution status."""
    teacher = db.get(Teacher, teacher_id)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

    # Day of week: Python Monday=0...Sunday=6, but system TimetableEntry uses Monday=1...Saturday=6
    day_of_week = target_date.isoweekday()  # 1 = Monday, 7 = Sunday
    if day_of_week == 7:
        # Sunday - no regular timetable
        return AbsentTeacherCoverageResponse(
            teacher_id=teacher.id,
            teacher_name=f"{teacher.first_name} {teacher.last_name}",
            employee_code=teacher.employee_code,
            department=teacher.department,
            date=target_date,
            attendance_status="ABSENT",
            total_slots_count=0,
            covered_slots_count=0,
            affected_slots=[],
        )

    # Find active timetable entries for this teacher on this day of week
    entries = db.scalars(
        select(TimetableEntry)
        .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
        .where(
            TimetableEntry.teacher_id == teacher.id,
            TimetableEntry.day_of_week == day_of_week,
            Timetable.status == "published",
        )
        .options(
            joinedload(TimetableEntry.period),
            joinedload(TimetableEntry.subject),
            joinedload(TimetableEntry.timetable).joinedload(Timetable.grade),
            joinedload(TimetableEntry.timetable).joinedload(Timetable.section),
        )
    ).all()

    # Query substitutions already assigned for this teacher on this date
    substitutions = db.scalars(
        select(TeacherSubstitution)
        .where(
            TeacherSubstitution.original_teacher_id == teacher.id,
            TeacherSubstitution.date == target_date,
            TeacherSubstitution.status != "CANCELLED",
        )
        .options(
            joinedload(TeacherSubstitution.substitute_teacher),
        )
    ).all()
    sub_map = {s.timetable_entry_id: s for s in substitutions}

    affected_slots: list[AffectedTimetableSlot] = []
    covered_count = 0

    # Sort entries by period number / start time
    sorted_entries = sorted(entries, key=lambda e: e.period.number if e.period else 0)

    for entry in sorted_entries:
        sub = sub_map.get(entry.id)
        is_covered = sub is not None
        if is_covered:
            covered_count += 1

        period = entry.period
        grade = entry.timetable.grade if entry.timetable else None
        section = entry.timetable.section if entry.timetable else None
        subject = entry.subject

        affected_slots.append(
            AffectedTimetableSlot(
                timetable_entry_id=entry.id,
                day_of_week=entry.day_of_week,
                period_id=entry.period_id,
                period_name=period.name if period else "Period",
                period_number=period.number if period else 0,
                start_time=period.start_time.strftime("%H:%M") if period and period.start_time else "",
                end_time=period.end_time.strftime("%H:%M") if period and period.end_time else "",
                grade_id=grade.id if grade else uuid.uuid4(),
                grade_name=grade.name if grade else "Grade",
                section_id=section.id if section else uuid.uuid4(),
                section_name=section.name if section else "Section",
                subject_id=subject.id if subject else None,
                subject_name=subject.name if subject else "General",
                original_teacher_id=teacher.id,
                original_teacher_name=f"{teacher.first_name} {teacher.last_name}",
                current_substitution_id=sub.id if sub else None,
                current_substitute_name=(
                    f"{sub.substitute_teacher.first_name} {sub.substitute_teacher.last_name}"
                    if sub and sub.substitute_teacher
                    else None
                ),
                substitution_status=sub.status if sub else None,
            )
        )

    return AbsentTeacherCoverageResponse(
        teacher_id=teacher.id,
        teacher_name=f"{teacher.first_name} {teacher.last_name}",
        employee_code=teacher.employee_code,
        department=teacher.department,
        date=target_date,
        attendance_status="ABSENT",
        total_slots_count=len(affected_slots),
        covered_slots_count=covered_count,
        affected_slots=affected_slots,
    )


def get_substitute_recommendations(
    db: Session,
    timetable_entry_id: uuid.UUID,
    target_date: dt.date,
) -> list[SubstituteCandidate]:
    """Find and rank all substitute teacher candidates for a specific slot on target_date."""
    entry = db.get(TimetableEntry, timetable_entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timetable entry not found")

    day_of_week = entry.day_of_week
    period_id = entry.period_id
    subject_id = entry.subject_id
    original_teacher_id = entry.teacher_id

    # 1. Fetch all teachers except the original teacher
    all_teachers = db.scalars(
        select(Teacher).where(Teacher.id != original_teacher_id)
    ).all()

    # 2. Find teachers who are already teaching during this exact period on this day of week
    busy_teacher_ids = set(
        db.scalars(
            select(TimetableEntry.teacher_id)
            .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
            .where(
                TimetableEntry.day_of_week == day_of_week,
                TimetableEntry.period_id == period_id,
                TimetableEntry.teacher_id.isnot(None),
                Timetable.status == "published",
            )
        ).all()
    )

    # 3. Find teachers already assigned as substitutes on this date for this period
    substitute_busy_ids = set(
        db.scalars(
            select(TeacherSubstitution.substitute_teacher_id)
            .join(TimetableEntry, TeacherSubstitution.timetable_entry_id == TimetableEntry.id)
            .where(
                TeacherSubstitution.date == target_date,
                TimetableEntry.period_id == period_id,
                TeacherSubstitution.status != "CANCELLED",
            )
        ).all()
    )

    conflict_ids = busy_teacher_ids.union(substitute_busy_ids)

    # 4. Find teachers assigned to this subject (via TeacherSubject mapping)
    subject_teacher_ids = set()
    if subject_id:
        subject_teacher_ids = set(
            db.scalars(
                select(TeacherSubject.teacher_id).where(
                    TeacherSubject.subject_id == subject_id
                )
            ).all()
        )

    # 5. Calculate daily workload (how many periods each teacher teaches on this day of week + existing substitutions)
    workload_rows = db.execute(
        select(TimetableEntry.teacher_id, func.count(TimetableEntry.id))
        .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
        .where(
            TimetableEntry.day_of_week == day_of_week,
            TimetableEntry.teacher_id.isnot(None),
            Timetable.status == "published",
        )
        .group_by(TimetableEntry.teacher_id)
    ).all()
    workload_map = {row[0]: row[1] for row in workload_rows}

    # Add substitutions on that date to workload
    sub_workload_rows = db.execute(
        select(TeacherSubstitution.substitute_teacher_id, func.count(TeacherSubstitution.id))
        .where(
            TeacherSubstitution.date == target_date,
            TeacherSubstitution.status != "CANCELLED",
        )
        .group_by(TeacherSubstitution.substitute_teacher_id)
    ).all()
    for row in sub_workload_rows:
        workload_map[row[0]] = workload_map.get(row[0], 0) + row[1]

    # Resolve subject department if possible
    subject = db.get(Subject, subject_id) if subject_id else None

    candidates: list[SubstituteCandidate] = []
    for t in all_teachers:
        is_conflict = t.id in conflict_ids
        conflict_reason = None
        if t.id in busy_teacher_ids:
            conflict_reason = "Already has a regular class scheduled in this period"
        elif t.id in substitute_busy_ids:
            conflict_reason = "Already assigned as a substitute in this period"

        is_sub_match = t.id in subject_teacher_ids
        # Department match check
        is_dept_match = bool(subject and subject.name and (subject.name.lower() in t.department.lower() or t.department.lower() in subject.name.lower()))
        if is_sub_match:
            is_dept_match = True

        daily_count = workload_map.get(t.id, 0)

        candidates.append(
            SubstituteCandidate(
                teacher_id=t.id,
                teacher_name=f"{t.first_name} {t.last_name}",
                employee_code=t.employee_code,
                department=t.department,
                is_subject_match=is_sub_match,
                is_department_match=is_dept_match,
                daily_assigned_periods_count=daily_count,
                is_available=not is_conflict,
                availability_conflict_reason=conflict_reason,
            )
        )

    # Sort based on User Choice Option 1-A:
    # 1. Available first
    # 2. Subject match first
    # 3. Department match
    # 4. Lowest daily workload
    # 5. Name alphabetically
    candidates.sort(
        key=lambda c: (
            not c.is_available,
            not c.is_subject_match,
            not c.is_department_match,
            c.daily_assigned_periods_count,
            c.teacher_name,
        )
    )

    return candidates


def create_substitution(
    db: Session,
    payload: SubstitutionCreateRequest,
    current_user: User,
) -> SubstitutionResponse:
    """Assign a substitute teacher to a scheduled class slot."""
    entry = db.get(TimetableEntry, payload.timetable_entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timetable entry not found")

    if not entry.teacher_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timetable slot does not have an assigned original teacher",
        )

    substitute = db.get(Teacher, payload.substitute_teacher_id)
    if not substitute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Substitute teacher not found")

    if substitute.id == entry.teacher_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Original teacher cannot be assigned as their own substitute",
        )

    # Check if a non-cancelled substitution already exists for this slot on this date
    existing = db.scalars(
        select(TeacherSubstitution).where(
            TeacherSubstitution.date == payload.date,
            TeacherSubstitution.timetable_entry_id == payload.timetable_entry_id,
            TeacherSubstitution.status != "CANCELLED",
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A substitute is already assigned for this timetable slot on this date",
        )

    # Check if substitute has a conflict
    conflict_regular = db.scalars(
        select(TimetableEntry)
        .join(Timetable, TimetableEntry.timetable_id == Timetable.id)
        .where(
            TimetableEntry.teacher_id == substitute.id,
            TimetableEntry.day_of_week == entry.day_of_week,
            TimetableEntry.period_id == entry.period_id,
            Timetable.status == "published",
        )
    ).first()
    if conflict_regular:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Substitute teacher {substitute.first_name} {substitute.last_name} already has a scheduled class in this period",
        )

    conflict_sub = db.scalars(
        select(TeacherSubstitution)
        .join(TimetableEntry, TeacherSubstitution.timetable_entry_id == TimetableEntry.id)
        .where(
            TeacherSubstitution.substitute_teacher_id == substitute.id,
            TeacherSubstitution.date == payload.date,
            TimetableEntry.period_id == entry.period_id,
            TeacherSubstitution.status != "CANCELLED",
        )
    ).first()
    if conflict_sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Substitute teacher {substitute.first_name} {substitute.last_name} is already substituting another class in this period",
        )

    sub = TeacherSubstitution(
        date=payload.date,
        timetable_entry_id=entry.id,
        original_teacher_id=entry.teacher_id,
        substitute_teacher_id=substitute.id,
        status="ASSIGNED",
        reason=payload.reason or "Teacher absence coverage",
        notes=payload.notes,
        assigned_by_user_id=current_user.id,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    original_teacher = db.get(Teacher, entry.teacher_id)
    period = entry.period
    timetable = entry.timetable
    grade = timetable.grade if timetable else None
    section = timetable.section if timetable else None
    subject = entry.subject

    return SubstitutionResponse(
        id=sub.id,
        date=sub.date,
        timetable_entry_id=sub.timetable_entry_id,
        original_teacher_id=sub.original_teacher_id,
        original_teacher_name=f"{original_teacher.first_name} {original_teacher.last_name}" if original_teacher else "",
        substitute_teacher_id=sub.substitute_teacher_id,
        substitute_teacher_name=f"{substitute.first_name} {substitute.last_name}",
        status=sub.status,
        reason=sub.reason,
        notes=sub.notes,
        period_name=period.name if period else "Period",
        grade_name=grade.name if grade else "Grade",
        section_name=section.name if section else "Section",
        subject_name=subject.name if subject else None,
        created_at=sub.created_at,
    )


def cancel_substitution(
    db: Session,
    substitution_id: uuid.UUID,
    reason: Optional[str] = None,
) -> SubstitutionResponse:
    """Cancel an assigned substitution."""
    sub = db.get(TeacherSubstitution, substitution_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Substitution not found")

    sub.status = "CANCELLED"
    if reason:
        sub.notes = f"{sub.notes or ''} [Cancelled: {reason}]".strip()
    db.commit()
    db.refresh(sub)

    entry = db.get(TimetableEntry, sub.timetable_entry_id)
    original_teacher = db.get(Teacher, sub.original_teacher_id)
    substitute = db.get(Teacher, sub.substitute_teacher_id)
    period = entry.period if entry else None
    timetable = entry.timetable if entry else None
    grade = timetable.grade if timetable else None
    section = timetable.section if timetable else None
    subject = entry.subject if entry else None

    return SubstitutionResponse(
        id=sub.id,
        date=sub.date,
        timetable_entry_id=sub.timetable_entry_id,
        original_teacher_id=sub.original_teacher_id,
        original_teacher_name=f"{original_teacher.first_name} {original_teacher.last_name}" if original_teacher else "",
        substitute_teacher_id=sub.substitute_teacher_id,
        substitute_teacher_name=f"{substitute.first_name} {substitute.last_name}" if substitute else "",
        status=sub.status,
        reason=sub.reason,
        notes=sub.notes,
        period_name=period.name if period else "Period",
        grade_name=grade.name if grade else "Grade",
        section_name=section.name if section else "Section",
        subject_name=subject.name if subject else None,
        created_at=sub.created_at,
    )


def list_substitutions(
    db: Session,
    target_date: Optional[dt.date] = None,
    teacher_id: Optional[uuid.UUID] = None,
    as_substitute: bool = False,
) -> list[SubstitutionResponse]:
    """List substitutions with optional filters for date and teacher."""
    stmt = select(TeacherSubstitution).options(
        joinedload(TeacherSubstitution.original_teacher),
        joinedload(TeacherSubstitution.substitute_teacher),
        joinedload(TeacherSubstitution.timetable_entry).joinedload(TimetableEntry.period),
        joinedload(TeacherSubstitution.timetable_entry).joinedload(TimetableEntry.subject),
        joinedload(TeacherSubstitution.timetable_entry).joinedload(TimetableEntry.timetable).joinedload(Timetable.grade),
        joinedload(TeacherSubstitution.timetable_entry).joinedload(TimetableEntry.timetable).joinedload(Timetable.section),
    )

    if target_date:
        stmt = stmt.where(TeacherSubstitution.date == target_date)

    if teacher_id:
        if as_substitute:
            stmt = stmt.where(TeacherSubstitution.substitute_teacher_id == teacher_id)
        else:
            stmt = stmt.where(
                or_(
                    TeacherSubstitution.original_teacher_id == teacher_id,
                    TeacherSubstitution.substitute_teacher_id == teacher_id,
                )
            )

    substitutions = db.scalars(stmt.order_by(TeacherSubstitution.created_at.desc())).all()
    results: list[SubstitutionResponse] = []

    for sub in substitutions:
        entry = sub.timetable_entry
        orig = sub.original_teacher
        subs = sub.substitute_teacher
        period = entry.period if entry else None
        timetable = entry.timetable if entry else None
        grade = timetable.grade if timetable else None
        section = timetable.section if timetable else None
        subject = entry.subject if entry else None

        results.append(
            SubstitutionResponse(
                id=sub.id,
                date=sub.date,
                timetable_entry_id=sub.timetable_entry_id,
                original_teacher_id=sub.original_teacher_id,
                original_teacher_name=f"{orig.first_name} {orig.last_name}" if orig else "",
                substitute_teacher_id=sub.substitute_teacher_id,
                substitute_teacher_name=f"{subs.first_name} {subs.last_name}" if subs else "",
                status=sub.status,
                reason=sub.reason,
                notes=sub.notes,
                period_name=period.name if period else "Period",
                grade_name=grade.name if grade else "Grade",
                section_name=section.name if section else "Section",
                subject_name=subject.name if subject else None,
                created_at=sub.created_at,
            )
        )

    return results
