"""remove redundant tables student_marks fee_invoices ai_weekly_study_plans

Revision ID: 5379a4ab0d53
Revises: 9886b53d5487
Create Date: 2026-11-25 16:05:04.826642

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '5379a4ab0d53'
down_revision: Union[str, Sequence[str], None] = '9886b53d5487'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop redundant tables replaced by queries."""
    # 1. ai_weekly_study_plans (Replaced by on-the-fly aggregation query over ai_daily_study_plans)
    op.drop_table('ai_weekly_study_plans')

    # 2. fee_invoices (Replaced by dynamic query joining fee_installments and student_fee_assignments)
    op.drop_table('fee_invoices')

    # 3. student_marks (Replaced by dynamic query joining student_exam_marks, examination_schedules, subjects, and examinations)
    op.drop_table('student_marks')


def downgrade() -> None:
    """Recreate tables if needed."""
    op.create_table(
        'student_marks',
        sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('student_id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('subject', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
        sa.Column('code', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
        sa.Column('max_score', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('obtained_score', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('grade', sa.VARCHAR(length=10), autoincrement=False, nullable=False),
        sa.Column('status', sa.VARCHAR(length=10), autoincrement=False, nullable=False),
        sa.Column('term', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], name='student_marks_student_id_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='student_marks_pkey'),
    )
    op.create_index('ix_student_marks_student_term', 'student_marks', ['student_id', 'term'], unique=False)

    op.create_table(
        'fee_invoices',
        sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('student_id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('invoice_number', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column('description', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
        sa.Column('amount', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=False),
        sa.Column('due_date', sa.DATE(), autoincrement=False, nullable=False),
        sa.Column('status', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], name='fee_invoices_student_id_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='fee_invoices_pkey'),
        sa.UniqueConstraint('invoice_number', name='fee_invoices_invoice_number_key'),
    )
    op.create_index('ix_fee_invoices_student', 'fee_invoices', ['student_id'], unique=False)

    op.create_table(
        'ai_weekly_study_plans',
        sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('student_id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('week_start_date', sa.DATE(), autoincrement=False, nullable=False),
        sa.Column('total_planned_minutes', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('completed_minutes', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('status', sa.VARCHAR(length=30), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], name='ai_weekly_study_plans_student_id_fkey', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name='ai_weekly_study_plans_pkey'),
        sa.UniqueConstraint('student_id', 'week_start_date', name='uq_student_weekly_plan_date'),
    )
    op.create_index('ix_ai_weekly_study_plans_student_date', 'ai_weekly_study_plans', ['student_id', 'week_start_date'], unique=False)
