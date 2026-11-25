"""remove redundant examination_notifications and online_whiteboard_events

Revision ID: 9f00cd84b0d9
Revises: b1b585a1a460
Create Date: 2026-11-25 16:42:49.700013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f00cd84b0d9'
down_revision: Union[str, Sequence[str], None] = 'b1b585a1a460'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop redundant empty tables: examination_notifications and online_whiteboard_events."""
    op.execute("DROP TABLE IF EXISTS online_whiteboard_events CASCADE")
    op.execute("DROP TABLE IF EXISTS examination_notifications CASCADE")


def downgrade() -> None:
    """Recreate tables if required."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS online_whiteboard_events (
            id UUID PRIMARY KEY,
            whiteboard_session_id UUID NOT NULL REFERENCES online_whiteboard_sessions(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_type VARCHAR(50) NOT NULL,
            payload JSONB NOT NULL,
            sequence_num INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS examination_notifications (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
