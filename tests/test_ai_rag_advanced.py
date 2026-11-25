"""Advanced Unit & Edge Case Test Suite for AI RAG Knowledge Base and Vector Retrieval."""

import datetime as dt
import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.models
from app.db.base import Base
from app.modules.ai.assistant.knowledge_models import SchoolKnowledgeChunk, SchoolKnowledgeDocument
from app.modules.students.models import Student
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.ai.assistant import service as ai_assistant_service, tools as ai_assistant_tools
from app.modules.ai.assistant.hf_provider import HuggingFaceProvider
from app.modules.ai.assistant.rag_service import AIRagService, chunk_text


@pytest.fixture(scope="function")
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def mock_student(test_db):
    db = test_db
    user = User(
        id=uuid.uuid4(),
        email="student.test@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
        student_code="STU-RAG-001",
        enrollment_number="ENR-RAG-001",
        first_name="Charles",
        last_name="Babbage",
        dob=dt.date(2008, 5, 20),
        admission_date=dt.date(2026, 9, 1),
        gender="MALE",
        class_name="Grade 11",
        section="A",
        department="Computer Science",
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


# ===========================================================================
# 1. Text Chunking Edge Cases
# ===========================================================================

def test_chunk_text_empty_and_whitespace():
    """Verifies that chunk_text returns an empty list for empty or pure whitespace text."""
    assert chunk_text("") == []
    assert chunk_text("   \n\t  \n ") == []


def test_chunk_text_short_string():
    """Verifies that text shorter than chunk_size produces exactly one chunk."""
    text = "Short school announcement."
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_text_huge_unbroken_text():
    """Verifies that large text is divided into multiple overlapping segments."""
    paragraphs = [f"Paragraph {i}: " + ("information " * 100) for i in range(1, 8)]
    long_text = "\n\n".join(paragraphs)
    chunks = chunk_text(long_text, chunk_size=150, overlap=30)
    assert len(chunks) >= 3
    for c in chunks:
        assert len(c) > 0


# ===========================================================================
# 2. Category-Scoped Semantic Retrieval
# ===========================================================================

def test_rag_category_filtering(test_db):
    """Verifies that search_knowledge_base strictly filters by category when specified."""
    rag_service = AIRagService()

    # Ingest document under ACADEMIC_RULES
    academic_doc = rag_service.ingest_document(
        db=test_db,
        title="Grading & Evaluation Policy",
        category="ACADEMIC_RULES",
        content="Passing mark is 50%. A grade requires 80% and above. Re-examinations occur in March.",
    )
    assert academic_doc is not None

    # Ingest document under FEES_POLICY
    fees_doc = rag_service.ingest_document(
        db=test_db,
        title="Tuition & Late Fee Policy",
        category="FEES_POLICY",
        content="Tuition fees are due on the 5th of each month. A late fee penalty of $20 applies after the 15th.",
    )
    assert fees_doc is not None

    # Search with category=ACADEMIC_RULES
    academic_results = rag_service.search_knowledge_base(
        db=test_db,
        query="fee penalty",
        category="ACADEMIC_RULES",
        limit=5,
    )
    for r in academic_results:
        assert r["category"] == "ACADEMIC_RULES"
        assert "Tuition" not in r["document_title"]

    # Search with category=FEES_POLICY
    fees_results = rag_service.search_knowledge_base(
        db=test_db,
        query="fee penalty",
        category="FEES_POLICY",
        limit=5,
    )
    assert len(fees_results) >= 1
    assert fees_results[0]["category"] == "FEES_POLICY"
    assert "late fee penalty" in fees_results[0]["chunk_content"].lower()


# ===========================================================================
# 3. Keyword Fallback Resilience When Embeddings Offline
# ===========================================================================

def test_rag_keyword_fallback_when_embedding_fails(test_db):
    """Verifies that search_knowledge_base falls back to keyword matching if HF embedding is None."""
    rag_service = AIRagService()

    # Ingest a policy document
    rag_service.ingest_document(
        db=test_db,
        title="Campus Dress Code",
        category="CODE_OF_CONDUCT",
        content="Students must wear formal navy blue blazers on Mondays and Fridays. Lab coats required for Chemistry.",
    )

    # Force provider to return None for embeddings (simulating offline/mock network failure)
    with patch("app.modules.ai.assistant.hf_provider.hf_provider.generate_embedding", return_value=None):
        results = rag_service.search_knowledge_base(
            db=test_db,
            query="navy blue blazer",
            limit=3,
        )
        assert len(results) >= 1
        assert "Campus Dress Code" in results[0]["document_title"]
        assert "blazer" in results[0]["chunk_content"].lower()


# ===========================================================================
# 4. Tool Scoped Execution (tool_search_school_knowledge)
# ===========================================================================

def test_tool_search_school_knowledge_results(mock_student, test_db):
    """Verifies tool_search_school_knowledge returns formatted knowledge payload."""
    rag_service = AIRagService()
    rag_service.ingest_document(
        db=test_db,
        title="Library Circulation Rules",
        category="CAMPUS_GUIDELINES",
        content="Students may borrow up to 3 books for 14 days. Overdue fines are 50 cents per day.",
    )

    # Query via tool
    res = ai_assistant_tools.tool_search_school_knowledge(
        student=mock_student,
        db=test_db,
        query="library books overdue fine",
    )
    assert "query" in res
    assert "documents" in res
    assert len(res["documents"]) >= 1
    assert "Library Circulation Rules" in res["documents"][0]["document_title"]
    assert "50 cents" in res["documents"][0]["chunk_content"]


def test_tool_search_school_knowledge_no_matches(mock_student, test_db):
    """Verifies tool_search_school_knowledge handles ungrounded/unknown queries gracefully."""
    res = ai_assistant_tools.tool_search_school_knowledge(
        student=mock_student,
        db=test_db,
        query="quantum subspace teleportation coordinates",
    )
    assert res["query"] == "quantum subspace teleportation coordinates"
    assert isinstance(res["documents"], list)


# ===========================================================================
# 5. In-Chat Policy Grounding & Response Synthesis
# ===========================================================================

def test_in_chat_rag_intent_routing_and_synthesis(mock_student, test_db):
    """Verifies that asking about school policies triggers search_school_knowledge and grounds the response."""
    rag_service = AIRagService()
    rag_service.ingest_document(
        db=test_db,
        title="Examination Conduct & Passing Marks",
        category="ACADEMIC_RULES",
        content="The minimum passing grade in all subjects is 50%. Students scoring below 50% must take a remediation exam.",
    )

    # 1. Intent classifier detects school knowledge intent
    tools = ai_assistant_service.classify_query_intent("What is the passing mark for examinations?")
    assert "search_school_knowledge" in tools

    # 2. Synthesize fallback response with tool results
    tool_results = {
        "search_school_knowledge": {
            "query": "What is the passing mark for examinations?",
            "documents": [
                {
                    "document_title": "Examination Conduct & Passing Marks",
                    "category": "ACADEMIC_RULES",
                    "chunk_content": "The minimum passing grade in all subjects is 50%. Students scoring below 50% must take a remediation exam.",
                }
            ],
        }
    }
    content, links = ai_assistant_service.synthesize_fallback_response(
        "What is the passing mark for examinations?",
        mock_student,
        tool_results,
    )
    assert "Official School Information & Guidelines" in content
    assert "Examination Conduct & Passing Marks" in content
    assert "50%" in content
