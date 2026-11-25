"""project wide table reduction and query consolidation

Revision ID: 4a2f0bb4c24e
Revises: 083c932b2077
Create Date: 2026-11-25 16:57:44.840589

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a2f0bb4c24e'
down_revision: Union[str, Sequence[str], None] = '083c932b2077'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Consolidate redundant tables into parent entities and JSONB structures."""
    # 1. Consolidate online_whiteboard_sessions into online_classes.whiteboard_state
    op.execute("""
        ALTER TABLE online_classes
        ADD COLUMN IF NOT EXISTS whiteboard_state JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS materials_list JSONB DEFAULT '[]'::jsonb;
    """)

    # 2. Drop empty secondary tables in online classroom
    op.execute("DROP TABLE IF EXISTS online_whiteboard_sessions CASCADE;")
    op.execute("DROP TABLE IF EXISTS online_class_materials CASCADE;")

    # 3. Consolidate calendar_special_working_days into school_holidays
    op.execute("""
        ALTER TABLE school_holidays
        ADD COLUMN IF NOT EXISTS event_type VARCHAR(30) DEFAULT 'HOLIDAY';
    """)
    # Backfill calendar_special_working_days into school_holidays if exists
    op.execute("""
        INSERT INTO school_holidays (
            id, name, category_id, academic_year_id, start_date, end_date, 
            description, status, created_by_user_id, event_type, created_at, updated_at,
            applicable_grade_ids, applicable_section_ids
        )
        SELECT 
            swd.id,
            swd.reason,
            (SELECT id FROM holiday_categories LIMIT 1),
            swd.academic_year_id,
            swd.date,
            swd.date,
            swd.reason,
            'active',
            swd.created_by_user_id,
            'SPECIAL_WORKING_DAY',
            swd.created_at,
            swd.updated_at,
            '[]'::jsonb,
            '[]'::jsonb
        FROM calendar_special_working_days swd
        ON CONFLICT (id) DO NOTHING;
    """)
    op.execute("DROP TABLE IF EXISTS calendar_special_working_days CASCADE;")


def downgrade() -> None:
    """Recreate tables on downgrade."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS online_whiteboard_sessions (
            id UUID PRIMARY KEY,
            class_id UUID NOT NULL REFERENCES online_classes(id) ON DELETE CASCADE,
            current_page INTEGER NOT NULL DEFAULT 1,
            snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS online_class_materials (
            id UUID PRIMARY KEY,
            class_id UUID NOT NULL REFERENCES online_classes(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            file_url TEXT NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_size_bytes BIGINT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS calendar_special_working_days (
            id UUID PRIMARY KEY,
            academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
            date DATE NOT NULL,
            reason TEXT NOT NULL,
            created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)
