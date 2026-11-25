"""SQLAlchemy models for School Knowledge Base and RAG Vector Embeddings."""

import datetime as dt
import uuid
from typing import List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class SchoolKnowledgeDocument(TimestampMixin, Base):
    """Represents a curated school document, policy, guidelines, or handbook for RAG."""
    __tablename__ = "school_knowledge_documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="GENERAL")
    source_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    chunks: Mapped[List["SchoolKnowledgeChunk"]] = relationship(
        "SchoolKnowledgeChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="SchoolKnowledgeChunk.chunk_index.asc()",
    )

    __table_args__ = (
        Index("ix_school_knowledge_documents_category", "category"),
        Index("ix_school_knowledge_documents_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<SchoolKnowledgeDocument id={self.id} title='{self.title}' category='{self.category}'>"


class SchoolKnowledgeChunk(Base):
    """Text chunk and dense vector embedding for semantic similarity search."""
    __tablename__ = "school_knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("school_knowledge_documents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(Vector(384), nullable=True)
    token_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        nullable=False,
    )

    # Relationships
    document: Mapped["SchoolKnowledgeDocument"] = relationship(
        "SchoolKnowledgeDocument", back_populates="chunks"
    )

    __table_args__ = (
        Index("ix_school_knowledge_chunks_document", "document_id"),
        Index("ix_school_knowledge_chunks_idx", "document_id", "chunk_index"),
    )

    def __repr__(self) -> str:
        return f"<SchoolKnowledgeChunk id={self.id} doc={self.document_id} idx={self.chunk_index}>"
