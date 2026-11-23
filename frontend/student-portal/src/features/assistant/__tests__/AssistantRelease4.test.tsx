import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { MorningBriefingBanner } from '../components/MorningBriefingBanner';
import { DailyChallengeCard } from '../components/DailyChallengeCard';
import { PomodoroStudyBuddy } from '../components/PomodoroStudyBuddy';
import { ChatCareerCard } from '../components/ChatCareerCard';
import StudentAssistantPage from '../../../app/assistant/page';
import { assistantApi } from '../api';
import {
  MorningBriefingResponse,
  DailyChallengeResponse,
  CareerDiscoveryResponse,
} from '../types';

vi.mock('../api', () => ({
  assistantApi: {
    getConversations: vi.fn(),
    getConversation: vi.fn(),
    getConversationDetail: vi.fn(),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    renameConversation: vi.fn(),
    getSuggestions: vi.fn(),
    getMorningBriefing: vi.fn(),
    getDailyChallenge: vi.fn(),
    getCareerDiscovery: vi.fn(),
  },
  assistantKeys: {
    all: ['student-assistant'],
    conversations: () => ['student-assistant', 'conversations'],
    conversation: (id: string | null) => ['student-assistant', 'conversation', id],
    suggestions: () => ['student-assistant', 'suggestions'],
    briefing: () => ['student-assistant', 'briefing'],
    dailyChallenge: () => ['student-assistant', 'daily-challenge'],
    careerDiscovery: (i?: string) => ['student-assistant', 'career-discovery', i || 'all'],
  },
}));

vi.mock('@/features/auth/hooks', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', first_name: 'Ada', last_name: 'Lovelace', role: 'student' },
    isAuthenticated: true,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/assistant',
}));

