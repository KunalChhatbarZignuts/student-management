"""add department to subjects

Revision ID: 915364a884fe
Revises: 35f9b6cf0fc1
Create Date: 2026-11-02 19:09:24.396635

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '915364a884fe'
down_revision: Union[str, Sequence[str], None] = '35f9b6cf0fc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: safely add department column to subjects table."""
    op.add_column('subjects', sa.Column('department', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema: drop department column from subjects table."""
    op.drop_column('subjects', 'department')
