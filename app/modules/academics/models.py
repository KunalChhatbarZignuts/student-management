"""Academic models package.

Classes, Grades, Sections, and Schedules are defined in:
- app.modules.academics.structure_models
- app.modules.academics.classroom_models
- app.modules.academics.calendar_models
"""

from app.modules.attendance.models import AttendanceRecord
from app.modules.academics.structure_models import AcademicYear, Grade, Section
from app.modules.academics.classroom_models import Subject, TeacherAssignment

__all__ = ["AttendanceRecord", "AcademicYear", "Grade", "Section", "Subject", "TeacherAssignment"]
