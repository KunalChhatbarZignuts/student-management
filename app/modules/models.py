"""Unified model registry for SQLAlchemy and Alembic migration discovery."""

from app.modules.ai.learning.models import (
    AIPracticeQuestion,
    AIPracticeSession,
    AIStudentMistake,
    AITopicMastery,
    ChapterTopic,
    RecommendationPriority,
    RecommendationStatus,
    StudyPlanStatus,
    SubjectChapter,
    TopicMasteryLevel,
)
from app.modules.ai.assistant.models import (
    AIStudentConversation,
    AIStudentMessage,
    MessageSender,
)
from app.modules.students.admission_models import Admission
from app.modules.examinations.models import (
    ExamStatus,
    ExamType,
    Examination,
    ExaminationSchedule,
    GradingScale,
    MarksStatus,
    ResultStatus,
    StudentExamMark,
    StudentExamResult,
)
from app.modules.fees.models import (
    FeeComponent,
    FeeInstallment,
    FeePayment,
    FeeStructure,
    FeeStructureItem,
    PaymentTransaction,
    PaymentWebhookEvent,
    StudentFeeAdjustment,
    StudentFeeAssignment,
    StudentFeeAssignmentItem,
)
from app.modules.academics.structure_models import (
    AcademicYear,
    EnrollmentStatus,
    Grade,
    Period,
    Section,
    Shift,
    StudentEnrollment,
    StudentTransferRecord,
    TeacherSubject,
    TeacherSubstitution,
    Timetable,
    TimetableEntry,
)
from app.modules.attendance.models import (
    AbsenceNotificationLog,
    AttendanceAuditHistory,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
)
from app.modules.audit.models import AuditLog
from app.modules.academics.calendar_models import (
    HolidayAuditHistory,
    HolidayCategory,
    SchoolCalendarSettings,
    SchoolHoliday,
    holiday_grade_associations,
    holiday_section_associations,
)
from app.modules.academics.classroom_models import Subject, TeacherAssignment
from app.modules.audit.counter_models import IdCounter
from app.modules.auth.invite_models import Invite
from app.modules.attendance.leave_models import LeaveStatus, LeaveSubmissionRole, StudentLeaveApplication
from app.modules.online_classroom.models import (
    OnlineClass,
    OnlineClassParticipant,
    OnlineClassRecording,
    OnlineClassStatus,
    OnlineClassroomAuditLog,
    OnlineMeetingSession,
    OnlineSessionAttendee,
)
from app.modules.students.parent_models import Parent, ParentStudentLink
from app.modules.auth.password_reset_models import PasswordReset
from app.modules.auth.refresh_token_models import RefreshToken
from app.modules.students.models import Student
from app.modules.teachers.models import Teacher
from app.modules.auth.models import User
from app.modules.diary.models import (
    DiaryEntry,
    DiaryEntryRecipient,
    DiaryAcknowledgement,
    DiaryConversation,
    DiaryMessage,
    DiaryNotification,
)

__all__ = [
    "AbsenceNotificationLog",
    "AcademicYear",
    "Admission",
    "AttendanceAuditHistory",
    "AttendanceRecord",
    "AttendanceSession",
    "AttendanceStatus",
    "AuditLog",
    "EnrollmentStatus",
    "ExamStatus",
    "ExamType",
    "Examination",
    "ExaminationSchedule",
    "FeeComponent",
    "FeeInstallment",
    "FeePayment",
    "FeeStructure",
    "FeeStructureItem",
    "Grade",
    "GradingScale",
    "HolidayAuditHistory",
    "HolidayCategory",
    "IdCounter",
    "Invite",
    "Parent",
    "ParentStudentLink",
    "PasswordReset",
    "PaymentTransaction",
    "PaymentWebhookEvent",
    "Period",
    "RefreshToken",
    "SchoolCalendarSettings",
    "SchoolHoliday",
    "Section",
    "Shift",
    "Student",
    "StudentEnrollment",
    "StudentTransferRecord",
    "StudentFeeAdjustment",
    "StudentFeeAssignment",
    "StudentFeeAssignmentItem",
    "StudentLeaveApplication",
    "LeaveStatus",
    "LeaveSubmissionRole",
    "MarksStatus",
    "OnlineClass",
    "OnlineClassRecording",
    "OnlineClassStatus",
    "OnlineClassroomAuditLog",
    "OnlineMeetingSession",
    "OnlineSessionAttendee",
    "ResultStatus",
    "StudentExamMark",
    "StudentExamResult",
    "Subject",
    "Teacher",
    "TeacherAssignment",
    "TeacherSubject",
    "TeacherSubstitution",
    "Timetable",
    "TimetableEntry",
    "User",
    "SubjectChapter",
    "ChapterTopic",
    "AIPracticeSession",
    "AIPracticeQuestion",
    "AIStudentConversation",
    "AIStudentMessage",
    "DiaryEntry",
    "DiaryEntryRecipient",
    "DiaryAcknowledgement",
    "DiaryConversation",
    "DiaryMessage",
    "DiaryNotification",
]
