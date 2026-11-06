"""drop_admissions_applications_tables

Revision ID: 92e22e9dc6d4
Revises: 7f076e4fe242
Create Date: 2026-11-06 13:17:27.766422

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '92e22e9dc6d4'
down_revision: Union[str, Sequence[str], None] = '7f076e4fe242'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: drop applications table."""
    op.drop_table('applications')


def downgrade() -> None:
    """Downgrade schema: recreate applications table."""
    op.create_table(
        'applications',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('department', sa.String(length=50), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_applications_email', 'applications', ['email'], unique=False)
    op.create_index('ix_applications_status', 'applications', ['status'], unique=False)
