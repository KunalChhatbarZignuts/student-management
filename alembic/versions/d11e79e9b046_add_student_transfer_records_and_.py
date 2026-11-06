"""add_student_transfer_records_and_enrollment_reason

Revision ID: d11e79e9b046
Revises: 172442bcf56b
Create Date: 2026-11-06 11:54:50.343021

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd11e79e9b046'
down_revision: Union[str, Sequence[str], None] = '172442bcf56b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema safely and backward-compatibly."""
    # 1. Create student_transfer_records table
    op.create_table(
        'student_transfer_records',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('student_id', sa.Uuid(), nullable=False),
        sa.Column('from_academic_year_id', sa.Uuid(), nullable=False),
        sa.Column('to_academic_year_id', sa.Uuid(), nullable=False),
        sa.Column('from_grade_id', sa.Uuid(), nullable=True),
        sa.Column('to_grade_id', sa.Uuid(), nullable=True),
        sa.Column('from_section_id', sa.Uuid(), nullable=True),
        sa.Column('to_section_id', sa.Uuid(), nullable=True),
        sa.Column('from_enrollment_id', sa.Uuid(), nullable=True),
        sa.Column('to_enrollment_id', sa.Uuid(), nullable=True),
        sa.Column('transfer_date', sa.Date(), nullable=False),
        sa.Column('transfer_type', sa.String(length=50), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('remarks', sa.String(length=500), nullable=True),
        sa.Column('performed_by_user_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['from_academic_year_id'], ['academic_years.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['to_academic_year_id'], ['academic_years.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['from_grade_id'], ['grades.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['to_grade_id'], ['grades.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['from_section_id'], ['sections.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['to_section_id'], ['sections.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['from_enrollment_id'], ['student_enrollments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['to_enrollment_id'], ['student_enrollments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['performed_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_transfer_records_student', 'student_transfer_records', ['student_id'], unique=False)
    op.create_index('ix_transfer_records_date', 'student_transfer_records', ['transfer_date'], unique=False)
    op.create_index('ix_transfer_records_from_section', 'student_transfer_records', ['from_section_id'], unique=False)
    op.create_index('ix_transfer_records_to_section', 'student_transfer_records', ['to_section_id'], unique=False)

    # 2. Add columns to student_enrollments
    op.add_column('student_enrollments', sa.Column('reason', sa.String(length=255), nullable=True))
    op.add_column('student_enrollments', sa.Column('remarks', sa.String(length=500), nullable=True))
    op.add_column('student_enrollments', sa.Column('transfer_from_enrollment_id', sa.Uuid(), nullable=True))
    op.add_column('student_enrollments', sa.Column('enrolled_by_user_id', sa.Uuid(), nullable=True))
    op.create_index('ix_student_enrollments_transfer_from', 'student_enrollments', ['transfer_from_enrollment_id'], unique=False)
    op.create_foreign_key(
        'fk_student_enrollments_transfer_from',
        'student_enrollments',
        'student_enrollments',
        ['transfer_from_enrollment_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_student_enrollments_enrolled_by',
        'student_enrollments',
        'users',
        ['enrolled_by_user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema safely."""
    op.drop_constraint('fk_student_enrollments_enrolled_by', 'student_enrollments', type_='foreignkey')
    op.drop_constraint('fk_student_enrollments_transfer_from', 'student_enrollments', type_='foreignkey')
    op.drop_index('ix_student_enrollments_transfer_from', table_name='student_enrollments')
    op.drop_column('student_enrollments', 'enrolled_by_user_id')
    op.drop_column('student_enrollments', 'transfer_from_enrollment_id')
    op.drop_column('student_enrollments', 'remarks')
    op.drop_column('student_enrollments', 'reason')

    op.drop_index('ix_transfer_records_to_section', table_name='student_transfer_records')
    op.drop_index('ix_transfer_records_from_section', table_name='student_transfer_records')
    op.drop_index('ix_transfer_records_date', table_name='student_transfer_records')
    op.drop_index('ix_transfer_records_student', table_name='student_transfer_records')
    op.drop_table('student_transfer_records')
