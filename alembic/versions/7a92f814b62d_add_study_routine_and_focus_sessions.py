"""add_study_routine_and_focus_sessions

Revision ID: 7a92f814b62d
Revises: 5d88363b21fa
Create Date: 2026-11-24 15:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a92f814b62d'
down_revision: Union[str, Sequence[str], None] = '5d88363b21fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns to ai_daily_study_plans
    op.add_column('ai_daily_study_plans', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('ai_daily_study_plans', sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    # 2. Add columns to ai_study_plan_items
    op.add_column('ai_study_plan_items', sa.Column('title', sa.String(length=200), nullable=True))
    op.add_column('ai_study_plan_items', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('ai_study_plan_items', sa.Column('priority', sa.String(length=20), server_default='MEDIUM', nullable=False))
    op.add_column('ai_study_plan_items', sa.Column('status', sa.String(length=30), server_default='PENDING', nullable=False))
    op.add_column('ai_study_plan_items', sa.Column('is_custom', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('ai_study_plan_items', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('ai_study_plan_items', sa.Column('recommended_resource_url', sa.String(length=500), nullable=True))
    op.add_column('ai_study_plan_items', sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    # 3. Create ai_study_sessions table
    op.create_table(
        'ai_study_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('student_id', sa.Uuid(), nullable=False),
        sa.Column('plan_item_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='ACTIVE', nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('accumulated_seconds', sa.Integer(), server_default='0', nullable=False),
        sa.Column('target_duration_seconds', sa.Integer(), server_default='1500', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_item_id'], ['ai_study_plan_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_study_sessions_student_id'), 'ai_study_sessions', ['student_id'], unique=False)
    op.create_index(op.f('ix_ai_study_sessions_plan_item_id'), 'ai_study_sessions', ['plan_item_id'], unique=False)
    op.create_index('ix_ai_study_sessions_student_status', 'ai_study_sessions', ['student_id', 'status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_ai_study_sessions_student_status', table_name='ai_study_sessions')
    op.drop_index(op.f('ix_ai_study_sessions_plan_item_id'), table_name='ai_study_sessions')
    op.drop_index(op.f('ix_ai_study_sessions_student_id'), table_name='ai_study_sessions')
    op.drop_table('ai_study_sessions')

    op.drop_column('ai_study_plan_items', 'is_deleted')
    op.drop_column('ai_study_plan_items', 'recommended_resource_url')
    op.drop_column('ai_study_plan_items', 'notes')
    op.drop_column('ai_study_plan_items', 'is_custom')
    op.drop_column('ai_study_plan_items', 'status')
    op.drop_column('ai_study_plan_items', 'priority')
    op.drop_column('ai_study_plan_items', 'description')
    op.drop_column('ai_study_plan_items', 'title')

    op.drop_column('ai_daily_study_plans', 'is_archived')
    op.drop_column('ai_daily_study_plans', 'notes')