const theme = createTheme();

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Release 4: Proactive AI Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('TC-FE-R4-01: renders MorningBriefingBanner and toggles collapsible details', () => {
    const mockBriefing: MorningBriefingResponse = {
      student_name: 'Ada',
      date_str: '2026-11-23',
      day_name: 'Monday',
      classes_count: 5,
      next_class_summary: 'Period 1: Mathematics in Room 101',
      nearest_exam_name: 'Finals in 12 days',
      nearest_exam_days: 12,
      pending_fee_balance: 150.0,
      calendar_notice: 'Winter break begins next month.',
      inspirational_quote: 'Success is the sum of small efforts.',
      proactive_recommendation: 'Review Mathematics notes during study periods.',
    };

    renderWithProviders(<MorningBriefingBanner briefing={mockBriefing} />);

    expect(screen.getByText(/Daily Morning Briefing • Monday/i)).toBeInTheDocument();
    expect(screen.getByText(/5 Classes Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Period 1: Mathematics in Room 101/i)).toBeInTheDocument();
    expect(screen.getByText(/Success is the sum of small efforts/i)).toBeInTheDocument();
    expect(screen.getByText(/\$150\.00 due this term/i)).toBeInTheDocument();

    // Collapse toggle button
    const collapseBtn = screen.getByRole('button', { name: /Collapse Briefing/i });
    fireEvent.click(collapseBtn);
    expect(screen.getByRole('button', { name: /Expand Briefing/i })).toBeInTheDocument();
  });

  it('TC-FE-R4-02: renders DailyChallengeCard and records streak increment on correct answer', () => {
    const mockChallenge: DailyChallengeResponse = {
      challenge_id: 'ch-101',
      date_str: '2026-11-23',
      subject: 'Physics',
      topic: 'Kinematics',
      question_text: 'What quantity is constant during free fall in a vacuum?',
      options: ['Velocity', 'Acceleration', 'Displacement', 'Momentum'],
      correct_option_index: 1,
      hint: 'It is approximately 9.8 m/s².',
      explanation: 'Gravitational acceleration remains constant.',
    };

    renderWithProviders(<DailyChallengeCard challenge={mockChallenge} />);

    expect(screen.getByText(/1-Minute Daily Challenge/i)).toBeInTheDocument();
    expect(screen.getByText(/Physics • Kinematics/i)).toBeInTheDocument();
    expect(screen.getByText(/What quantity is constant during free fall/i)).toBeInTheDocument();

    // Click Hint button
    fireEvent.click(screen.getByText(/Show Hint/i));
    expect(screen.getByText(/It is approximately 9\.8 m\/s²/i)).toBeInTheDocument();

    // Select correct option (Acceleration)
    const radioBtn = screen.getByLabelText(/Acceleration/i);
    fireEvent.click(radioBtn);

    // Submit answer
    const submitBtn = screen.getByRole('button', { name: /Submit Answer/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Correct! Streak \+1 🔥/i)).toBeInTheDocument();
    expect(screen.getByText(/Gravitational acceleration remains constant/i)).toBeInTheDocument();
    expect(localStorage.getItem('student_daily_streak_count')).toBe('2');
  });

  it('TC-FE-R4-03: renders PomodoroStudyBuddy floating pill and toggles focus sessions', () => {
    renderWithProviders(<PomodoroStudyBuddy />);

    // Docked floating button
    const pill = screen.getByText('25:00');
    expect(pill).toBeInTheDocument();

    // Click pill to open full card
    fireEvent.click(pill);
    expect(screen.getByText(/Study Buddy Timer/i)).toBeInTheDocument();

    // Switch to Break mode
    const breakBtn = screen.getByRole('button', { name: /Break 5m/i });
    fireEvent.click(breakBtn);
    expect(screen.getByText('05:00')).toBeInTheDocument();

    // Toggle start
    const startBtn = screen.getByRole('button', { name: /Start Focus/i });
    fireEvent.click(startBtn);
    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
  });

  it('TC-FE-R4-04: renders ChatCareerCard with university degrees and skill requirements', () => {
    const mockCareers: CareerDiscoveryResponse = {
      student_grade: 'Grade 10',
      top_subjects: ['Mathematics', 'Computer Science'],
      career_pathways: [
        {
          title: 'Data Science & Artificial Intelligence',
          match_score: 96,
          description: 'Build predictive AI and machine learning models.',
          primary_subjects: ['Mathematics', 'Computer Science'],
          university_degrees: ['B.S. in Computer Science', 'B.S. in Data Science'],
          key_skills: ['Python', 'Linear Algebra', 'PyTorch'],
        },
      ],
      advice: 'Focus on calculus and programming projects.',
    };

    renderWithProviders(<ChatCareerCard data={mockCareers} />);

    expect(screen.getByText(/Personalized Career Discovery/i)).toBeInTheDocument();
    expect(screen.getByText(/96% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Science & Artificial Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/B\.S\. in Computer Science/i)).toBeInTheDocument();
    expect(screen.getByText(/Focus on calculus and programming projects/i)).toBeInTheDocument();
  });

  it('TC-FE-R4-05: clicks Release 4 proactive shortcuts on StudentAssistantPage', async () => {
    (assistantApi.getConversations as any).mockResolvedValue([]);
    (assistantApi.getSuggestions as any).mockResolvedValue([]);
    (assistantApi.getMorningBriefing as any).mockResolvedValue({
      student_name: 'Ada',
      date_str: '2026-11-23',
      day_name: 'Monday',
      classes_count: 4,
      next_class_summary: 'Physics in Room 204',
      pending_fee_balance: 0,
      inspirational_quote: 'Make today count.',
      proactive_recommendation: 'Stay focused in class.',
    });
    (assistantApi.sendMessage as any).mockResolvedValue({
      conversation_id: 'conv-rel4',
      message_id: 'msg-rel4',
      content: 'Morning Briefing Content',
      tools_used: ['get_morning_briefing'],
      action_links: [],
      created_at: new Date().toISOString(),
    });

    renderWithProviders(<StudentAssistantPage />);

    expect(screen.getByText('☀️ Morning Briefing')).toBeInTheDocument();
    expect(screen.getByText('🔥 Daily Challenge')).toBeInTheDocument();
    expect(screen.getByText('🧭 Career Discovery')).toBeInTheDocument();

    // Click Morning Briefing chip
    fireEvent.click(screen.getByText('☀️ Morning Briefing'));

    await waitFor(() => {
      expect(assistantApi.sendMessage).toHaveBeenCalledWith(
        'What is my morning briefing today?',
        null
      );
    });
  });
});
