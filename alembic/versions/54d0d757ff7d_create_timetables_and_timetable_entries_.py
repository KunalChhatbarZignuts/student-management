"""create timetables and timetable entries and add shift working days and period name

Revision ID: 54d0d757ff7d
Revises: 7185919272ec
Create Date: 2026-11-04 12:42:11.695032

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '54d0d757ff7d'
down_revision: Union[str, Sequence[str], None] = '7185919272ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'timetables',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('academic_year_id', sa.Uuid(), nullable=False),
        sa.Column('grade_id', sa.Uuid(), nullable=False),
        sa.Column('section_id', sa.Uuid(), nullable=False),
        sa.Column('shift_id', sa.Uuid(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by_user_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['grade_id'], ['grades.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('academic_year_id', 'section_id', 'version', name='uq_timetable_year_section_version')
    )
    op.create_index('ix_timetables_grade', 'timetables', ['grade_id'], unique=False)
    op.create_index('ix_timetables_section_status', 'timetables', ['section_id', 'status'], unique=False)
    op.create_index('ix_timetables_year', 'timetables', ['academic_year_id'], unique=False)

    op.create_table(
        'timetable_entries',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('timetable_id', sa.Uuid(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('period_id', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=True),
        sa.Column('teacher_id', sa.Uuid(), nullable=True),
        sa.Column('room_number', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['period_id'], ['periods.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['timetable_id'], ['timetables.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('timetable_id', 'day_of_week', 'period_id', name='uq_timetable_slot')
    )
    op.create_index('ix_timetable_entries_day_period', 'timetable_entries', ['day_of_week', 'period_id'], unique=False)
    op.create_index('ix_timetable_entries_teacher', 'timetable_entries', ['teacher_id'], unique=False)
    op.create_index('ix_timetable_entries_timetable', 'timetable_entries', ['timetable_id'], unique=False)

    op.add_column('periods', sa.Column('name', sa.String(length=50), nullable=True))
    op.add_column('shifts', sa.Column('working_days', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('shifts', 'working_days')
    op.drop_column('periods', 'name')
    op.drop_index('ix_timetable_entries_timetable', table_name='timetable_entries')
    op.drop_index('ix_timetable_entries_teacher', table_name='timetable_entries')
    op.drop_index('ix_timetable_entries_day_period', table_name='timetable_entries')
    op.drop_table('timetable_entries')
    op.drop_index('ix_timetables_year', table_name='timetables')
    op.drop_index('ix_timetables_section_status', table_name='timetables')
    op.drop_index('ix_timetables_grade', table_name='timetables')
    op.drop_table('timetables')
