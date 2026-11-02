"""extend_attendance_grade_section_and_audit

Revision ID: 6f4e95fdd88b
Revises: ea6d568eac6f
Create Date: 2026-11-02 16:55:26.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f4e95fdd88b'
down_revision: Union[str, Sequence[str], None] = 'ea6d568eac6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Relax legacy non-null columns on attendance_sessions
    op.alter_column('attendance_sessions', 'class_id', existing_type=sa.Uuid(), nullable=True)
    op.alter_column('attendance_sessions', 'subject_id', existing_type=sa.Uuid(), nullable=True)

    # 2. Add Grade & Section and status columns to attendance_sessions
    op.add_column('attendance_sessions', sa.Column('academic_year_id', sa.Uuid(), sa.ForeignKey('academic_years.id', ondelete='RESTRICT'), nullable=True))
    op.add_column('attendance_sessions', sa.Column('grade_id', sa.Uuid(), sa.ForeignKey('grades.id', ondelete='RESTRICT'), nullable=True))
    op.add_column('attendance_sessions', sa.Column('section_id', sa.Uuid(), sa.ForeignKey('sections.id', ondelete='RESTRICT'), nullable=True))
    op.add_column('attendance_sessions', sa.Column('submission_status', sa.String(20), nullable=False, server_default='submitted'))
    op.add_column('attendance_sessions', sa.Column('marked_by_user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))

    op.create_index('ix_attendance_sessions_section_date', 'attendance_sessions', ['section_id', 'date'])
    op.create_index('ix_attendance_sessions_grade', 'attendance_sessions', ['grade_id'])
    op.create_index('ix_attendance_sessions_year', 'attendance_sessions', ['academic_year_id'])

    # 3. Add enrollment_id and marked_by_user_id to attendance_records
    op.add_column('attendance_records', sa.Column('enrollment_id', sa.Uuid(), sa.ForeignKey('student_enrollments.id', ondelete='SET NULL'), nullable=True))
    op.add_column('attendance_records', sa.Column('marked_by_user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))

    # 4. Create attendance_audit_history table
    op.create_table(
        'attendance_audit_history',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('record_id', sa.Uuid(), sa.ForeignKey('attendance_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', sa.Uuid(), sa.ForeignKey('attendance_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Uuid(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('previous_status', sa.String(20), nullable=False),
        sa.Column('new_status', sa.String(20), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('modified_by_user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_attendance_audit_record', 'attendance_audit_history', ['record_id'])
    op.create_index('ix_attendance_audit_session', 'attendance_audit_history', ['session_id'])
    op.create_index('ix_attendance_audit_student', 'attendance_audit_history', ['student_id'])


def downgrade() -> None:
    op.drop_table('attendance_audit_history')
    op.drop_column('attendance_records', 'marked_by_user_id')
    op.drop_column('attendance_records', 'enrollment_id')
    op.drop_index('ix_attendance_sessions_year', 'attendance_sessions')
    op.drop_index('ix_attendance_sessions_grade', 'attendance_sessions')
    op.drop_index('ix_attendance_sessions_section_date', 'attendance_sessions')
    op.drop_column('attendance_sessions', 'marked_by_user_id')
    op.drop_column('attendance_sessions', 'submission_status')
    op.drop_column('attendance_sessions', 'section_id')
    op.drop_column('attendance_sessions', 'grade_id')
    op.drop_column('attendance_sessions', 'academic_year_id')
    op.alter_column('attendance_sessions', 'subject_id', existing_type=sa.Uuid(), nullable=False)
    op.alter_column('attendance_sessions', 'class_id', existing_type=sa.Uuid(), nullable=False)
