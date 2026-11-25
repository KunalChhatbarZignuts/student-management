"""add performance composite indexes

Revision ID: 165082985fe9
Revises: 5379a4ab0d53
Create Date: 2026-11-25 16:19:44.826642

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '165082985fe9'
down_revision: Union[str, Sequence[str], None] = '5379a4ab0d53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Accelerate student portal and parent portal unread diary badges
    op.create_index(
        'ix_diary_recipients_student_read',
        'diary_entry_recipients',
        ['student_id', 'is_read_by_student'],
        unique=False,
    )

    # 2. Accelerate student payment ledger and transaction history
    op.create_index(
        'ix_payment_transactions_student_status',
        'payment_transactions',
        ['student_id', 'status'],
        unique=False,
    )

    # 3. Accelerate examination timetable lookups by class & section
    op.create_index(
        'ix_exam_schedules_grade_section_date',
        'examination_schedules',
        ['grade_id', 'section_id', 'exam_date'],
        unique=False,
    )

    # 4. Accelerate attendance session queries by date & class
    op.create_index(
        'ix_attendance_sessions_date_class',
        'attendance_sessions',
        ['date', 'class_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_attendance_sessions_date_class', table_name='attendance_sessions')
    op.drop_index('ix_exam_schedules_grade_section_date', table_name='examination_schedules')
    op.drop_index('ix_payment_transactions_student_status', table_name='payment_transactions')
    op.drop_index('ix_diary_recipients_student_read', table_name='diary_entry_recipients')
