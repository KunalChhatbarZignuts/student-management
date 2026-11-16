"""Seed script to generate realistic demonstration examination data.

Populates:
1. Standard Grading Scale
2. "Term 1 - Unit Test 1": PUBLISHED results, realistic marks, grades, and report cards for Grade 1-A and Grade 5-A.
3. "Term 1 - Mid-Term Examination": SCHEDULED & ONGOING with draft marks ready for teacher entry.
4. "Term 2 - Final Examination": DRAFT future examination.
"""

import datetime as dt
import logging
import sys

from app.db.session import SessionLocal
from app.models.academic_structure import AcademicYear, Grade, Section, StudentEnrollment
from app.models.classroom import Subject, TeacherAssignment
from app.models.examination import (
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
from app.models.student import Student
from app.models.user import User, UserRole
from app.services.examination_service import calculate_grade, ensure_default_grading_scale

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_examinations() -> None:
    db = SessionLocal()
    try:
        logger.info("Initializing examination seed...")
        ensure_default_grading_scale(db)

        # 1. Fetch current academic year
        ay = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
        if not ay:
            ay = db.query(AcademicYear).order_by(AcademicYear.start_date.desc()).first()
        if not ay:
            logger.error("No academic year found.")
            return

        # Fetch Admin user for publishing
        admin_user = db.query(User).filter(User.role.in_([UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value])).first()

        # Fetch sections
        sec1a = db.query(Section).join(Grade).filter(Grade.name == "Grade 1", Section.name == "1-A").first()
        sec5a = db.query(Section).join(Grade).filter(Grade.name == "Grade 5", Section.name == "5-A").first()

        if not sec1a or not sec5a:
            logger.error("Required sections Grade 1-A or Grade 5-A not found.")
            return

        grade1 = sec1a.grade
        grade5 = sec5a.grade

        # Fetch subjects
        math = db.query(Subject).filter(Subject.name == "Mathematics").first()
        sci = db.query(Subject).filter(Subject.name == "General Science").first()
        eng = db.query(Subject).filter(Subject.name == "English Literature").first()
        sst = db.query(Subject).filter(Subject.name == "Social Studies").first()

        if not all([math, sci, eng, sst]):
            logger.error("Required curriculum subjects not found.")
            return

        # -------------------------------------------------------------------
        # 1. Create or Find "Term 1 - Unit Test 1" (PUBLISHED)
        # -------------------------------------------------------------------
        ut1 = db.query(Examination).filter(Examination.name == "Term 1 - Unit Test 1").first()
        if not ut1:
            ut1 = Examination(
                name="Term 1 - Unit Test 1",
                exam_type=ExamType.UNIT_TEST.value,
                academic_year_id=ay.id,
                term="Term 1",
                description="First periodic offline unit test for continuous assessment.",
                start_date=dt.date(2026, 9, 15),
                end_date=dt.date(2026, 9, 22),
                status=ExamStatus.COMPLETED.value,
                grading_scale_name="Default 10-Point Scale",
            )
            db.add(ut1)
            db.commit()
            db.refresh(ut1)
            logger.info("Created Examination: %s", ut1.name)

        # Schedules for Unit Test 1
        schedules_ut1 = [
            # Grade 1 Section 1-A
            {"sec": sec1a, "grd": grade1, "sub": math, "date": dt.date(2026, 9, 16), "start": dt.time(9, 0), "end": dt.time(10, 30), "max": 50.0, "pass": 17.5},
            {"sec": sec1a, "grd": grade1, "sub": eng, "date": dt.date(2026, 9, 17), "start": dt.time(9, 0), "end": dt.time(10, 30), "max": 50.0, "pass": 17.5},
            {"sec": sec1a, "grd": grade1, "sub": sci, "date": dt.date(2026, 9, 18), "start": dt.time(9, 0), "end": dt.time(10, 30), "max": 50.0, "pass": 17.5},
            # Grade 5 Section 5-A
            {"sec": sec5a, "grd": grade5, "sub": math, "date": dt.date(2026, 9, 16), "start": dt.time(11, 0), "end": dt.time(12, 30), "max": 50.0, "pass": 17.5},
            {"sec": sec5a, "grd": grade5, "sub": eng, "date": dt.date(2026, 9, 17), "start": dt.time(11, 0), "end": dt.time(12, 30), "max": 50.0, "pass": 17.5},
            {"sec": sec5a, "grd": grade5, "sub": sci, "date": dt.date(2026, 9, 18), "start": dt.time(11, 0), "end": dt.time(12, 30), "max": 50.0, "pass": 17.5},
        ]

        created_ut1_scheds = []
        for item in schedules_ut1:
            sch = db.query(ExaminationSchedule).filter(
                ExaminationSchedule.examination_id == ut1.id,
                ExaminationSchedule.section_id == item["sec"].id,
                ExaminationSchedule.subject_id == item["sub"].id,
            ).first()
            if not sch:
                sch = ExaminationSchedule(
                    examination_id=ut1.id,
                    grade_id=item["grd"].id,
                    section_id=item["sec"].id,
                    subject_id=item["sub"].id,
                    exam_date=item["date"],
                    start_time=item["start"],
                    end_time=item["end"],
                    max_marks=item["max"],
                    pass_marks=item["pass"],
                    room_number="Exam Hall 1",
                    instructions="Students must physically report 15 minutes before the start bell.",
                    status=ExamStatus.COMPLETED.value,
                )
                db.add(sch)
                db.commit()
                db.refresh(sch)
            created_ut1_scheds.append(sch)

        # Enter realistic published marks for students in Grade 1-A and Grade 5-A
        sections_to_seed = [sec1a, sec5a]
        for sec in sections_to_seed:
            students = db.query(Student).filter(Student.current_section_id == sec.id).all()
            sec_scheds = [s for s in created_ut1_scheds if s.section_id == sec.id]

            for s_idx, std in enumerate(students):
                std_tot_max = 0.0
                std_tot_obt = 0.0
                has_absent = False
                has_fail = False

                for sch in sec_scheds:
                    std_tot_max += sch.max_marks
                    # Demonstrate varied student performance profiles
                    if s_idx == 0:
                        # Top student (90-95%)
                        obt = 47.0 if sch.subject.name == "Mathematics" else (45.0 if sch.subject.name == "English Literature" else 48.0)
                        is_ab = False
                    elif s_idx == 1:
                        # Good student (75-85%)
                        obt = 40.0 if sch.subject.name == "Mathematics" else (42.0 if sch.subject.name == "English Literature" else 39.0)
                        is_ab = False
                    elif s_idx == 2:
                        # Average student (60-70%)
                        obt = 32.0 if sch.subject.name == "Mathematics" else (34.0 if sch.subject.name == "English Literature" else 30.0)
                        is_ab = False
                    elif s_idx == 3 and sec == sec1a:
                        # Absent student
                        obt = 0.0
                        is_ab = True
                        has_absent = True
                    else:
                        # Passing student (55-65%)
                        obt = 28.0 if sch.subject.name == "Mathematics" else (31.0 if sch.subject.name == "English Literature" else 29.0)
                        is_ab = False

                    if is_ab:
                        grd = "AB"
                        pass_flag = False
                    else:
                        pct = (obt / sch.max_marks) * 100.0
                        grd, pass_flag = calculate_grade(pct, ut1.grading_scale_name, db)
                        std_tot_obt += obt

                    if not pass_flag:
                        has_fail = True

                    # Upsert StudentExamMark
                    m = db.query(StudentExamMark).filter(
                        StudentExamMark.schedule_id == sch.id,
                        StudentExamMark.student_id == std.id,
                    ).first()
                    if not m:
                        m = StudentExamMark(
                            schedule_id=sch.id,
                            student_id=std.id,
                            marks_obtained=obt if not is_ab else 0.0,
                            is_absent=is_ab,
                            grade=grd,
                            is_passed=pass_flag,
                            remarks="Excused medical leave" if is_ab else "Commendable exam conduct",
                            status=MarksStatus.PUBLISHED.value,
                        )
                        db.add(m)
                    else:
                        m.marks_obtained = obt if not is_ab else 0.0
                        m.is_absent = is_ab
                        m.grade = grd
                        m.is_passed = pass_flag
                        m.status = MarksStatus.PUBLISHED.value

                db.commit()

                # Upsert StudentExamResult
                overall_pct = (std_tot_obt / std_tot_max * 100.0) if std_tot_max > 0 else 0.0
                overall_grd, _ = calculate_grade(overall_pct, ut1.grading_scale_name, db)

                if has_absent and std_tot_obt == 0.0:
                    overall_status = ResultStatus.ABSENT.value
                elif has_fail:
                    overall_status = ResultStatus.FAIL.value
                else:
                    overall_status = ResultStatus.PASS.value

                res = db.query(StudentExamResult).filter(
                    StudentExamResult.examination_id == ut1.id,
                    StudentExamResult.student_id == std.id,
                ).first()
                if not res:
                    res = StudentExamResult(
                        examination_id=ut1.id,
                        student_id=std.id,
                        grade_id=sec.grade_id,
                        section_id=sec.id,
                        total_max_marks=std_tot_max,
                        total_obtained_marks=std_tot_obt,
                        percentage=round(overall_pct, 2),
                        overall_grade=overall_grd,
                        overall_result=overall_status,
                        teacher_remarks="Student demonstrates sincere commitment to coursework. Very active participation." if overall_status == "PASS" else "Needs additional revision and support.",
                        status=MarksStatus.PUBLISHED.value,
                        published_at=dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=10),
                        published_by_user_id=admin_user.id if admin_user else None,
                    )
                    db.add(res)
                else:
                    res.total_max_marks = std_tot_max
                    res.total_obtained_marks = std_tot_obt
                    res.percentage = round(overall_pct, 2)
                    res.overall_grade = overall_grd
                    res.overall_result = overall_status
                    res.status = MarksStatus.PUBLISHED.value

            db.commit()
            logger.info("Seeded published results for section %s", sec.name)

        # -------------------------------------------------------------------
        # 2. Create "Term 1 - Mid-Term Examination" (SCHEDULED & ONGOING)
        # -------------------------------------------------------------------
        today = dt.date.today()
        midterm = db.query(Examination).filter(Examination.name == "Term 1 - Mid-Term Examination").first()
        if not midterm:
            midterm = Examination(
                name="Term 1 - Mid-Term Examination",
                exam_type=ExamType.MID_TERM.value,
                academic_year_id=ay.id,
                term="Term 1",
                description="Comprehensive offline mid-term evaluation covering full syllabus.",
                start_date=today + dt.timedelta(days=2),
                end_date=today + dt.timedelta(days=12),
                status=ExamStatus.ONGOING.value,
                grading_scale_name="Default 10-Point Scale",
            )
            db.add(midterm)
            db.commit()
            db.refresh(midterm)
            logger.info("Created Examination: %s", midterm.name)

        # Schedules for Mid-Term
        mid_schedules = [
            {"sec": sec1a, "grd": grade1, "sub": math, "date": today + dt.timedelta(days=3), "start": dt.time(9, 30), "end": dt.time(11, 30), "max": 100.0, "pass": 35.0},
            {"sec": sec1a, "grd": grade1, "sub": eng, "date": today + dt.timedelta(days=5), "start": dt.time(9, 30), "end": dt.time(11, 30), "max": 100.0, "pass": 35.0},
            {"sec": sec1a, "grd": grade1, "sub": sci, "date": today + dt.timedelta(days=7), "start": dt.time(9, 30), "end": dt.time(11, 30), "max": 100.0, "pass": 35.0},
            {"sec": sec5a, "grd": grade5, "sub": math, "date": today + dt.timedelta(days=3), "start": dt.time(9, 30), "end": dt.time(12, 0), "max": 100.0, "pass": 35.0},
            {"sec": sec5a, "grd": grade5, "sub": sci, "date": today + dt.timedelta(days=5), "start": dt.time(9, 30), "end": dt.time(12, 0), "max": 100.0, "pass": 35.0},
            {"sec": sec5a, "grd": grade5, "sub": sst, "date": today + dt.timedelta(days=7), "start": dt.time(9, 30), "end": dt.time(12, 0), "max": 100.0, "pass": 35.0},
        ]

        for item in mid_schedules:
            sch = db.query(ExaminationSchedule).filter(
                ExaminationSchedule.examination_id == midterm.id,
                ExaminationSchedule.section_id == item["sec"].id,
                ExaminationSchedule.subject_id == item["sub"].id,
            ).first()
            if not sch:
                sch = ExaminationSchedule(
                    examination_id=midterm.id,
                    grade_id=item["grd"].id,
                    section_id=item["sec"].id,
                    subject_id=item["sub"].id,
                    exam_date=item["date"],
                    start_time=item["start"],
                    end_time=item["end"],
                    max_marks=item["max"],
                    pass_marks=item["pass"],
                    room_number="Main Examination Center B",
                    instructions="Students must strictly carry ID cards and authorized stationery.",
                    status=ExamStatus.SCHEDULED.value,
                )
                db.add(sch)
                db.commit()

        # Seed Draft marks for Grade 1-A Mathematics in Mid-Term
        math_1a_sch = db.query(ExaminationSchedule).filter(
            ExaminationSchedule.examination_id == midterm.id,
            ExaminationSchedule.section_id == sec1a.id,
            ExaminationSchedule.subject_id == math.id,
        ).first()

        if math_1a_sch:
            students = db.query(Student).filter(Student.current_section_id == sec1a.id).all()
            for idx, std in enumerate(students):
                sample_score = 85.0 - (idx * 6)
                m = db.query(StudentExamMark).filter(
                    StudentExamMark.schedule_id == math_1a_sch.id,
                    StudentExamMark.student_id == std.id,
                ).first()
                if not m:
                    m = StudentExamMark(
                        schedule_id=math_1a_sch.id,
                        student_id=std.id,
                        marks_obtained=sample_score,
                        is_absent=False,
                        grade="A" if sample_score >= 80 else "B+",
                        is_passed=True,
                        remarks="Saved draft by Class Teacher Sunita Sharma",
                        status=MarksStatus.DRAFT.value,
                    )
                    db.add(m)
            db.commit()
            logger.info("Seeded draft marks for Mid-Term Grade 1-A Mathematics")

        # -------------------------------------------------------------------
        # 3. Create "Term 2 - Final Examination" (DRAFT)
        # -------------------------------------------------------------------
        final_exam = db.query(Examination).filter(Examination.name == "Term 2 - Final Examination").first()
        if not final_exam:
            final_exam = Examination(
                name="Term 2 - Final Examination",
                exam_type=ExamType.FINAL.value,
                academic_year_id=ay.id,
                term="Term 2",
                description="Annual final board & school examinations.",
                start_date=dt.date(2027, 3, 1),
                end_date=dt.date(2027, 3, 20),
                status=ExamStatus.DRAFT.value,
                grading_scale_name="Default 10-Point Scale",
            )
            db.add(final_exam)
            db.commit()
            logger.info("Created Examination: %s", final_exam.name)

        logger.info("Demonstration examination data seeded successfully!")
    except Exception as e:
        db.rollback()
        logger.error("Failed to seed examination demo data: %s", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_examinations()

