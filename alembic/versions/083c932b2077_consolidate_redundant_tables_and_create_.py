"""consolidate redundant tables and create exam results view

Revision ID: 083c932b2077
Revises: 9f00cd84b0d9
Create Date: 2026-11-25 16:48:24.870221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '083c932b2077'
down_revision: Union[str, Sequence[str], None] = '9f00cd84b0d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Consolidate redundant tables and create dynamic views."""
    # 1. Add applicable_grade_ids and applicable_section_ids JSONB columns to school_holidays if not present
    op.execute("""
        ALTER TABLE school_holidays 
        ADD COLUMN IF NOT EXISTS applicable_grade_ids JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS applicable_section_ids JSONB DEFAULT '[]'::jsonb;
    """)

    # 2. Add weak_subjects, strong_subjects, learning_pace to ai_student_study_settings if not present
    op.execute("""
        ALTER TABLE ai_student_study_settings
        ADD COLUMN IF NOT EXISTS weak_subjects JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS strong_subjects JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS learning_pace VARCHAR(30) DEFAULT 'MODERATE';
    """)

    # 3. Create view v_student_exam_results to compute examination results dynamically
    op.execute("""
        CREATE OR REPLACE VIEW v_student_exam_results AS
        SELECT 
            md5(concat(es.examination_id::text, sem.student_id::text))::uuid AS id,
            es.examination_id,
            sem.student_id,
            es.grade_id,
            es.section_id,
            SUM(es.max_marks) AS total_max_marks,
            SUM(sem.marks_obtained) AS total_obtained_marks,
            ROUND(CAST(SUM(sem.marks_obtained) * 100.0 / NULLIF(SUM(es.max_marks), 0) AS numeric), 2) AS percentage,
            CASE 
                WHEN ROUND(CAST(SUM(sem.marks_obtained) * 100.0 / NULLIF(SUM(es.max_marks), 0) AS numeric), 2) >= 90 THEN 'A+'
                WHEN ROUND(CAST(SUM(sem.marks_obtained) * 100.0 / NULLIF(SUM(es.max_marks), 0) AS numeric), 2) >= 80 THEN 'A'
                WHEN ROUND(CAST(SUM(sem.marks_obtained) * 100.0 / NULLIF(SUM(es.max_marks), 0) AS numeric), 2) >= 60 THEN 'B'
                WHEN ROUND(CAST(SUM(sem.marks_obtained) * 100.0 / NULLIF(SUM(es.max_marks), 0) AS numeric), 2) >= 50 THEN 'C'
                ELSE 'F'
            END AS overall_grade,
            CASE 
                WHEN bool_or(sem.is_absent) THEN 'ABSENT'
                WHEN bool_or(sem.marks_obtained < es.pass_marks) THEN 'FAIL'
                ELSE 'PASS'
            END AS overall_result,
            MAX(sem.remarks) AS teacher_remarks,
            'PUBLISHED' AS status,
            MAX(sem.created_at) AS created_at,
            MAX(sem.updated_at) AS updated_at
        FROM student_exam_marks sem
        JOIN examination_schedules es ON sem.schedule_id = es.id
        GROUP BY es.examination_id, sem.student_id, es.grade_id, es.section_id;
    """)

    # 4. Drop redundant junction and empty tables
    op.execute("DROP TABLE IF EXISTS holiday_grade_associations CASCADE;")
    op.execute("DROP TABLE IF EXISTS holiday_section_associations CASCADE;")
    op.execute("DROP TABLE IF EXISTS ai_learning_profiles CASCADE;")


def downgrade() -> None:
    """Recreate dropped tables if required."""
    op.execute("DROP VIEW IF EXISTS v_student_exam_results CASCADE;")
    op.execute("""
        CREATE TABLE IF NOT EXISTS holiday_grade_associations (
            holiday_id UUID NOT NULL REFERENCES school_holidays(id) ON DELETE CASCADE,
            grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
            PRIMARY KEY (holiday_id, grade_id)
        );
        CREATE TABLE IF NOT EXISTS holiday_section_associations (
            holiday_id UUID NOT NULL REFERENCES school_holidays(id) ON DELETE CASCADE,
            section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
            PRIMARY KEY (holiday_id, section_id)
        );
        CREATE TABLE IF NOT EXISTS ai_learning_profiles (
            id UUID PRIMARY KEY,
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            weak_subjects JSONB DEFAULT '[]'::jsonb,
            strong_subjects JSONB DEFAULT '[]'::jsonb,
            learning_pace VARCHAR(30) DEFAULT 'MODERATE',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
