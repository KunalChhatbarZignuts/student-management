"""add_ai_student_assistant_tables

Revision ID: 9d7ed1bf7c08
Revises: 312028156580
Create Date: 2026-11-23 11:51:29.375622

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9d7ed1bf7c08'
down_revision: Union[str, Sequence[str], None] = '312028156580'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'ai_student_conversations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('student_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), server_default='New Conversation', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_student_conversations_student', 'ai_student_conversations', ['student_id'], unique=False)
    op.create_index('ix_ai_student_conversations_created', 'ai_student_conversations', ['created_at'], unique=False)

    op.create_table(
        'ai_student_messages',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('conversation_id', sa.Uuid(), nullable=False),
        sa.Column('sender', sa.String(length=30), server_default='STUDENT', nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tools_used', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('action_links', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['ai_student_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_student_messages_conversation', 'ai_student_messages', ['conversation_id'], unique=False)
    op.create_index('ix_ai_student_messages_created', 'ai_student_messages', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_ai_student_messages_created', table_name='ai_student_messages')
    op.drop_index('ix_ai_student_messages_conversation', table_name='ai_student_messages')
    op.drop_table('ai_student_messages')

    op.drop_index('ix_ai_student_conversations_created', table_name='ai_student_conversations')
    op.drop_index('ix_ai_student_conversations_student', table_name='ai_student_conversations')
    op.drop_table('ai_student_conversations')
