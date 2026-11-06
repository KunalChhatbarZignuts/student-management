"""add_student_relational_and_medical_fields

Revision ID: 61710ea777f0
Revises: 83a3a34ef623
Create Date: 2026-11-05 16:56:12.424088

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61710ea777f0'
down_revision: Union[str, Sequence[str], None] = '83a3a34ef623'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('students', sa.Column('current_grade_id', sa.Uuid(), nullable=True))
    op.add_column('students', sa.Column('current_section_id', sa.Uuid(), nullable=True))
    op.add_column('students', sa.Column('blood_group', sa.String(length=10), nullable=True))
    op.add_column('students', sa.Column('allergies', sa.String(length=500), nullable=True))
    op.add_column('students', sa.Column('medical_conditions', sa.String(length=500), nullable=True))
    op.add_column('students', sa.Column('emergency_contact_name', sa.String(length=100), nullable=True))
    op.add_column('students', sa.Column('emergency_contact_phone', sa.String(length=30), nullable=True))
    op.add_column('students', sa.Column('authorized_pickup_info', sa.String(length=500), nullable=True))
    op.create_index('ix_students_current_grade', 'students', ['current_grade_id'])
    op.create_index('ix_students_current_section', 'students', ['current_section_id'])
    op.create_foreign_key('fk_students_current_grade', 'students', 'grades', ['current_grade_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_students_current_section', 'students', 'sections', ['current_section_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_students_current_section', 'students', type_='foreignkey')
    op.drop_constraint('fk_students_current_grade', 'students', type_='foreignkey')
    op.drop_index('ix_students_current_section', table_name='students')
    op.drop_index('ix_students_current_grade', table_name='students')
    op.drop_column('students', 'authorized_pickup_info')
    op.drop_column('students', 'emergency_contact_phone')
    op.drop_column('students', 'emergency_contact_name')
    op.drop_column('students', 'medical_conditions')
    op.drop_column('students', 'allergies')
    op.drop_column('students', 'blood_group')
    op.drop_column('students', 'current_section_id')
    op.drop_column('students', 'current_grade_id')
