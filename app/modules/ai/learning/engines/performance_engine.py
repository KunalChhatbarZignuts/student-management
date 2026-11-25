import datetime as dt
import logging
import uuid
from typing import Any
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import Session

from app.modules.students.models import Student
from app.modules.academics.structure_models import Grade, Section, AcademicYear, StudentEnrollment
from app.modules.academics.classroom_models import Subject
from app.modules.examinations.models import StudentExamMark, ExaminationSchedule, Examination, StudentExamResult
from app.modules.ai.learning.schemas import (
    SubjectPerformanceSummary,
    DataAttribution,
)

logger = logging.getLogger(__name__)


def compute_student_exam_performance(student_id: uuid.UUID, db: Session) -> dict[str, Any]:
    """
    Computes verified statistical performance directly from official published exam records.
    Distinguishes verified subject records from unverified chapter-level inferences.
    """
    marks_query = (
        select(
            StudentExamMark.marks_obtained,
            ExaminationSchedule.max_marks,
            Subject.name.label("subject_name"),
            Subject.code.label("subject_code"),
            Subject.id.label("subject_id"),
            Examination.name.label("exam_name"),
            Examination.start_date.label("exam_date"),
        )
        .join(ExaminationSchedule, StudentExamMark.schedule_id == ExaminationSchedule.id)
        .join(Subject, ExaminationSchedule.subject_id == Subject.id)
        .join(Examination, ExaminationSchedule.examination_id == Examination.id)
        .where(
            StudentExamMark.student_id == student_id,
            StudentExamMark.is_absent.is_(False),
            StudentExamMark.marks_obtained.isnot(None),
        )
        .order_by(Examination.start_date.asc())
    )
    records = db.execute(marks_query).all()

    subject_data: dict[str, list[dict[str, Any]]] = {}
    for r in records:
        if r.max_marks and r.max_marks > 0:
            pct = (r.marks_obtained / r.max_marks) * 100.0
        else:
            pct = 0.0

        if r.subject_name not in subject_data:
            subject_data[r.subject_name] = []
        subject_data[r.subject_name].append({
            "subject_id": r.subject_id,
            "subject_code": r.subject_code,
            "percentage": pct,
            "date": r.exam_date,
            "exam_name": r.exam_name,
        })

    subject_summaries: list[SubjectPerformanceSummary] = []
    total_pct_sum = 0.0
    total_exams_count = 0

    for subj_name, attempts in subject_data.items():
        avg_pct = round(sum(a["percentage"] for a in attempts) / len(attempts), 1)
        total_pct_sum += sum(a["percentage"] for a in attempts)
        total_exams_count += len(attempts)

        # Statistical trend determination
        if len(attempts) >= 2:
            first_half = attempts[:len(attempts) // 2]
            second_half = attempts[len(attempts) // 2:]
            avg_first = sum(a["percentage"] for a in first_half) / len(first_half)
            avg_second = sum(a["percentage"] for a in second_half) / len(second_half)
            diff = avg_second - avg_first
            if diff >= 5.0:
                trend = "IMPROVING"
            elif diff <= -5.0:
                trend = "DECLINING"
            else:
                trend = "STABLE"
        else:
            trend = "STABLE"

        # Explicit academic health categorization
        if avg_pct >= 80.0:
            status = "EXCELLING"
        elif avg_pct >= 65.0:
            status = "STRONG"
        elif avg_pct >= 50.0:
            status = "NEEDS_IMPROVEMENT"
        else:
            status = "CRITICAL_ATTENTION"

        subject_summaries.append(SubjectPerformanceSummary(
            subject_id=attempts[0]["subject_id"],
            subject_name=subj_name,
            subject_code=attempts[0]["subject_code"],
            average_marks=avg_pct,
            total_exams=len(attempts),
            status=status,
            trend=trend,
        ))

    overall_average = round(total_pct_sum / total_exams_count, 1) if total_exams_count > 0 else 0.0

    # Official historical exam timeline
    results_query = (
        select(
            StudentExamResult.percentage,
            StudentExamResult.overall_grade,
            Examination.name.label("exam_name"),
            Examination.start_date.label("exam_date"),
        )
        .join(Examination, StudentExamResult.examination_id == Examination.id)
        .where(StudentExamResult.student_id == student_id)
        .order_by(Examination.start_date.asc())
    )
    result_rows = db.execute(results_query).all()
    historical_improvement = [
        {
            "exam_name": row.exam_name,
            "percentage": round(row.percentage, 1),
            "grade": row.overall_grade,
            "date": str(row.exam_date),
        }
        for row in result_rows
    ]

    # Evidence attribution contract
    has_exams = len(records) > 0
    attribution = DataAttribution(
        exam_source="Verified Official Examination Marks" if has_exams else "No official examination marks recorded yet",
        practice_source="Formative Diagnostic Quizzes & Practice History",
        confidence="HIGH" if has_exams else "INSUFFICIENT_DATA",
        data_availability="EXAMINATION_AND_DIAGNOSTIC" if has_exams else "INSUFFICIENT_DATA",
    )

    return {
        "subject_summaries": subject_summaries,
        "overall_average": overall_average,
        "historical_improvement": historical_improvement,
        "attribution": attribution,
    }
