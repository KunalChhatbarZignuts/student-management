import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import StudentAssistantPage from '@/app/assistant/page';
import FloatingAssistantWidget from '@/features/assistant/components/FloatingAssistantWidget';
import WelcomeCardGrid from '@/features/assistant/components/WelcomeCardGrid';
import { renderWithProviders } from '@/tests/test-utils';
import { assistantApi } from '../api';
import { ConversationSummary, ConversationDetail, ChatQueryResponse, SuggestionCard } from '../types';

const mockPush = vi.fn();
let currentMockPath = '/assistant';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => currentMockPath,
}));

vi.mock('@/features/auth/hooks', () => ({
  useAuth: () => ({
    user: {
      id: 'stu-user-1',
      email: 'student_test@example.com',
      full_name: 'Ada Lovelace',
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
    getMorningBriefing: vi.fn(),
    getDailyChallenge: vi.fn(),
    getCareerDiscovery: vi.fn(),
  },
}));

const mockSuggestions: SuggestionCard[] = [
  {
    id: 'sug-1',
    label: "Today's Timetable",
    prompt: 'What is my timetable today and what class is next?',
    category: 'TIMETABLE',
    icon: 'Schedule',
  },
  {
    id: 'sug-2',
    label: 'Attendance Rate',
    prompt: 'What is my current attendance percentage and summary?',
    category: 'ATTENDANCE',
    icon: 'CheckCircleOutline',
  },
];

const mockConversations: ConversationSummary[] = [
  {
    id: 'conv-1',
    title: 'Timetable query for today',
    created_at: '2026-11-23T10:00:00Z',
    updated_at: '2026-11-23T10:05:00Z',
    message_count: 2,
    last_message_preview: 'Here is your schedule for today...',
  },
  {
    id: 'conv-2',
    title: 'Science lesson revision',
    created_at: '2026-11-22T09:00:00Z',
    updated_at: '2026-11-22T09:15:00Z',
    message_count: 4,
    last_message_preview: 'Newton second law states that...',
  },
];

const mockConversationDetail: ConversationDetail = {
  id: 'conv-1',
  title: 'Timetable query for today',
  created_at: '2026-11-23T10:00:00Z',
  messages: [
    {
      id: 'msg-1',
      sender: 'STUDENT',
      content: 'What is my timetable today?',
      created_at: '2026-11-23T10:00:00Z',
    },
    {
      id: 'msg-2',
      sender: 'ASSISTANT',
      content: "Here is today's scheduled timetable:\n| P1 | 09:00 - 10:00 | Mathematics |",
      tools_used: ['get_student_timetable'],
      action_links: [
        { label: 'View Full Timetable', url: '/timetable' },
      ],
      created_at: '2026-11-23T10:00:02Z',
    },
  ],
};

const mockChatResponse: ChatQueryResponse = {
  conversation_id: 'conv-3',
  message_id: 'msg-3',
  content: 'Here are your upcoming examinations for Grade 12.',
  tools_used: ['get_student_examinations'],
  action_links: [
    { label: 'Open Examinations', url: '/examinations' },
  ],
  created_at: '2026-11-23T11:00:00Z',
};

describe('AI Student Assistant Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockPath = '/assistant';
    vi.mocked(assistantApi.getConversations).mockResolvedValue(mockConversations);
    vi.mocked(assistantApi.getConversationDetail).mockResolvedValue(mockConversationDetail);
    vi.mocked(assistantApi.getSuggestions).mockResolvedValue(mockSuggestions);
    vi.mocked(assistantApi.sendMessage).mockResolvedValue(mockChatResponse);
    vi.mocked(assistantApi.renameConversation).mockResolvedValue({ status: 'success', title: 'Renamed' });
    vi.mocked(assistantApi.deleteConversation).mockResolvedValue({ status: 'success' });
  });

  it('renders WelcomeCardGrid with quick prompt questions and fires callback', () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <WelcomeCardGrid
        studentName="Ada"
        suggestions={mockSuggestions}
        onSelectPrompt={onSelect}
      />
    );

    expect(screen.getByText("Today's Timetable")).toBeInTheDocument();
    expect(screen.getByText(/What is my timetable today/i)).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/What is my timetable today/i));
    expect(onSelect).toHaveBeenCalledWith('What is my timetable today and what class is next?');
  });

  it('renders StudentAssistantPage with session history drawer and welcome grid', async () => {
    renderWithProviders(<StudentAssistantPage />);

    // Header title
    expect(screen.getAllByText('AI Student Assistant').length).toBeGreaterThanOrEqual(1);

    // Drawer conversations
    await waitFor(() => {
      expect(screen.getByText('Timetable query for today')).toBeInTheDocument();
      expect(screen.getByText('Science lesson revision')).toBeInTheDocument();
    });

    // Welcome cards shown when no conversation is active
    expect(screen.getByText(/Common Questions to Get Started/i)).toBeInTheDocument();
  });

  it('loads active conversation details and renders chat messages with action buttons', async () => {
    renderWithProviders(<StudentAssistantPage />);

    await waitFor(() => {
      expect(screen.getByText('Timetable query for today')).toBeInTheDocument();
    });

    // Click first conversation
    fireEvent.click(screen.getByText('Timetable query for today'));

    await waitFor(() => {
      expect(assistantApi.getConversationDetail).toHaveBeenCalledWith('conv-1');
      expect(screen.getByText('View Full Timetable')).toBeInTheDocument();
    });

    // Clicking action link pushes router
    fireEvent.click(screen.getByText('View Full Timetable'));
    expect(mockPush).toHaveBeenCalledWith('/timetable');
  });

  it('sends new query message and updates active conversation state', async () => {
    renderWithProviders(<StudentAssistantPage />);

    const input = screen.getByPlaceholderText(/Ask.*timetable/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'When is my next examination?' } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(assistantApi.sendMessage).toHaveBeenCalledWith('When is my next examination?', null);
    });
  });

  it('deletes conversation from session drawer after confirmation', async () => {
    renderWithProviders(<StudentAssistantPage />);

    await waitFor(() => {
      expect(screen.getByText('Timetable query for today')).toBeInTheDocument();
    });

    const optionButtons = screen.getAllByLabelText('Conversation options');
    expect(optionButtons.length).toBeGreaterThan(0);
    fireEvent.click(optionButtons[0]);

    const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i });
    fireEvent.click(deleteMenuItem);

    // Confirm dialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete Conversation?')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(assistantApi.deleteConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  it('renders FloatingAssistantWidget on other pages and opens popup on click', async () => {
    currentMockPath = '/';
    renderWithProviders(<FloatingAssistantWidget />);

    const fab = screen.getByLabelText(/Ask AI Student Assistant/i);
    expect(fab).toBeInTheDocument();

    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getAllByText('AI Student Assistant').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Ask about your timetable, attendance, marks/i)).toBeInTheDocument();
    });
  });
});
