import datetime as dt
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.models.parent import Parent, ParentStudentLink
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.examination import (
    ExaminationCreate,
    ExaminationDashboardMetrics,
    ExaminationNotificationResponse,
    ExaminationResponse,
    ExaminationScheduleCreate,
    ExaminationScheduleResponse,
    ExaminationScheduleUpdate,
    ExaminationUpdate,
    GradingScaleCreate,
    GradingScaleResponse,
    MarksBulkSaveRequest,
    PublishResultsRequest,
    ScheduleRosterResponse,
    StudentResultResponse,
)
from app.services import examination_service
from app.services.report_card_generator import generate_report_card_pdf

router = APIRouter(tags=["Examinations"])

admin_only = require_roles(UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)
teacher_only = require_roles(UserRole.TEACHER.value)
student_only = require_roles(UserRole.STUDENT.value)
parent_only = require_roles(UserRole.PARENT.value)


# ---------------------------------------------------------------------------
# Admin Endpoints: Dashboard & Examination CRUD
# ---------------------------------------------------------------------------

@router.get("/admin/examinations/dashboard-metrics", response_model=ExaminationDashboardMetrics)
def get_admin_dashboard_metrics(
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Retrieve statistical counters and overview metrics for examinations."""
    return examination_service.get_dashboard_metrics(db)


@router.get("/admin/examinations", response_model=list[ExaminationResponse])
def list_examinations_admin(
    academic_year_id: uuid.UUID | None = None,
    term: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """List all examinations with optional academic year, term, and status filters."""
    return examination_service.list_examinations(academic_year_id, term, status_filter, db)


@router.post("/admin/examinations", response_model=ExaminationResponse, status_code=status.HTTP_201_CREATED)
def create_examination_admin(
    payload: ExaminationCreate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Create a new examination (e.g. Unit Test, Mid-Term, Final)."""
    return examination_service.create_examination(payload, db)


@router.get("/admin/examinations/{examination_id}", response_model=ExaminationResponse)
def get_examination_detail_admin(
    examination_id: uuid.UUID,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Get single examination details with schedule summary."""
    return examination_service.get_examination(examination_id, db)


@router.put("/admin/examinations/{examination_id}", response_model=ExaminationResponse)
def update_examination_admin(
    examination_id: uuid.UUID,
    payload: ExaminationUpdate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Update examination properties."""
    return examination_service.update_examination(examination_id, payload, db)


@router.delete("/admin/examinations/{examination_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_examination_admin(
    examination_id: uuid.UUID,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Delete an uncompleted examination."""
    examination_service.delete_examination(examination_id, db)


# ---------------------------------------------------------------------------
# Admin Endpoints: Schedules & Conflict Validation
# ---------------------------------------------------------------------------

@router.get("/admin/examinations/{examination_id}/schedules", response_model=list[ExaminationScheduleResponse])
def list_examination_schedules(
    examination_id: uuid.UUID,
    grade_id: uuid.UUID | None = None,
    section_id: uuid.UUID | None = None,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """List subject exam schedules for an examination, optionally filtered by grade/section."""
    return examination_service.list_schedules_for_exam(examination_id, grade_id, section_id, db)


@router.post(
    "/admin/examinations/{examination_id}/schedules",
    response_model=ExaminationScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_examination_schedule(
    examination_id: uuid.UUID,
    payload: ExaminationScheduleCreate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Add a subject exam schedule with conflict, holiday, and room checks."""
    if payload.examination_id != examination_id:
        payload.examination_id = examination_id
    return examination_service.create_schedule_slot(payload, db)


@router.put(
    "/admin/examinations/schedules/{schedule_id}",
    response_model=ExaminationScheduleResponse,
)
def update_examination_schedule(
    schedule_id: uuid.UUID,
    payload: ExaminationScheduleUpdate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Update a subject schedule slot."""
    return examination_service.update_schedule_slot(schedule_id, payload, db)


@router.delete(
    "/admin/examinations/schedules/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_examination_schedule(
    schedule_id: uuid.UUID,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Remove a subject schedule slot."""
    examination_service.delete_schedule_slot(schedule_id, db)


# ---------------------------------------------------------------------------
# Admin Endpoints: Results Publishing & Grading Scales
# ---------------------------------------------------------------------------

@router.post("/admin/examinations/{examination_id}/publish-results")
def publish_results_endpoint(
    examination_id: uuid.UUID,
    payload: PublishResultsRequest = PublishResultsRequest(),
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Publish submitted examination results and notify students and parents."""
    count = examination_service.publish_results(examination_id, payload.section_id, current_user.id, db)
    return {"message": f"Successfully published {count} student result records.", "published_count": count}


@router.post("/admin/examinations/{examination_id}/unpublish-results")
def unpublish_results_endpoint(
    examination_id: uuid.UUID,
    payload: PublishResultsRequest = PublishResultsRequest(),
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Revert published results back to submitted state."""
    count = examination_service.unpublish_results(examination_id, payload.section_id, db)
    return {"message": f"Successfully unpublished {count} student result records.", "unpublished_count": count}


@router.get("/admin/grading-scales", response_model=list[GradingScaleResponse])
def get_grading_scales_admin(
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """List configurable grading tiers."""
    return examination_service.list_grading_scales(db)


@router.post("/admin/grading-scales", response_model=GradingScaleResponse, status_code=status.HTTP_201_CREATED)
def create_grading_scale_tier(
    payload: GradingScaleCreate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Create a new grading tier."""
    return examination_service.create_grading_tier(payload, db)


# ---------------------------------------------------------------------------
# Teacher Endpoints: Class Teacher Marks Entry & Conduction
# ---------------------------------------------------------------------------

@router.get("/teacher/examinations")
def get_teacher_examinations_list(
    current_user: User = Depends(teacher_only),
    db: Session = Depends(get_db),
):
    """List exam schedules for sections where the current teacher is the assigned Class Teacher."""
    return examination_service.get_teacher_examinations(current_user.id, db)


@router.get("/teacher/examinations/schedules/{schedule_id}/roster", response_model=ScheduleRosterResponse)
def get_teacher_schedule_roster(
    schedule_id: uuid.UUID,
    current_user: User = Depends(teacher_only),
    db: Session = Depends(get_db),
):
    """Get section student roster and existing draft marks for the Class Teacher."""
    return examination_service.get_schedule_roster(schedule_id, current_user.id, db, is_admin=False)


@router.post("/teacher/examinations/schedules/{schedule_id}/marks/draft", response_model=ScheduleRosterResponse)
def save_teacher_marks_draft(
    schedule_id: uuid.UUID,
    payload: MarksBulkSaveRequest,
    current_user: User = Depends(teacher_only),
    db: Session = Depends(get_db),
):
    """Save student marks as draft without final submission."""
    return examination_service.save_schedule_marks(schedule_id, payload, current_user.id, is_submit=False, db=db)


@router.post("/teacher/examinations/schedules/{schedule_id}/marks/submit", response_model=ScheduleRosterResponse)
def submit_teacher_marks(
    schedule_id: uuid.UUID,
    payload: MarksBulkSaveRequest,
    current_user: User = Depends(teacher_only),
    db: Session = Depends(get_db),
):
    """Submit student marks to administration for review and result publication."""
    return examination_service.save_schedule_marks(schedule_id, payload, current_user.id, is_submit=True, db=db)


# ---------------------------------------------------------------------------
# Student Portal Endpoints
# ---------------------------------------------------------------------------

@router.get("/students/me/examinations/upcoming", response_model=list[ExaminationScheduleResponse])
def get_student_upcoming_exams(
    current_user: User = Depends(student_only),
    db: Session = Depends(get_db),
):
    """Student portal: Upcoming offline examination schedule to physically attend at school."""
    student = db.execute(select(Student).where(Student.user_id == current_user.id)).scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return examination_service.get_student_upcoming_schedules(student.id, db)


@router.get("/students/me/examinations/past", response_model=list[ExaminationScheduleResponse])
def get_student_past_exams(
    current_user: User = Depends(student_only),
    db: Session = Depends(get_db),
):
    """Student portal: Past examinations list."""
    student = db.execute(select(Student).where(Student.user_id == current_user.id)).scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return examination_service.get_student_past_schedules(student.id, db)


@router.get("/students/me/examinations/results", response_model=list[StudentResultResponse])
def get_student_results_endpoint(
    examination_id: uuid.UUID | None = None,
    current_user: User = Depends(student_only),
    db: Session = Depends(get_db),
):
    """Student portal: View official published marks, grades, and percentage."""
    student = db.execute(select(Student).where(Student.user_id == current_user.id)).scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return examination_service.get_student_published_results(student.id, examination_id, db)


@router.get("/students/me/examinations/{examination_id}/report-card/pdf")
def download_student_report_card(
    examination_id: uuid.UUID,
    current_user: User = Depends(student_only),
    db: Session = Depends(get_db),
):
    """Stream official school report card PDF for student."""
    student = db.execute(select(Student).where(Student.user_id == current_user.id)).scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    results = examination_service.get_student_published_results(student.id, examination_id, db)
    if not results:
        raise HTTPException(status_code=404, detail="Published results not found for this examination")

    pdf_bytes = generate_report_card_pdf(results[0])
    filename = f"Report_Card_{results[0].student_name.replace(' ', '_')}_{results[0].exam_name.replace(' ', '_')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Parent Portal Endpoints
# ---------------------------------------------------------------------------

def _verify_parent_student_link(parent_user_id: uuid.UUID, child_id: uuid.UUID, db: Session) -> Parent:
    parent = db.execute(select(Parent).where(Parent.user_id == parent_user_id)).scalars().first()
    if not parent:
        raise HTTPException(status_code=403, detail="Parent profile not found")

    link = db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent.id,
            ParentStudentLink.student_id == child_id,
        )
    ).scalars().first()

    if not link:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to access records for this child.")
    return parent


@router.get("/parent/children/{child_id}/examinations/upcoming", response_model=list[ExaminationScheduleResponse])
def get_parent_child_upcoming_exams(
    child_id: uuid.UUID,
    current_user: User = Depends(parent_only),
    db: Session = Depends(get_db),
):
    """Parent portal: View linked child's upcoming offline examination schedule."""
    _verify_parent_student_link(current_user.id, child_id, db)
    return examination_service.get_student_upcoming_schedules(child_id, db)


@router.get("/parent/children/{child_id}/examinations/past", response_model=list[ExaminationScheduleResponse])
def get_parent_child_past_exams(
    child_id: uuid.UUID,
    current_user: User = Depends(parent_only),
    db: Session = Depends(get_db),
):
    """Parent portal: View linked child's completed examinations."""
    _verify_parent_student_link(current_user.id, child_id, db)
    return examination_service.get_student_past_schedules(child_id, db)


@router.get("/parent/children/{child_id}/examinations/results", response_model=list[StudentResultResponse])
def get_parent_child_results(
    child_id: uuid.UUID,
    examination_id: uuid.UUID | None = None,
    current_user: User = Depends(parent_only),
    db: Session = Depends(get_db),
):
    """Parent portal: View linked child's published marks and performance."""
    _verify_parent_student_link(current_user.id, child_id, db)
    return examination_service.get_student_published_results(child_id, examination_id, db)


@router.get("/parent/children/{child_id}/examinations/{examination_id}/report-card/pdf")
def download_parent_child_report_card(
    child_id: uuid.UUID,
    examination_id: uuid.UUID,
    current_user: User = Depends(parent_only),
    db: Session = Depends(get_db),
):
    """Parent portal: Stream linked child's official school report card PDF."""
    _verify_parent_student_link(current_user.id, child_id, db)
    results = examination_service.get_student_published_results(child_id, examination_id, db)
    if not results:
        raise HTTPException(status_code=404, detail="Published results not found for this examination")

    pdf_bytes = generate_report_card_pdf(results[0])
    filename = f"Report_Card_{results[0].student_name.replace(' ', '_')}_{results[0].exam_name.replace(' ', '_')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

