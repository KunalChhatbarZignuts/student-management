"""Comprehensive Unit & Integration Test Suite for Hugging Face LLM & pgvector RAG Integration."""

import datetime as dt
import json
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.models
from app.core.deps import get_current_user, get_db
from app.db.base import Base
from app.main import app
from app.modules.ai.assistant.models import AIStudentConversation, AIStudentMessage, MessageSender
from app.modules.ai.assistant.knowledge_models import SchoolKnowledgeChunk, SchoolKnowledgeDocument
from app.modules.students.models import Student
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.ai.assistant import service as ai_assistant_service, tools as ai_assistant_tools
from app.modules.ai.assistant.hf_provider import HuggingFaceProvider, hf_provider
from app.modules.ai.assistant.rag_service import AIRagService, ai_rag_service, chunk_text


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
def mock_student_setup(test_db):
    db = test_db

    student_user = User(
        id=uuid.uuid4(),
        email="ada.lovelace@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(student_user)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=student_user.id,
        student_code="STU-2026-00001",
        enrollment_number="ENR-2026-00001",
        first_name="Ada",
        last_name="Lovelace",
        dob=dt.date(2008, 12, 10),
        admission_date=dt.date(2026, 9, 1),
        gender="FEMALE",
        class_name="Grade 11",
        section="A",
        department="Computer Science",
    )
    db.add(student)
    db.commit()
    db.refresh(student_user)
    db.refresh(student)
    return {"user": student_user, "student": student}


# ===========================================================================
# 1. HuggingFaceProvider Unit Tests
# ===========================================================================

def test_hf_provider_configuration():
    """Verifies that HuggingFaceProvider correctly identifies whether token is present."""
    empty_provider = HuggingFaceProvider(api_token="", model_id="Qwen/Qwen2.5-7B-Instruct")
    assert not empty_provider.is_configured()
    assert empty_provider.client is None
    assert empty_provider.chat_completion([{"role": "user", "content": "hi"}]) is None
    assert empty_provider.generate_embedding("hello") is None

    configured_provider = HuggingFaceProvider(api_token="hf_test_mock_token_12345")
    assert configured_provider.is_configured()
    assert configured_provider.client is not None


def test_hf_provider_chat_completion_mock():
    """Verifies chat completion parsing and error handling."""
    provider = HuggingFaceProvider(api_token="hf_mock_token")
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "  Hello from Qwen2.5-7B! Here is your timetable explanation.  "
    mock_response = MagicMock(choices=[mock_choice])
    mock_client.chat_completion.return_value = mock_response

    provider._client = mock_client
    res = provider.chat_completion([{"role": "user", "content": "Hello"}])
    assert res == "Hello from Qwen2.5-7B! Here is your timetable explanation."

    # Verify exception fallback
    mock_client.chat_completion.side_effect = Exception("Hugging Face API rate limit")
    res_err = provider.chat_completion([{"role": "user", "content": "Hello"}])
    assert res_err is None


def test_hf_provider_streaming_mock():
    """Verifies that token streaming generator yields text chunks cleanly."""
    provider = HuggingFaceProvider(api_token="hf_mock_token")
    mock_client = MagicMock()

    chunk1 = MagicMock(choices=[MagicMock(delta=MagicMock(content="Hello "))])
    chunk2 = MagicMock(choices=[MagicMock(delta=MagicMock(content="student!"))])
    mock_client.chat_completion.return_value = iter([chunk1, chunk2])
    provider._client = mock_client

    tokens = list(provider.stream_chat_completion([{"role": "user", "content": "Hi"}]))
    assert tokens == ["Hello ", "student!"]


def test_hf_provider_embedding_mock():
    """Verifies dense vector extraction for 384-dimensional embeddings."""
    provider = HuggingFaceProvider(api_token="hf_mock_token")
    mock_client = MagicMock()
    mock_client.feature_extraction.return_value = [0.123] * 384
    provider._client = mock_client

    emb = provider.generate_embedding("School Attendance Policy")
    assert emb is not None
    assert len(emb) == 384
    assert emb[0] == pytest.approx(0.123)


# ===========================================================================
# 2. Text Chunking & RAG Knowledge Base Tests
# ===========================================================================

def test_text_chunking_utility():
    """Tests chunking of long educational policy text."""
    sample_text = (
        "Paragraph 1: St. Joseph Academy attendance rules require 75% minimum attendance.\n\n"
        "Paragraph 2: Medical leave requires a certified doctor's certificate within 48 hours.\n\n"
        "Paragraph 3: Late arrival after 08:45 AM will be marked as tardy."
    )
    chunks = chunk_text(sample_text, chunk_size=20, overlap=5)
    assert len(chunks) >= 2
    assert "75%" in chunks[0]


