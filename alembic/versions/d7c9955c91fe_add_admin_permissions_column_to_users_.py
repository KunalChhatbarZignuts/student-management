"""add admin_permissions column to users table

Revision ID: d7c9955c91fe
Revises: 68847772102f
Create Date: 2026-11-26 14:57:10.248501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd7c9955c91fe'
down_revision: Union[str, Sequence[str], None] = '68847772102f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add admin_permissions column to users table
    op.add_column(
        'users',
        sa.Column(
            'admin_permissions',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default='[]',
            nullable=False,
        ),
    )

    # 2. Existing regular admins receive wildcard access to retain full backward compatibility
    op.execute("""
        UPDATE users
        SET admin_permissions = '["*"]'::jsonb
        WHERE role = 'admin';
    """)


def downgrade() -> None:
    op.drop_column('users', 'admin_permissions')
