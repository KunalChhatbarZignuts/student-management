"""extend teacher subjects with grade section and academic year

Revision ID: 35f9b6cf0fc1
Revises: 0931c65e0615
Create Date: 2026-11-02 18:33:04.074373

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35f9b6cf0fc1'
down_revision: Union[str, Sequence[str], None] = '0931c65e0615'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('teacher_subjects', sa.Column('academic_year_id', sa.Uuid(), nullable=True))
    op.add_column('teacher_subjects', sa.Column('grade_id', sa.Uuid(), nullable=True))
    op.add_column('teacher_subjects', sa.Column('section_id', sa.Uuid(), nullable=True))
    op.drop_constraint('uq_teacher_subject', 'teacher_subjects', type_='unique')
    op.create_index('ix_teacher_subjects_academic_year', 'teacher_subjects', ['academic_year_id'], unique=False)
    op.create_index('ix_teacher_subjects_grade', 'teacher_subjects', ['grade_id'], unique=False)
    op.create_index('ix_teacher_subjects_section', 'teacher_subjects', ['section_id'], unique=False)
    op.create_unique_constraint('uq_teacher_subject_academic_scope', 'teacher_subjects', ['teacher_id', 'subject_id', 'academic_year_id', 'grade_id', 'section_id'])
    op.create_foreign_key('fk_teacher_subjects_grade_id', 'teacher_subjects', 'grades', ['grade_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_teacher_subjects_academic_year_id', 'teacher_subjects', 'academic_years', ['academic_year_id'], ['id'], ondelete='RESTRICT')
    op.create_foreign_key('fk_teacher_subjects_section_id', 'teacher_subjects', 'sections', ['section_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_teacher_subjects_section_id', 'teacher_subjects', type_='foreignkey')
    op.drop_constraint('fk_teacher_subjects_academic_year_id', 'teacher_subjects', type_='foreignkey')
    op.drop_constraint('fk_teacher_subjects_grade_id', 'teacher_subjects', type_='foreignkey')
    op.drop_constraint('uq_teacher_subject_academic_scope', 'teacher_subjects', type_='unique')
    op.drop_index('ix_teacher_subjects_section', table_name='teacher_subjects')
    op.drop_index('ix_teacher_subjects_grade', table_name='teacher_subjects')
    op.drop_index('ix_teacher_subjects_academic_year', table_name='teacher_subjects')
    op.create_unique_constraint('uq_teacher_subject', 'teacher_subjects', ['teacher_id', 'subject_id'])
    op.drop_column('teacher_subjects', 'section_id')
    op.drop_column('teacher_subjects', 'grade_id')
    op.drop_column('teacher_subjects', 'academic_year_id')
    # ### end Alembic commands ###
