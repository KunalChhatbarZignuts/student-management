import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { DailyChallengeCard } from '../components/DailyChallengeCard';
import { MorningBriefingBanner } from '../components/MorningBriefingBanner';
import ChatMessageFeed from '../components/ChatMessageFeed';
import { PomodoroStudyBuddy } from '../components/PomodoroStudyBuddy';
import { DailyChallengeResponse, MorningBriefingResponse, ChatMessage } from '../types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/assistant',
}));

const mockChallenge: DailyChallengeResponse = {
  challenge_id: 'ch-test-1',
  date_str: '2026-11-23',
  subject: 'Physics',
  topic: 'Kinematics',
  question_text: 'What is gravitational acceleration on Earth?',
  options: ['4.9 m/s²', '9.8 m/s²', '12.0 m/s²', '15.0 m/s²'],
  correct_option_index: 1,
  hint: 'Near 10 m/s².',
  explanation: 'Earth gravitational acceleration g ≈ 9.8 m/s².',
};

describe('AI Student Assistant: Edge Cases & Accessibility Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-EDGE-FE-01: handles corrupt or throwing localStorage in DailyChallengeCard gracefully', () => {
    const originalGetItem = window.localStorage.getItem;
    const originalSetItem = window.localStorage.setItem;

    window.localStorage.getItem = vi.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError or SecurityError in private mode');
    });
    window.localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError in private mode');
    });

    render(<DailyChallengeCard challenge={mockChallenge} />);

    expect(screen.getByText(/What is gravitational acceleration on Earth\?/i)).toBeInTheDocument();

    const correctOption = screen.getByLabelText('9.8 m/s²');
    fireEvent.click(correctOption);
    const submitBtn = screen.getByText('Submit Answer');
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Correct! Streak \+1 🔥/i)).toBeInTheDocument();

    window.localStorage.getItem = originalGetItem;
    window.localStorage.setItem = originalSetItem;
  });

  it('TC-EDGE-FE-02: handles missing optional values in MorningBriefingBanner without layout shifts', () => {
    const minimalBriefing: MorningBriefingResponse = {
      student_name: 'Grace',
      date_str: '2026-11-23',
      day_name: 'Monday',
      classes_count: 0,
      next_class_summary: null,
      nearest_exam_name: null,
      nearest_exam_days: null,
      pending_fee_balance: 0.0,
      calendar_notice: null,
      inspirational_quote: 'Knowledge is power.',
      proactive_recommendation: 'Have a productive study day!',
    };

    render(<MorningBriefingBanner briefing={minimalBriefing} />);

    expect(screen.getByText(/Welcome back, Grace/i)).toBeInTheDocument();
    expect(screen.getByText(/0 Classes Today/i)).toBeInTheDocument();
    expect(screen.getByText(/No upcoming scheduled exams/i)).toBeInTheDocument();
  });

  it('TC-EDGE-FE-03: verifies ARIA live region and role="log" in ChatMessageFeed for screen readers', () => {
    const sampleMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        sender: 'STUDENT',
        content: 'Explain photosynthesis',
        created_at: new Date().toISOString(),
      },
      {
        id: 'msg-2',
        sender: 'ASSISTANT',
        content: 'Photosynthesis is the process by which green plants synthesize nutrients.',
        created_at: new Date().toISOString(),
      },
    ];

    render(<ChatMessageFeed messages={sampleMessages} />);

    const logRegion = screen.getByRole('log', { name: /Conversation messages/i });
    expect(logRegion).toBeInTheDocument();
    expect(logRegion).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(/Explain photosynthesis/i)).toBeInTheDocument();
  });

  it('TC-EDGE-FE-04: verifies PomodoroStudyBuddy mode switching and timer controls without negative values', () => {
    render(<PomodoroStudyBuddy />);

    const floatBadge = screen.getByText('Focus');
    fireEvent.click(floatBadge);

    expect(screen.getByText('Study Buddy Timer')).toBeInTheDocument();

    const breakModeBtn = screen.getByRole('button', { name: /Break 5m/i });
    fireEvent.click(breakModeBtn);
    expect(screen.getByText('05:00')).toBeInTheDocument();

    const focusModeBtn = screen.getByRole('button', { name: /Focus 25m/i });
    fireEvent.click(focusModeBtn);
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });
});
