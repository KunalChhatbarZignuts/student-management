"""Retrieval-Augmented Generation (RAG) Service for School Knowledge Base.

Handles:
- Ingestion of school handbooks, policies, FAQs, and guidelines
- Text chunking with sliding window and token estimation
- 384-dimensional dense vector embeddings with pgvector storage
- Semantic vector similarity search (<=> cosine distance) with keyword fallback
- Automated pre-seeding of authoritative school knowledge documents
"""

import logging
import re
import uuid
from typing import Any, List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.school_knowledge import SchoolKnowledgeChunk, SchoolKnowledgeDocument
from app.services.ai_hf_provider import hf_provider

logger = logging.getLogger(__name__)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Splits text into overlapping chunks based on sentences or paragraphs."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for para in paragraphs:
        para_len = len(para.split())
        if current_len + para_len > chunk_size and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            # Keep the last paragraph for overlap if it's small enough
            if len(current_chunk[-1].split()) <= overlap:
                current_chunk = [current_chunk[-1], para]
                current_len = len(current_chunk[0].split()) + para_len
            else:
                current_chunk = [para]
                current_len = para_len
        else:
            current_chunk.append(para)
            current_len += para_len

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    # Fallback if text has no paragraphs
    if not chunks and text.strip():
        words = text.split()
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i : i + chunk_size])
            if chunk.strip():
                chunks.append(chunk.strip())

    return chunks


