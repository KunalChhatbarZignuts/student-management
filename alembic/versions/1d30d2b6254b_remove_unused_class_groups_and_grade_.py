"""remove_unused_class_groups_and_grade_subjects

Revision ID: 1d30d2b6254b
Revises: ac166623a393
Create Date: 2026-11-04 17:43:38.018085

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d30d2b6254b'
down_revision: Union[str, Sequence[str], None] = 'ac166623a393'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Safely drop unused abandoned tables and nullable foreign key references."""
    # 1. Clean up student_enrollments foreign key, index, and column
    op.drop_constraint('student_enrollments_class_group_id_fkey', 'student_enrollments', type_='foreignkey')
    op.drop_index('ix_student_enrollments_group', table_name='student_enrollments')
    op.drop_column('student_enrollments', 'class_group_id')

    # 2. Clean up teacher_assignments foreign key and column
    op.drop_constraint('fk_teacher_assignments_class_group_id', 'teacher_assignments', type_='foreignkey')
    op.drop_column('teacher_assignments', 'class_group_id')

    # 3. Drop grade_subjects table
    op.drop_index('ix_grade_subjects_grade', table_name='grade_subjects')
    op.drop_table('grade_subjects')

    # 4. Drop class_groups table
    op.drop_index('ix_class_groups_head_teacher', table_name='class_groups')
    op.drop_index('ix_class_groups_grade', table_name='class_groups')
    op.drop_table('class_groups')


def downgrade() -> None:
    """Recreate tables and columns to ensure complete reversibility."""
    # 1. Recreate class_groups
    op.create_table(
        'class_groups',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('grade_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('room', sa.String(length=50), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('head_teacher_id', sa.Uuid(), nullable=True),
        sa.Column('academic_year_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['grade_id'], ['grades.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['head_teacher_id'], ['teachers.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('grade_id', 'name', name='uq_class_group_grade_name'),
    )
    op.create_index('ix_class_groups_grade', 'class_groups', ['grade_id'], unique=False)
    op.create_index('ix_class_groups_head_teacher', 'class_groups', ['head_teacher_id'], unique=False)

    # 2. Recreate grade_subjects
    op.create_table(
        'grade_subjects',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('grade_id', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('periods_per_week', sa.Integer(), nullable=False),
        sa.Column('is_optional', sa.Boolean(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['grade_id'], ['grades.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('grade_id', 'subject_id', name='uq_grade_subject'),
    )
    op.create_index('ix_grade_subjects_grade', 'grade_subjects', ['grade_id'], unique=False)

    # 3. Restore teacher_assignments column and foreign key
    op.add_column('teacher_assignments', sa.Column('class_group_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_teacher_assignments_class_group_id',
        'teacher_assignments',
        'class_groups',
        ['class_group_id'],
        ['id'],
        ondelete='CASCADE',
    )

    # 4. Restore student_enrollments column, index, and foreign key
    op.add_column('student_enrollments', sa.Column('class_group_id', sa.Uuid(), nullable=True))
    op.create_index('ix_student_enrollments_group', 'student_enrollments', ['class_group_id'], unique=False)
    op.create_foreign_key(
        'student_enrollments_class_group_id_fkey',
        'student_enrollments',
        'class_groups',
        ['class_group_id'],
        ['id'],
        ondelete='CASCADE',
    )
