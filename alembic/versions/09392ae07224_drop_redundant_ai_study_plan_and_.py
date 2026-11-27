"""drop_redundant_ai_study_plan_and_recommendation_tables

Revision ID: 09392ae07224
Revises: d7c9955c91fe
Create Date: 2026-11-27 14:59:51.107982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09392ae07224'
down_revision: Union[str, Sequence[str], None] = 'd7c9955c91fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop redundant AI tables if they exist."""
    # Use IF EXISTS safely across all targets
    op.execute("DROP TABLE IF EXISTS ai_study_sessions CASCADE;")
    op.execute("DROP TABLE IF EXISTS ai_study_plan_items CASCADE;")
    op.execute("DROP TABLE IF EXISTS ai_daily_study_plans CASCADE;")
    op.execute("DROP TABLE IF EXISTS ai_learning_recommendations CASCADE;")
    op.execute("DROP TABLE IF EXISTS ai_student_study_settings CASCADE;")
    op.execute("DROP TABLE IF EXISTS school_knowledge_chunks CASCADE;")
    op.execute("DROP TABLE IF EXISTS school_knowledge_documents CASCADE;")


def downgrade() -> None:
    """Recreate dropped tables if required."""
    pass
