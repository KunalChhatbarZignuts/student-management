"""optimize remaining tables and consolidate webhooks and ai tracking

Revision ID: 68847772102f
Revises: 4a2f0bb4c24e
Create Date: 2026-11-25 18:02:30.800710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '68847772102f'
down_revision: Union[str, Sequence[str], None] = '4a2f0bb4c24e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enhance payment_transactions with webhook tracking fields
    op.add_column('payment_transactions', sa.Column('webhook_payload', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False))
    op.add_column('payment_transactions', sa.Column('webhook_event_type', sa.String(length=50), nullable=True))
    op.add_column('payment_transactions', sa.Column('webhook_event_id', sa.String(length=100), nullable=True))
    op.create_index('ix_payment_transactions_webhook_event_id', 'payment_transactions', ['webhook_event_id'])

    # 2. Drop redundant tables
    op.execute("DROP TABLE IF EXISTS payment_webhook_events CASCADE;")
    op.execute("DROP TABLE IF EXISTS ai_student_mistakes CASCADE;")
    op.execute("DROP TABLE IF EXISTS ai_topic_masteries CASCADE;")
    op.execute("DROP TABLE IF EXISTS student_exam_results CASCADE;")

    # 3. Create views for seamless query-first compatibility
    op.execute("""
    CREATE OR REPLACE VIEW v_payment_webhook_events AS
    SELECT
        id,
        COALESCE(webhook_event_id, id::text) AS event_id,
        'razorpay'::varchar(50) AS gateway_provider,
        COALESCE(webhook_event_type, 'payment.captured') AS event_type,
        webhook_payload::text AS raw_payload,
        CASE 
            WHEN status = 'captured' THEN 'processed'
            WHEN status = 'failed' THEN 'failed'
            ELSE 'received'
        END AS processing_status,
        error_description AS failure_reason,
        0 AS retry_count,
        payment_timestamp AS processed_at,
        created_at,
        updated_at
    FROM payment_transactions
    WHERE webhook_event_id IS NOT NULL OR webhook_payload != '{}'::jsonb;
    """)

    op.execute("""
    CREATE OR REPLACE VIEW v_ai_student_mistakes AS
    SELECT
        pq.id,
        ps.student_id,
        ct.id AS topic_id,
        COALESCE(ps.subject_name, 'General') AS subject_name,
        COALESCE(ct.title, ps.chapter_title, 'Topic') AS topic_title,
        pq.question_text,
        CASE 
            WHEN pq.selected_option_index IS NOT NULL AND jsonb_array_length(pq.options::jsonb) > pq.selected_option_index
            THEN pq.options::jsonb->>pq.selected_option_index
            ELSE 'No response'
        END AS student_answer,
        CASE 
            WHEN pq.correct_option_index IS NOT NULL AND jsonb_array_length(pq.options::jsonb) > pq.correct_option_index
            THEN pq.options::jsonb->>pq.correct_option_index
            ELSE 'Correct'
        END AS correct_answer,
        COALESCE(pq.explanation, 'Review concept notes.') AS misconception_explanation,
        FALSE AS is_resolved,
        NULL::timestamptz AS resolved_at,
        pq.created_at,
        pq.updated_at
    FROM ai_practice_questions pq
    JOIN ai_practice_sessions ps ON pq.session_id = ps.id
    LEFT JOIN chapter_topics ct ON ct.chapter_id = ps.chapter_id
    WHERE pq.is_correct = FALSE;
    """)

    op.execute("""
    CREATE OR REPLACE VIEW v_ai_topic_masteries AS
    SELECT
        md5(concat(ps.student_id::text, ct.id::text))::uuid AS id,
        ps.student_id,
        ct.id AS topic_id,
        CASE
            WHEN COUNT(pq.id) >= 2 AND (COUNT(CASE WHEN pq.is_correct THEN 1 END)::float / COUNT(pq.id)) >= 0.80 THEN 'MASTERED'
            WHEN (COUNT(CASE WHEN pq.is_correct THEN 1 END)::float / COUNT(pq.id)) >= 0.60 THEN 'IMPROVING'
            WHEN COUNT(pq.id) > 0 THEN 'NEEDS_PRACTICE'
            ELSE 'NOT_STARTED'
        END AS mastery_level,
        ROUND(
            ((COUNT(CASE WHEN pq.is_correct THEN 1 END)::float / NULLIF(COUNT(pq.id), 0)) * 100)::numeric, 2
        )::float AS accuracy_percentage,
        COUNT(pq.id)::int AS attempts_count,
        COUNT(CASE WHEN pq.is_correct THEN 1 END)::int AS consecutive_correct,
        MAX(pq.created_at) AS last_assessed_at,
        MIN(pq.created_at) AS created_at,
        MAX(pq.updated_at) AS updated_at
    FROM ai_practice_questions pq
    JOIN ai_practice_sessions ps ON pq.session_id = ps.id
    JOIN chapter_topics ct ON ct.chapter_id = ps.chapter_id
    GROUP BY ps.student_id, ct.id;
    """)


def downgrade() -> None:
    # Recreate tables if needed in downgrade
    op.drop_index('ix_payment_transactions_webhook_event_id', table_name='payment_transactions')
    op.drop_column('payment_transactions', 'webhook_event_id')
    op.drop_column('payment_transactions', 'webhook_event_type')
    op.drop_column('payment_transactions', 'webhook_payload')
