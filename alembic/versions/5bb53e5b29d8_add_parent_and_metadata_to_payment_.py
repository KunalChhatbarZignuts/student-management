"""add_parent_and_metadata_to_payment_transactions

Revision ID: 5bb53e5b29d8
Revises: 92e22e9dc6d4
Create Date: 2026-11-16 11:43:50.451370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bb53e5b29d8'
down_revision: Union[str, Sequence[str], None] = '92e22e9dc6d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('payment_transactions', sa.Column('parent_id', sa.Uuid(), nullable=True))
    op.add_column('payment_transactions', sa.Column('assignment_id', sa.Uuid(), nullable=True))
    op.add_column('payment_transactions', sa.Column('payment_method', sa.String(length=50), nullable=True))
    op.add_column('payment_transactions', sa.Column('payment_timestamp', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_payment_transactions_parent', 'payment_transactions', ['parent_id'], unique=False)
    op.create_index('ix_payment_transactions_assignment', 'payment_transactions', ['assignment_id'], unique=False)
    op.create_foreign_key(
        'fk_payment_transactions_parent_id',
        'payment_transactions',
        'parents',
        ['parent_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_payment_transactions_assignment_id',
        'payment_transactions',
        'student_fee_assignments',
        ['assignment_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_payment_transactions_assignment_id', 'payment_transactions', type_='foreignkey')
    op.drop_constraint('fk_payment_transactions_parent_id', 'payment_transactions', type_='foreignkey')
    op.drop_index('ix_payment_transactions_assignment', table_name='payment_transactions')
    op.drop_index('ix_payment_transactions_parent', table_name='payment_transactions')
    op.drop_column('payment_transactions', 'payment_timestamp')
    op.drop_column('payment_transactions', 'payment_method')
    op.drop_column('payment_transactions', 'assignment_id')
    op.drop_column('payment_transactions', 'parent_id')
