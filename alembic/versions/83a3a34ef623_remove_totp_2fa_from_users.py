"""remove_totp_2fa_from_users

Revision ID: 83a3a34ef623
Revises: 1d30d2b6254b
Create Date: 2026-11-04 18:18:10.190196

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83a3a34ef623'
down_revision: Union[str, Sequence[str], None] = '1d30d2b6254b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Safely drop totp_secret and totp_enabled columns from users table."""
    op.drop_column('users', 'totp_secret')
    op.drop_column('users', 'totp_enabled')


def downgrade() -> None:
    """Restore totp columns on users table for reversibility."""
    op.add_column('users', sa.Column('totp_secret', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('totp_enabled', sa.Boolean(), server_default=sa.text('false'), nullable=False))
