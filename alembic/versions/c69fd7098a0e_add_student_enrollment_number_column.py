"""add student enrollment number column

Revision ID: c69fd7098a0e
Revises: e4bd35169331
Create Date: 2026-11-02 12:26:46.530255

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c69fd7098a0e'
down_revision: Union[str, Sequence[str], None] = 'e4bd35169331'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema safely with backfill for existing records."""
    # 1. Add column as nullable initially
    op.add_column('students', sa.Column('enrollment_number', sa.String(length=30), nullable=True))
    
    # 2. Backfill existing records safely using a subquery CTE
    op.execute(
        sa.text("""
            WITH numbered_students AS (
                SELECT id, 
                       'STU-' || EXTRACT(YEAR FROM admission_date)::TEXT || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 5, '0') AS gen_code
                FROM students
                WHERE enrollment_number IS NULL
            )
            UPDATE students s
            SET enrollment_number = ns.gen_code
            FROM numbered_students ns
            WHERE s.id = ns.id
        """)
    )
    
    # 3. Enforce NOT NULL after backfill
    op.alter_column('students', 'enrollment_number', nullable=False)
    
    # 4. Create index & named unique constraint
    op.create_index('ix_students_enrollment_number', 'students', ['enrollment_number'], unique=False)
    op.create_unique_constraint('uq_students_enrollment_number', 'students', ['enrollment_number'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_students_enrollment_number', 'students', type_='unique')
    op.drop_index('ix_students_enrollment_number', table_name='students')
    op.drop_column('students', 'enrollment_number')
