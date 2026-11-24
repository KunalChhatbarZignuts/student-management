"""add_school_knowledge_and_vector_rag

Revision ID: e89f41b2c3a0
Revises: 9d7ed1bf7c08
Create Date: 2026-11-23 15:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'e89f41b2c3a0'
down_revision: Union[str, Sequence[str], None] = '9d7ed1bf7c08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to include vector extension and school knowledge RAG tables."""
    # Ensure pgvector extension is present
    op.execute('CREATE EXTENSION IF NOT EXISTS vector;')

    op.create_table(
        'school_knowledge_documents',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), server_default='GENERAL', nullable=False),
        sa.Column('source_filename', sa.String(length=255), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_school_knowledge_documents_category', 'school_knowledge_documents', ['category'], unique=False)
    op.create_index('ix_school_knowledge_documents_active', 'school_knowledge_documents', ['is_active'], unique=False)

    op.create_table(
        'school_knowledge_chunks',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('document_id', sa.Uuid(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), server_default='0', nullable=False),
        sa.Column('chunk_content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(384), nullable=True),
        sa.Column('token_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['school_knowledge_documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_school_knowledge_chunks_document', 'school_knowledge_chunks', ['document_id'], unique=False)
    op.create_index('ix_school_knowledge_chunks_idx', 'school_knowledge_chunks', ['document_id', 'chunk_index'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('school_knowledge_chunks')
    op.drop_table('school_knowledge_documents')
