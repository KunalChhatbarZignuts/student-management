"""Comprehensive test suite for General-Purpose AI Conversational & Dual Intelligence Engine.

Verifies:
- General-purpose questions (AI, science, mathematics, writing, programming, general chat)
  are answered with deep educational content rather than predefined menus.
- School-specific tools are called only when necessary.
- Multi-turn conversation history is maintained across turns.
- Real token-by-token SSE streaming response delivers structured events.
"""

import json
import datetime as dt
import uuid
from unittest.mock import patch
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.models
from app.db.base import Base
from app.modules.auth.models import User, UserRole, UserStatus
from app.modules.students.models import Student
from app.modules.ai.assistant import service as ai_assistant_service
from app.modules.ai.assistant.hf_provider import hf_provider


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


@pytest.fixture
def test_student(test_db):
    user = User(
        id=uuid.uuid4(),
        email="general.student@school.local",
        role=UserRole.STUDENT.value,
        status=UserStatus.ACTIVE.value,
    )
    test_db.add(user)
    test_db.flush()

    student = Student(
        id=uuid.uuid4(),
        user_id=user.id,
        student_code="STU-GEN-001",
        enrollment_number="ENR-GEN-001",
        first_name="Leonardo",
        last_name="DaVinci",
        dob=dt.date(2008, 4, 15),
        admission_date=dt.date(2026, 9, 1),
        class_name="Grade 11",
        section="A",
        department="Science",
        gender="male",
    )
    test_db.add(student)
    test_db.commit()
    test_db.refresh(student)
    return student


def test_general_question_artificial_intelligence(test_db, test_student):
    """Verifies that asking 'What is artificial intelligence?' yields a detailed explanation, not a school menu."""
    result = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="What is artificial intelligence?",
        conversation_id=None,
        db=test_db,
    )

    content = result["content"]
    assert "Artificial Intelligence" in content
    assert "Machine Learning" in content
    assert "Natural Language Processing" in content
    assert result["tools_used"] == []  # No school tools invoked
    assert "What is my next class?" not in content  # Menu not displayed


def test_educational_question_photosynthesis(test_db, test_student):
    """Verifies that asking 'Explain photosynthesis' includes biological stages and balanced chemical equation."""
    result = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="Explain photosynthesis in simple language with the formula",
        conversation_id=None,
        db=test_db,
    )

    content = result["content"]
    assert "Photosynthesis" in content
    assert "Light-Dependent Reactions" in content
    assert "Calvin Cycle" in content
    assert "CO}_2" in content or "CO_2" in content
    assert result["tools_used"] == []


def test_educational_question_newtons_laws(test_db, test_student):
    """Verifies that asking 'Teach me Newton's laws' breaks down all three laws of motion."""
    result = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="Teach me Newton's laws of motion",
        conversation_id=None,
        db=test_db,
    )

    content = result["content"]
    assert "Newton" in content
    assert "First Law" in content or "Inertia" in content
    assert "Second Law" in content or "F = ma" in content or "F_{" in content
    assert "Third Law" in content or "Action and Reaction" in content
    assert result["tools_used"] == []


def test_technical_question_frontend_vs_backend(test_db, test_student):
    """Verifies that technical questions compare architectures comprehensively."""
    result = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="What is the difference between frontend and backend development?",
        conversation_id=None,
        db=test_db,
    )

    content = result["content"]
    assert "Frontend" in content
    assert "Backend" in content
    assert "Client-Side" in content or "Server-Side" in content
    assert result["tools_used"] == []


def test_writing_assistance_email_draft(test_db, test_student):
    """Verifies that writing assistance requests provide a structured email template."""
    result = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="Help me write an email to my teacher asking for help",
        conversation_id=None,
        db=test_db,
    )

    content = result["content"]
    assert "Subject:" in content
    assert "Dear" in content
    assert "Sincerely" in content
    assert test_student.first_name in content
    assert result["tools_used"] == []


def test_multi_turn_conversation_context(test_db, test_student):
    """Verifies multi-turn conversational persistence with follow-up queries."""
    # Turn 1: General concept
    turn1 = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="What is object-oriented programming?",
        conversation_id=None,
        db=test_db,
    )
    conv_id = turn1["conversation_id"]
    assert "Object-Oriented Programming" in turn1["content"]

    # Turn 2: Follow-up question in the same conversation
    turn2 = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="Give me school project ideas for my science exhibition",
        conversation_id=conv_id,
        db=test_db,
    )
    assert turn2["conversation_id"] == conv_id
    assert "School Project" in turn2["content"] or "Science Fair" in turn2["content"]


def test_school_record_question_invokes_tools(test_db, test_student):
    """Verifies that asking about school records like timetable or attendance calls the appropriate tool."""
    result = ai_assistant_service.process_assistant_chat(
        student=test_student,
        message="What is my timetable tomorrow?",
        conversation_id=None,
        db=test_db,
    )

    assert "get_student_timetable" in result["tools_used"]
    assert "Timetable" in result["content"]


@pytest.mark.asyncio
async def test_streaming_assistant_chat_generator(test_db, test_student):
    """Verifies that stream_assistant_chat yields metadata, tokens, and done events."""
    chunks = []
    async for event_line in ai_assistant_service.stream_assistant_chat(
        student=test_student,
        message="Explain photosynthesis",
        conversation_id=None,
        db=test_db,
    ):
        chunks.append(event_line)

    full_stream = "".join(chunks)
    assert "event: metadata" in full_stream
    assert "event: token" in full_stream
    assert "event: done" in full_stream
    assert "Photosynthesis" in full_stream
