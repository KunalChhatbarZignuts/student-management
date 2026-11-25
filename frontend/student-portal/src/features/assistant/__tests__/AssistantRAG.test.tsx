import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import StudentAssistantPage from '@/app/assistant/page';
import ChatMessageFeed from '../components/ChatMessageFeed';
import { renderWithProviders } from '@/tests/test-utils';
import { assistantApi } from '../api';
import { ChatMessage, ConversationDetail, ConversationSummary, SuggestionCard } from '../types';

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
      id: 'stu-rag-user',
      email: 'student_rag@example.com',
      full_name: 'Grace Hopper',
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
    dailyChallenge: () => ['student-assistant', 'daily-challenge'],
    careerDiscovery: () => ['student-assistant', 'career-discovery'],
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
    id: 'sug-rag-1',
    label: 'What is the minimum passing grade?',
    prompt: 'What is the passing mark for examinations?',
    category: 'school_rules',
  },
];

const mockConversations: ConversationSummary[] = [
  {
    id: 'conv-rag-1',
    title: 'School Policy Query',
    last_message_preview: 'The minimum passing mark is 50%.',
    message_count: 2,
    created_at: '2026-11-24T10:00:00Z',
    updated_at: '2026-11-24T10:05:00Z',
  },
];

const mockConversationDetail: ConversationDetail = {
  id: 'conv-rag-1',
  title: 'School Policy Query',
  created_at: '2026-11-24T10:00:00Z',
  messages: [
    {
      id: 'msg-u1',
      sender: 'STUDENT',
      content: 'What is the passing mark for examinations?',
      created_at: '2026-11-24T10:00:00Z',
    },
    {
      id: 'msg-a1',
      sender: 'ASSISTANT',
      content:
        '### Official School Information & Guidelines\n\n' +
        '- **Minimum Passing Grade**: All subjects require at least 50% to pass.\n' +
        '- **Remediation**: Students scoring below 50% must attend revision sessions.\n\n' +
        'Source: *Academic Handbook & Evaluation Rules (Section 4.2)*',
      tools_used: ['search_school_knowledge'],
      action_links: [
        { label: 'View Academic Handbook', url: '/handbook' },
        { label: 'View Fee Schedule', url: '/fees' },
      ],
      created_at: '2026-11-24T10:00:02Z',
    },
  ],
};

describe('AI RAG Knowledge Base Frontend Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assistantApi.getConversations as any).mockResolvedValue(mockConversations);
    (assistantApi.getConversationDetail as any).mockResolvedValue(mockConversationDetail);
    (assistantApi.getSuggestions as any).mockResolvedValue(mockSuggestions);
    (assistantApi.getMorningBriefing as any).mockResolvedValue(null);
    (assistantApi.getDailyChallenge as any).mockResolvedValue(null);
    (assistantApi.getCareerDiscovery as any).mockResolvedValue(null);
  });

  it('TC-RAG-FE-01: renders verified school knowledge badge when tools_used includes search_school_knowledge', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        sender: 'ASSISTANT',
        content: 'Campus dress code requires formal blazers on Mondays.',
        tools_used: ['search_school_knowledge'],
        created_at: '2026-11-24T10:00:00Z',
      },
    ];

    renderWithProviders(<ChatMessageFeed messages={messages} />);

    // Verification badge
    expect(screen.getByText(/Verified via search_school_knowledge/i)).toBeDefined();
    expect(screen.getByText(/Campus dress code requires formal blazers on Mondays./i)).toBeDefined();
  });

  it('TC-RAG-FE-02: formats grounded school policy markdown citations and bulleted guidelines', () => {
    renderWithProviders(<ChatMessageFeed messages={mockConversationDetail.messages} />);

    // Check headings and text content
    expect(screen.getByText(/Official School Information & Guidelines/i)).toBeDefined();
    expect(screen.getByText(/All subjects require at least 50% to pass./i)).toBeDefined();
    expect(screen.getByText(/Academic Handbook & Evaluation Rules/i)).toBeDefined();
  });

  it('TC-RAG-FE-03: renders deep-action navigation links to school handbook and fees', () => {
    renderWithProviders(<ChatMessageFeed messages={mockConversationDetail.messages} />);

    const handbookBtn = screen.getByRole('button', { name: /View Academic Handbook/i });
    expect(handbookBtn).toBeDefined();

    fireEvent.click(handbookBtn);
    expect(mockPush).toHaveBeenCalledWith('/handbook');

    const feeBtn = screen.getByRole('button', { name: /View Fee Schedule/i });
    fireEvent.click(feeBtn);
    expect(mockPush).toHaveBeenCalledWith('/fees');
  });

  it('TC-RAG-FE-04: end-to-end question answering flow for school policy inquiry', async () => {
    (assistantApi.sendMessage as any).mockResolvedValue({
      conversation_id: 'conv-rag-1',
      message_id: 'msg-rag-resp',
      content: 'Late fee penalties of $20 apply after the 15th.',
      tools_used: ['search_school_knowledge'],
      action_links: [{ label: 'Pay Fees', url: '/fees' }],
      created_at: new Date().toISOString(),
    });

    renderWithProviders(<StudentAssistantPage />);

    // Wait for existing conversations to load
    await waitFor(() => {
      expect(screen.getByText('School Policy Query')).toBeDefined();
    });

    // Select the conversation
    fireEvent.click(screen.getByText('School Policy Query'));

    await waitFor(() => {
      expect(screen.getByText(/Official School Information & Guidelines/i)).toBeDefined();
    });

    // Type a new query about fees
    const input = screen.getByPlaceholderText(/Ask a question about your timetable/i);
    fireEvent.change(input, { target: { value: 'What is the late fee policy?' } });

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(assistantApi.sendMessage).toHaveBeenCalledWith('What is the late fee policy?', 'conv-rag-1');
    });
  });

  it('TC-RAG-FE-05: SpeechSynthesis voice readout button triggers speech synthesis for RAG policy content', () => {
    const speakMock = vi.fn();
    const cancelMock = vi.fn();

    class MockSpeechSynthesisUtterance {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

    window.speechSynthesis = {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: vi.fn().mockReturnValue([]),
      pause: vi.fn(),
      resume: vi.fn(),
      pending: false,
      speaking: false,
      paused: false,
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any;

    renderWithProviders(<ChatMessageFeed messages={mockConversationDetail.messages} />);

    const speakBtn = screen.getByRole('button', { name: /Read message aloud/i });
    expect(speakBtn).toBeDefined();

    fireEvent.click(speakBtn);
    expect(speakMock).toHaveBeenCalled();
  });
});