def test_rag_service_ingest_and_search(test_db):
    """Tests document ingestion and keyword fallback search in SQLite."""
    rag = AIRagService()
    doc = rag.ingest_document(
        db=test_db,
        title="Student Uniform & Lab Safety",
        category="SAFETY_POLICY",
        content="All students entering chemistry laboratories must wear safety goggles and lab coats.",
    )
    assert doc.id is not None
    assert doc.title == "Student Uniform & Lab Safety"

    # Search keyword
    matches = rag.search_knowledge_base(test_db, query="What must students wear in chemistry laboratories?")
    assert len(matches) > 0
    assert any("goggles" in m["chunk_content"] for m in matches)


def test_rag_service_seed_default_knowledge(test_db):
    """Verifies default official school handbooks (attendance, fees, exams) seed properly."""
    rag = AIRagService()
    rag.seed_default_knowledge(test_db)

    docs = test_db.query(SchoolKnowledgeDocument).all()
    assert len(docs) >= 4

    categories = [d.category for d in docs]
    assert "ATTENDANCE_POLICY" in categories
    assert "EXAMINATION_POLICY" in categories
    assert "FEE_POLICY" in categories
    assert "CODE_OF_CONDUCT" in categories


# ===========================================================================
# 3. Tool Dispatch & Intent Routing
# ===========================================================================

def test_tool_search_school_knowledge(test_db, mock_student_setup):
    """Tests that tool_search_school_knowledge returns structured knowledge chunks."""
    student = mock_student_setup["student"]
    ai_rag_service.seed_default_knowledge(test_db)

    result = ai_assistant_tools.execute_tool(
        "search_school_knowledge",
        {"query": "minimum attendance rule"},
        student,
        test_db,
    )
    assert "documents" in result
    assert result["results_count"] > 0
    doc_titles = [d["document_title"] for d in result["documents"]]
    assert "School Attendance & Leave Rules" in doc_titles


def test_intent_classification_for_school_rules():
    """Tests that queries about school rules, handbooks, and policies trigger search_school_knowledge."""
    queries = [
        "What is the school uniform policy?",
        "What are the library borrowing rules?",
        "What is the passing mark and grading system?",
        "What happens if I have a late fee?",
        "Is there an attendance cut-off for exams?",
    ]
    for q in queries:
        tools = ai_assistant_service.classify_query_intent(q)
        assert "search_school_knowledge" in tools, f"Query '{q}' failed to route to search_school_knowledge"


# ===========================================================================
# 4. End-to-End Chat & Fallback Verification
# ===========================================================================

def test_chat_with_huggingface_completion_mock(test_db, mock_student_setup):
    """Verifies that when Hugging Face LLM succeeds, its response is recorded in conversation."""
    student = mock_student_setup["student"]
    ai_rag_service.seed_default_knowledge(test_db)

    with patch.object(hf_provider, "is_configured", return_value=True), \
         patch.object(hf_provider, "chat_completion", return_value="**Official Attendance Policy**: You need at least 75% attendance to take exams."):

        result = ai_assistant_service.process_assistant_chat(
            student=student,
            message="What is the minimum attendance rule for exams?",
            conversation_id=None,
            db=test_db,
        )

        assert result["content"] == "**Official Attendance Policy**: You need at least 75% attendance to take exams."
        assert "search_school_knowledge" in result["tools_used"]


def test_chat_offline_fallback_resilience(test_db, mock_student_setup):
    """Verifies that when Hugging Face LLM is unconfigured, deterministic synthesizer provides answers."""
    student = mock_student_setup["student"]
    ai_rag_service.seed_default_knowledge(test_db)

    with patch.object(hf_provider, "is_configured", return_value=False):
        result = ai_assistant_service.process_assistant_chat(
            student=student,
            message="What is the school attendance rule?",
            conversation_id=None,
            db=test_db,
        )

        assert "Official School Information & Guidelines" in result["content"]
        assert "School Attendance & Leave Rules" in result["content"]


# ===========================================================================
# 5. API Endpoint Tests (Standard JSON & SSE Streaming)
# ===========================================================================

def test_api_chat_standard_json(test_db, mock_student_setup):
    """Tests POST /api/v1/student/assistant/chat returns 200 with complete response."""
    user = mock_student_setup["user"]

    def override_get_db():
        yield test_db

    def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)
    response = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "What is the school library rule?", "stream": False},
    )
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert "content" in data
    assert "tools_used" in data


def test_api_chat_sse_streaming(test_db, mock_student_setup):
    """Tests POST /api/v1/student/assistant/chat with stream: true returns text/event-stream."""
    user = mock_student_setup["user"]

    def override_get_db():
        yield test_db

    def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)
    response = client.post(
        "/api/v1/student/assistant/chat",
        json={"message": "What is my timetable tomorrow?", "stream": True},
    )
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    text_body = response.text
    assert "event: metadata" in text_body
    assert "event: token" in text_body
    assert "event: done" in text_body
