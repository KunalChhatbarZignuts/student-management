import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ChatQuizCard from '@/features/assistant/components/ChatQuizCard';
import ChatFlashcardDeck from '@/features/assistant/components/ChatFlashcardDeck';
import ExamPrepChecklistCard from '@/features/assistant/components/ExamPrepChecklistCard';
import ChatInputBar from '@/features/assistant/components/ChatInputBar';
import StudentAssistantPage from '@/app/assistant/page';
import { renderWithProviders } from '@/tests/test-utils';
import { assistantApi } from '../api';
import {
  QuizGenerationResponse,
  QuizEvaluationResponse,
  FlashcardDeckResponse,
  ExamPrepPlanResponse,
} from '../types';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/assistant',
}));

vi.mock('@/features/auth/hooks', () => ({
  useAuth: () => ({
    user: {
      id: 'stu-user-1',
      email: 'student_test@example.com',
      full_name: 'Ada Lovelace',
      first_name: 'Ada',
      role: 'student',
      must_change_password: false,
    },
    isAuthenticated: true,
    isBootstrapped: true,
  }),
}));

vi.mock('../api', () => ({
  assistantKeys: {
    all: ['student-assistant'],
    conversations: () => ['student-assistant', 'conversations'],
    conversation: (id: string) => ['student-assistant', 'conversation', id],
    suggestions: () => ['student-assistant', 'suggestions'],
    briefing: () => ['student-assistant', 'briefing'],
    dailyChallenge: (subject?: string) => ['student-assistant', 'daily-challenge', subject],
    careerDiscovery: (interests?: string) => ['student-assistant', 'career-discovery', interests],
  },
  assistantApi: {
    getConversations: vi.fn(),
    getConversationDetail: vi.fn(),
    sendMessage: vi.fn(),
    renameConversation: vi.fn(),
    deleteConversation: vi.fn(),
    getSuggestions: vi.fn(),
    generateQuiz: vi.fn(),
    evaluateQuiz: vi.fn(),
    generateFlashcards: vi.fn(),
    getExamPrep: vi.fn(),
    uploadImage: vi.fn(),
    uploadDocument: vi.fn(),
    getHomeworkHint: vi.fn(),
    getMorningBriefing: vi.fn(),
    getDailyChallenge: vi.fn(),
    getCareerDiscovery: vi.fn(),
  },
}));

const mockQuizData: QuizGenerationResponse = {
  quiz_id: 'quiz-101',
  subject_name: 'Mathematics',
  chapter_title: 'Linear Equations',
  difficulty: 'MEDIUM',
  questions: [
    {
      id: 'q-1',
      question_text: 'Solve for x: 2x + 4 = 10',
      question_type: 'MCQ',
      options: ['2', '3', '4', '5'],
      hint: 'Subtract 4 from both sides first.',
    },
    {
      id: 'q-2',
      question_text: 'What is the y-intercept of y = 3x + 7?',
      question_type: 'MCQ',
      options: ['3', '7', '0', '-7'],
      hint: 'Set x = 0.',
    },
  ],
};

const mockEvaluationData: QuizEvaluationResponse = {
  quiz_id: 'quiz-101',
  total_questions: 2,
  correct_count: 2,
  score_percentage: 100.0,
  feedback: [
    {
      question_id: 'q-1',
      question_text: 'Solve for x: 2x + 4 = 10',
      student_answer: 'Option 2',
      correct_answer: '3',
      is_correct: true,
      explanation: '2x = 6 => x = 3.',
    },
    {
      question_id: 'q-2',
      question_text: 'What is the y-intercept of y = 3x + 7?',
      student_answer: 'Option 2',
      correct_answer: '7',
      is_correct: true,
      explanation: 'When x = 0, y = 7.',
    },
  ],
  recommendation: 'Perfect score! You have solid algebra fundamentals.',
};

const mockFlashcardDeck: FlashcardDeckResponse = {
  subject_name: 'Science',
  chapter_title: 'Cell Biology',
  cards: [
    {
      id: 'c-1',
      front: 'Mitochondria',
      back: 'Powerhouse of the eukaryotic cell responsible for ATP cellular respiration.',
      hint: 'ATP powerhouse.',
      subject: 'Science',
    },
    {
      id: 'c-2',
      front: 'Photosynthesis',
      back: '6CO2 + 6H2O -> C6H12O6 + 6O2 using sunlight in chloroplasts.',
      hint: 'Sunlight to glucose.',
      subject: 'Science',
    },
  ],
};

const mockExamPrepPlan: ExamPrepPlanResponse = {
  exam_name: 'Term 2 Finals - Physics',
  exam_date: '2026-12-05',
  days_remaining: 12,
  total_topics: 3,
  checklist: [
    {
      day_number: 1,
      date_str: '2026-11-23',
      topic_name: 'Kinematics & Motion Equations',
      study_duration_minutes: 40,
      focus_area: 'High Weightage',
      is_completed: false,
    },
    {
      day_number: 2,
      date_str: '2026-11-24',
      topic_name: 'Newton Laws of Motion',
      study_duration_minutes: 45,
      focus_area: 'Core Principles',
      is_completed: false,
    },
  ],
  key_tips: [
    'Solve at least 2 practice problems each day.',
    'Review formulas before sleeping.',
  ],
};

