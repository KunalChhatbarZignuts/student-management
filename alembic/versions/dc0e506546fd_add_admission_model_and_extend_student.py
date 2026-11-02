"""add_admission_model_and_extend_student

Revision ID: dc0e506546fd
Revises: 56a6e61df695
Create Date: 2026-11-02 15:43:03.913018

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc0e506546fd'
down_revision: Union[str, Sequence[str], None] = '56a6e61df695'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - additive changes only."""
    # 1. Extend students table
    op.add_column('students', sa.Column('middle_name', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('gender', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('phone', sa.String(30), nullable=True))
    op.add_column('students', sa.Column('alternate_phone', sa.String(30), nullable=True))
    op.add_column('students', sa.Column('address', sa.String(255), nullable=True))
    op.add_column('students', sa.Column('city', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('state', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('country', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('postal_code', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('profile_photo', sa.String(500), nullable=True))
    op.add_column('students', sa.Column('previous_school_name', sa.String(200), nullable=True))
    op.add_column('students', sa.Column('previous_school_details', sa.String(500), nullable=True))

    # 2. Create admissions table
    op.create_table(
        'admissions',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('admission_number', sa.String(50), nullable=False),
        sa.Column('student_id', sa.Uuid(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('enrollment_number', sa.String(30), nullable=False),
        sa.Column('academic_year_id', sa.Uuid(), sa.ForeignKey('academic_years.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('grade_id', sa.Uuid(), sa.ForeignKey('grades.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('section_id', sa.Uuid(), sa.ForeignKey('sections.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('admission_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='completed'),
        sa.Column('student_account_created', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_by_user_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('admission_number', name='uq_admissions_admission_number'),
    )
    op.create_index('ix_admissions_admission_number', 'admissions', ['admission_number'])
    op.create_index('ix_admissions_enrollment_number', 'admissions', ['enrollment_number'])
    op.create_index('ix_admissions_student_id', 'admissions', ['student_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_admissions_student_id', table_name='admissions')
    op.drop_index('ix_admissions_enrollment_number', table_name='admissions')
    op.drop_index('ix_admissions_admission_number', table_name='admissions')
    op.drop_table('admissions')

    op.drop_column('students', 'previous_school_details')
    op.drop_column('students', 'previous_school_name')
    op.drop_column('students', 'profile_photo')
    op.drop_column('students', 'postal_code')
    op.drop_column('students', 'country')
    op.drop_column('students', 'state')
    op.drop_column('students', 'city')
    op.drop_column('students', 'address')
    op.drop_column('students', 'alternate_phone')
    op.drop_column('students', 'phone')
    op.drop_column('students', 'gender')
    op.drop_column('students', 'middle_name')