class AIRagService:
    """Manages document ingestion and semantic retrieval for the AI Student Assistant."""

    def ingest_document(
        self,
        db: Session,
        title: str,
        category: str,
        content: str,
        source_filename: Optional[str] = None,
    ) -> SchoolKnowledgeDocument:
        """Stores a document and splits it into searchable vector chunks."""
        # Check if an active document with the same title already exists
        existing = db.execute(
            select(SchoolKnowledgeDocument).where(
                SchoolKnowledgeDocument.title == title,
                SchoolKnowledgeDocument.is_active == True,
            )
        ).scalar_one_or_none()

        if existing:
            doc = existing
            doc.category = category
            doc.content = content
            doc.source_filename = source_filename
            # Delete old chunks to refresh
            db.execute(
                SchoolKnowledgeChunk.__table__.delete().where(
                    SchoolKnowledgeChunk.document_id == doc.id
                )
            )
        else:
            doc = SchoolKnowledgeDocument(
                title=title,
                category=category,
                content=content,
                source_filename=source_filename,
                is_active=True,
            )
            db.add(doc)
            db.flush()

        # Chunk content
        chunks = chunk_text(content)
        for idx, chunk_str in enumerate(chunks):
            embedding = hf_provider.generate_embedding(chunk_str)
            token_count = len(chunk_str.split())
            chunk_obj = SchoolKnowledgeChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_content=chunk_str,
                embedding=embedding,
                token_count=token_count,
            )
            db.add(chunk_obj)

        db.commit()
        db.refresh(doc)
        logger.info("Ingested document '%s' with %d chunks.", doc.title, len(chunks))
        return doc

    def search_knowledge_base(
        self,
        db: Session,
        query: str,
        limit: int = 3,
        category: Optional[str] = None,
    ) -> List[dict[str, Any]]:
        """Searches school knowledge using vector cosine similarity or keyword fallback."""
        if not query.strip():
            return []

        # Ensure documents are present (seed on first search if empty)
        doc_count = db.execute(select(SchoolKnowledgeDocument.id)).first()
        if not doc_count:
            self.seed_default_knowledge(db)

        # 1. Try Vector Cosine Distance if HF provider is configured
        query_embedding = hf_provider.generate_embedding(query)
        if query_embedding:
            try:
                stmt = (
                    select(SchoolKnowledgeChunk, SchoolKnowledgeDocument)
                    .join(
                        SchoolKnowledgeDocument,
                        SchoolKnowledgeChunk.document_id == SchoolKnowledgeDocument.id,
                    )
                    .where(
                        SchoolKnowledgeDocument.is_active == True,
                        SchoolKnowledgeChunk.embedding.isnot(None),
                    )
                )
                if category:
                    stmt = stmt.where(SchoolKnowledgeDocument.category == category)

                stmt = stmt.order_by(
                    SchoolKnowledgeChunk.embedding.cosine_distance(query_embedding)
                ).limit(limit)

                results = db.execute(stmt).all()
                if results:
                    return [
                        {
                            "document_title": doc.title,
                            "category": doc.category,
                            "chunk_content": chunk.chunk_content,
                            "chunk_index": chunk.chunk_index,
                            "match_type": "vector_semantic",
                        }
                        for chunk, doc in results
                    ]
            except Exception as exc:
                logger.warning("Vector search query failed (%s); falling back to keyword search.", exc)

        # 2. Keyword fallback (ILIKE)
        keywords = [w for w in re.split(r"\W+", query.lower()) if len(w) > 2]
        stmt = (
            select(SchoolKnowledgeChunk, SchoolKnowledgeDocument)
            .join(
                SchoolKnowledgeDocument,
                SchoolKnowledgeChunk.document_id == SchoolKnowledgeDocument.id,
            )
            .where(SchoolKnowledgeDocument.is_active == True)
        )
        if category:
            stmt = stmt.where(SchoolKnowledgeDocument.category == category)

        if keywords:
            clauses = [
                SchoolKnowledgeChunk.chunk_content.ilike(f"%{kw}%") for kw in keywords[:5]
            ] + [SchoolKnowledgeDocument.title.ilike(f"%{kw}%") for kw in keywords[:5]]
            stmt = stmt.where(or_(*clauses))

        stmt = stmt.limit(limit)
        results = db.execute(stmt).all()
        return [
            {
                "document_title": doc.title,
                "category": doc.category,
                "chunk_content": chunk.chunk_content,
                "chunk_index": chunk.chunk_index,
                "match_type": "keyword_fallback",
            }
            for chunk, doc in results
        ]

    def seed_default_knowledge(self, db: Session) -> None:
        """Seeds standard school handbooks and policies into PostgreSQL."""
        seed_documents = [
            {
                "title": "School Attendance & Leave Rules",
                "category": "ATTENDANCE_POLICY",
                "content": (
                    "St. Joseph Academy Student Attendance Policy:\n\n"
                    "1. Minimum Attendance Requirement: All enrolled students must maintain a minimum of 75% attendance "
                    "across all academic subjects in order to be eligible for terminal, mid-term, and final board examinations.\n\n"
                    "2. Leave Application Procedure: A student must submit a leave request via the Student Portal at least 24 hours "
                    "in advance for planned absences. Medical leave for 3 or more consecutive days requires a certified doctor's certificate.\n\n"
                    "3. Daily Cut-Off Time: Morning roll call is taken at 08:30 AM. Any student arriving after 08:45 AM will be marked 'TARDY' (Late). "
                    "Three late arrivals without written explanation count as one unexcused absence."
                ),
            },
            {
                "title": "Examination Grading Scale & Passing Criteria",
                "category": "EXAMINATION_POLICY",
                "content": (
                    "St. Joseph Academy Examination & Assessment Guidelines:\n\n"
                    "1. Grading Scale:\n"
                    "- 91% to 100%: Grade A1 (Outstanding performance, Grade Point 10.0)\n"
                    "- 81% to 90%: Grade A2 (Excellent performance, Grade Point 9.0)\n"
                    "- 71% to 80%: Grade B1 (Very Good performance, Grade Point 8.0)\n"
                    "- 61% to 70%: Grade B2 (Good performance, Grade Point 7.0)\n"
                    "- 51% to 60%: Grade C1 (Fair performance, Grade Point 6.0)\n"
                    "- 41% to 50%: Grade C2 (Average performance, Grade Point 5.0)\n"
                    "- 33% to 40%: Grade D (Passing benchmark, Grade Point 4.0)\n"
                    "- Below 33%: Grade E/F (Needs improvement / Supplementary exam required)\n\n"
                    "2. Passing Mark: The minimum passing threshold for theory examinations is 35% and practical exams is 40%.\n\n"
                    "3. Hall Ticket Rules: Students must present their validated Student ID and digital Hall Ticket downloaded from "
                    "the Student Portal to enter the examination hall."
                ),
            },
            {
                "title": "Tuition Fee Schedule & Payment Policy",
                "category": "FEE_POLICY",
                "content": (
                    "St. Joseph Academy Fee Structure & Payment Guidelines:\n\n"
                    "1. Payment Schedule: Tuition and laboratory fees are payable in four quarterly installments: "
                    "Quarter 1 (Due April 10), Quarter 2 (Due July 10), Quarter 3 (Due October 10), and Quarter 4 (Due January 10).\n\n"
                    "2. Late Fee: Payments received after the 15th of the due month incur a late fee of 5% on the unpaid balance.\n\n"
                    "3. Payment Modes: Fees can be paid online securely via Razorpay in the Student/Parent Portal using Credit/Debit Cards, "
                    "UPI, or Net Banking. Official tax invoices and digital receipts are generated instantly in the Fees section."
                ),
            },
            {
                "title": "Student Code of Conduct & Library Regulations",
                "category": "CODE_OF_CONDUCT",
                "content": (
                    "Student Handbook - General Conduct & Library Services:\n\n"
                    "1. Uniform & Decorum: Students are required to wear the official school uniform Monday through Thursday. "
                    "Sports attire is allowed only on Friday or scheduled physical education days.\n\n"
                    "2. Library Book Loans: Students can borrow up to two library books simultaneously for a duration of 14 days. "
                    "Renewals can be requested once if no other student has placed a hold on the title. Overdue fine is ₹5 per day.\n\n"
                    "3. Digital Etiquette: School learning tablets and computer laboratories must be used strictly for educational research, "
                    "homework assignments, and virtual classroom sessions."
                ),
            },
        ]

        for doc_data in seed_documents:
            self.ingest_document(
                db=db,
                title=doc_data["title"],
                category=doc_data["category"],
                content=doc_data["content"],
            )
        logger.info("Pre-seeded %d official school knowledge documents.", len(seed_documents))


ai_rag_service = AIRagService()