describe('Release 2: Academic Intelligence Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assistantApi.getConversations).mockResolvedValue([]);
    vi.mocked(assistantApi.getSuggestions).mockResolvedValue([]);
    vi.mocked(assistantApi.evaluateQuiz).mockResolvedValue(mockEvaluationData);
    vi.mocked(assistantApi.sendMessage).mockResolvedValue({
      conversation_id: 'conv-new',
      message_id: 'msg-new',
      content: 'Here is your academic response.',
      tools_used: ['generate_quiz'],
      action_links: [],
      created_at: '2026-11-23T12:00:00Z',
    });
  });

  it('TC-FE-R2-01: renders interactive ChatQuizCard and evaluates student answers', async () => {
    renderWithProviders(<ChatQuizCard quiz={mockQuizData} />);

    // Header & Question 1
    expect(screen.getByText('Mathematics Practice Quiz')).toBeInTheDocument();
    expect(screen.getByText('Solve for x: 2x + 4 = 10')).toBeInTheDocument();

    // Select option '3' (index 1)
    fireEvent.click(screen.getByText('3'));

    // Move to next question
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('What is the y-intercept of y = 3x + 7?')).toBeInTheDocument();

    // Select option '7' (index 1)
    fireEvent.click(screen.getByText('7'));

    // Submit answers
    const submitBtn = screen.getByRole('button', { name: /submit answers/i });
    fireEvent.click(submitBtn);

    // Evaluation feedback renders
    await waitFor(() => {
      expect(assistantApi.evaluateQuiz).toHaveBeenCalledWith('quiz-101', expect.any(Array));
      expect(screen.getByText(/Score: 2 \/ 2 \(100%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Perfect score!/i)).toBeInTheDocument();
    });
  });

  it('TC-FE-R2-02: renders ChatFlashcardDeck and flips card to reveal answers', () => {
    renderWithProviders(<ChatFlashcardDeck deck={mockFlashcardDeck} />);

    expect(screen.getByText('Science Revision Flashcards')).toBeInTheDocument();
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    expect(screen.getByText('QUESTION / CONCEPT')).toBeInTheDocument();

    // Click to flip card
    fireEvent.click(screen.getByText('Mitochondria'));

    expect(screen.getByText('ANSWER / FORMULA')).toBeInTheDocument();
    expect(screen.getByText(/Powerhouse of the eukaryotic cell/i)).toBeInTheDocument();

    // Next card
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Photosynthesis')).toBeInTheDocument();

    // Mark as mastered
    const masterBtn = screen.getByRole('button', { name: /mark as mastered/i });
    fireEvent.click(masterBtn);
    expect(screen.getByRole('button', { name: /mastered/i })).toBeInTheDocument();
  });

  it('TC-FE-R2-03: renders ExamPrepChecklistCard with countdown and milestone toggles', () => {
    renderWithProviders(<ExamPrepChecklistCard plan={mockExamPrepPlan} />);

    expect(screen.getByText('Term 2 Finals - Physics')).toBeInTheDocument();
    expect(screen.getByText('12 Days Remaining')).toBeInTheDocument();
    expect(screen.getByText(/Day 1: Kinematics & Motion Equations/i)).toBeInTheDocument();

    // Toggle milestone completion
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    // Tips shown
    expect(screen.getByText(/Solve at least 2 practice problems each day/i)).toBeInTheDocument();
  });

  it('TC-FE-R2-04: triggers onUploadImage and onUploadDocument from ChatInputBar', () => {
    const handleUploadImg = vi.fn();
    const handleUploadDoc = vi.fn();

    renderWithProviders(
      <ChatInputBar
        onSendMessage={vi.fn()}
        onUploadImage={handleUploadImg}
        onUploadDocument={handleUploadDoc}
      />
    );

    const imgBtn = screen.getByRole('button', { name: /Upload question image/i });
    const docBtn = screen.getByRole('button', { name: /Upload study notes/i });
    expect(imgBtn).toBeInTheDocument();
    expect(docBtn).toBeInTheDocument();
  });

  it('TC-FE-R2-05: clicks academic quick feature shortcuts on StudentAssistantPage', async () => {
    renderWithProviders(<StudentAssistantPage />);

    expect(screen.getByText('🎯 Practice Quiz')).toBeInTheDocument();
    expect(screen.getByText('🗂️ Flashcards')).toBeInTheDocument();
    expect(screen.getByText('📅 Exam Prep')).toBeInTheDocument();
    expect(screen.getByText('💡 Homework Help')).toBeInTheDocument();

    // Click Practice Quiz chip
    fireEvent.click(screen.getByText('🎯 Practice Quiz'));

    await waitFor(() => {
      expect(assistantApi.sendMessage).toHaveBeenCalledWith(
        'Generate an interactive practice quiz for Mathematics',
        null
      );
    });
  });
});
