"""extend_parents_and_parent_student_links

Revision ID: 56a6e61df695
Revises: c69fd7098a0e
Create Date: 2026-11-02 14:53:58.780956

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56a6e61df695'
down_revision: Union[str, Sequence[str], None] = 'c69fd7098a0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Extend parents table
    op.add_column('parents', sa.Column('profile_image', sa.String(length=500), nullable=True))
    op.add_column('parents', sa.Column('address', sa.String(length=255), nullable=True))

    # 2. Extend parent_student_links table
    op.add_column('parent_student_links', sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False))
    op.add_column('parent_student_links', sa.Column('relationship_type', sa.String(length=50), server_default='Guardian', nullable=False))
    op.add_column('parent_student_links', sa.Column('is_primary_guardian', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('parent_student_links', sa.Column('verification_status', sa.String(length=30), server_default='verified', nullable=False))
    op.add_column('parent_student_links', sa.Column('status', sa.String(length=20), server_default='active', nullable=False))
    op.add_column('parent_student_links', sa.Column('linked_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column('parent_student_links', sa.Column('linked_by', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('parent_student_links', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column('parent_student_links', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    # 3. Swap Primary Key from composite (parent_id, student_id) to id
    op.drop_constraint('parent_student_links_pkey', 'parent_student_links', type_='primary')
    op.create_primary_key('parent_student_links_pkey', 'parent_student_links', ['id'])

    # 4. Indices
    op.create_index('ix_psl_parent_id', 'parent_student_links', ['parent_id'])
    op.create_index('ix_psl_student_id', 'parent_student_links', ['student_id'])
    op.create_index('ix_psl_status', 'parent_student_links', ['status'])


def downgrade() -> None:
    op.drop_index('ix_psl_status', table_name='parent_student_links')
    op.drop_index('ix_psl_student_id', table_name='parent_student_links')
    op.drop_index('ix_psl_parent_id', table_name='parent_student_links')

    op.drop_constraint('parent_student_links_pkey', 'parent_student_links', type_='primary')
    op.create_primary_key('parent_student_links_pkey', 'parent_student_links', ['parent_id', 'student_id'])

    op.drop_column('parent_student_links', 'updated_at')
    op.drop_column('parent_student_links', 'created_at')
    op.drop_column('parent_student_links', 'linked_by')
    op.drop_column('parent_student_links', 'linked_at')
    op.drop_column('parent_student_links', 'status')
    op.drop_column('parent_student_links', 'verification_status')
    op.drop_column('parent_student_links', 'is_primary_guardian')
    op.drop_column('parent_student_links', 'relationship_type')
    op.drop_column('parent_student_links', 'id')

    op.drop_column('parents', 'address')
    op.drop_column('parents', 'profile_image')
