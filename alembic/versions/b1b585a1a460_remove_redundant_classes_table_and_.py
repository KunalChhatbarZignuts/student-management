"""remove redundant classes table and clean fks

Revision ID: b1b585a1a460
Revises: 165082985fe9
Create Date: 2026-11-25 16:32:51.826642

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b1b585a1a460'
down_revision: Union[str, Sequence[str], None] = '165082985fe9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop index on attendance_sessions.date_class
    op.drop_index('ix_attendance_sessions_date_class', table_name='attendance_sessions')

    # 2. Drop foreign key constraints pointing to classes
    op.drop_constraint('attendance_sessions_class_id_fkey', 'attendance_sessions', type_='foreignkey')
    op.drop_constraint('teacher_assignments_class_id_fkey', 'teacher_assignments', type_='foreignkey')

    # 3. Drop class_id columns from attendance_sessions and teacher_assignments
    op.drop_column('attendance_sessions', 'class_id')
    op.drop_column('teacher_assignments', 'class_id')

    # 4. Drop redundant classes table (now completely replaced by sections + grades dynamic queries)
    op.drop_table('classes')


def downgrade() -> None:
    # Recreate classes table
    op.create_table(
        'classes',
        sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
        sa.Column('name', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column('section', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
        sa.Column('academic_year', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
        sa.Column('department', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column('status', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.PrimaryKeyConstraint('id', name='classes_pkey'),
    )

    # Re-add class_id columns and constraints
    op.add_column('teacher_assignments', sa.Column('class_id', sa.UUID(), autoincrement=False, nullable=True))
    op.create_foreign_key('teacher_assignments_class_id_fkey', 'teacher_assignments', 'classes', ['class_id'], ['id'], ondelete='SET NULL')

    op.add_column('attendance_sessions', sa.Column('class_id', sa.UUID(), autoincrement=False, nullable=True))
    op.create_foreign_key('attendance_sessions_class_id_fkey', 'attendance_sessions', 'classes', ['class_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_attendance_sessions_date_class', 'attendance_sessions', ['date', 'class_id'], unique=False)
