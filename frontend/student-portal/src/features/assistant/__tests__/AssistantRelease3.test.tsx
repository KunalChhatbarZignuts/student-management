import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ChatGrammarCard } from '../components/ChatGrammarCard';
import { ChatDebateCard } from '../components/ChatDebateCard';
import { ChatConceptMapCard } from '../components/ChatConceptMapCard';
import ChatInputBar from '../components/ChatInputBar';
import ChatMessageFeed from '../components/ChatMessageFeed';
import StudentAssistantPage from '../../../app/assistant/page';
import { assistantApi } from '../api';
import {
  GrammarEvaluationResponse,
  DebateRoundResponse,
  ConceptMapResponse,
  ChatMessage,
} from '../types';

vi.mock('../api', () => ({
  assistantApi: {
    getConversations: vi.fn(),
    getConversation: vi.fn(),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    renameConversation: vi.fn(),
    getSuggestions: vi.fn(),
    evaluateGrammar: vi.fn(),
    submitDebateRound: vi.fn(),
    getConceptMap: vi.fn(),
    getClassNotes: vi.fn(),
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
    dailyChallenge: (subject?: string) => ['student-assistant', 'daily-challenge', subject],
    careerDiscovery: (interests?: string) => ['student-assistant', 'career-discovery', interests],
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

describe('Release 3: Interactive AI Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-FE-R3-01: renders ChatGrammarCard with sentence comparisons, rules, and CEFR rating', () => {
    const mockGrammar: GrammarEvaluationResponse = {
      original_text: 'he go to school and they goes',
      corrected_text: 'He goes to school and they go.',
      overall_score: 85,
      cefr_level: 'B2',
      corrections: [
        {
          error_phrase: 'he go',
          corrected_phrase: 'he goes',
          rule_explanation: 'Subject-verb agreement: Third-person singular requires -s.',
        },
      ],
      vocabulary_enhancements: [
        { simple: 'good', advanced: 'proficient', context: 'skills' },
      ],
      encouragement: 'Great effort on grammar precision!',
    };

    renderWithProviders(<ChatGrammarCard data={mockGrammar} />);

    expect(screen.getByText(/English Grammar & Expression Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/CEFR: B2/i)).toBeInTheDocument();
    expect(screen.getByText(/Score: 85\/100/i)).toBeInTheDocument();
    expect(screen.getByText(/"he go to school and they goes"/i)).toBeInTheDocument();
    expect(screen.getByText(/"He goes to school and they go."/i)).toBeInTheDocument();
    expect(screen.getByText(/Third-person singular requires -s/i)).toBeInTheDocument();
    expect(screen.getByText(/proficient/i)).toBeInTheDocument();
    expect(screen.getByText(/Great effort on grammar precision!/i)).toBeInTheDocument();
  });

  it('TC-FE-R3-02: renders ChatDebateCard in active round with counter-argument and rebuttal prompt chips', () => {
    const handleRebuttalClick = vi.fn();
    const mockDebate: DebateRoundResponse = {
      topic: 'Should homework be replaced by AI?',
      stance: 'affirmative',
      current_round: 1,
      max_rounds: 3,
      ai_counter_argument: 'From the negative side, excessive reliance on AI weakens independent critical thinking.',
      student_argument_critique: 'Clear foundational premise established.',
      suggested_rebuttal_points: ['Provide real-world evidence of AI tutoring efficiency.'],
      is_concluded: false,
      rubric_scorecard: null,
    };

    renderWithProviders(
      <ChatDebateCard data={mockDebate} onSelectRebuttalPrompt={handleRebuttalClick} />
    );

    expect(screen.getByText(/AI Debate Partner/i)).toBeInTheDocument();
    expect(screen.getByText(/Stance: AFFIRMATIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Round 1 of 3: Opening Arguments/i)).toBeInTheDocument();
    expect(screen.getByText(/excessive reliance on AI weakens independent critical thinking/i)).toBeInTheDocument();

    const hintChip = screen.getByText(/Provide real-world evidence of AI tutoring efficiency/i);
    expect(hintChip).toBeInTheDocument();
    fireEvent.click(hintChip);
    expect(handleRebuttalClick).toHaveBeenCalledWith('Provide real-world evidence of AI tutoring efficiency.');
  });

  it('TC-FE-R3-03: renders ChatDebateCard concluded state with full rubric scorecard', () => {
    const mockConcludedDebate: DebateRoundResponse = {
      topic: 'Space Exploration Funding',
      stance: 'affirmative',
      current_round: 3,
      max_rounds: 3,
      ai_counter_argument: 'Both sides have presented rigorous arguments.',
      student_argument_critique: 'Outstanding synthesis of closing remarks.',
      suggested_rebuttal_points: [],
      is_concluded: true,
      rubric_scorecard: {
        logic_score: 9,
        evidence_score: 8,
        clarity_score: 9,
        total_score: 26,
        strengths: ['Clear argumentative structure', 'Persuasive rebuttals'],
        areas_for_growth: ['Cite more quantitative data'],
        verdict_summary: 'Outstanding critical debate performance!',
      },
    };

    renderWithProviders(<ChatDebateCard data={mockConcludedDebate} />);

    expect(screen.getByText(/Debate Concluded/i)).toBeInTheDocument();
    expect(screen.getByText(/Final Debate Rubric Scorecard/i)).toBeInTheDocument();
    expect(screen.getByText(/26\/30 Points/i)).toBeInTheDocument();
    expect(screen.getAllByText(/9\/10/i).length).toBe(2);
    expect(screen.getByText(/Clear argumentative structure/i)).toBeInTheDocument();
  });

  it('TC-FE-R3-04: renders ChatConceptMapCard with SVG nodes and definition inspection', () => {
    const mockConceptMap: ConceptMapResponse = {
      root_topic: 'Photosynthesis',
      subject: 'Biology',
      grade_level: 'Grade 10',
      nodes: [
        {
          id: 'root',
          label: 'Photosynthesis',
          definition: 'Process of turning solar light into chemical energy.',
          category: 'root',
          x: 300,
          y: 50,
        },
        {
          id: 'n1',
          label: 'Light Reactions',
          definition: 'Thylakoid reactions that generate ATP.',
          category: 'primary',
          x: 120,
          y: 160,
        },
      ],
      edges: [
        { source: 'root', target: 'n1', relationship: 'divided into' },
      ],
      key_takeaway: 'Converts photons into chemical glucose.',
    };

    renderWithProviders(<ChatConceptMapCard data={mockConceptMap} />);

    expect(screen.getByText(/Concept Map: Photosynthesis/i)).toBeInTheDocument();
    expect(screen.getByText(/Converts photons into chemical glucose/i)).toBeInTheDocument();
    expect(screen.getByTestId('node-n1')).toBeInTheDocument();
    expect(screen.getByText(/divided into/i)).toBeInTheDocument();

    // Click node to inspect definition
    fireEvent.click(screen.getByTestId('node-n1'));
    expect(screen.getByText(/Thylakoid reactions that generate ATP/i)).toBeInTheDocument();
  });

  it('TC-FE-R3-05: verifies Voice Tutor speech synthesis readout and input controls', () => {
    // Mock SpeechSynthesis
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    (window as any).SpeechSynthesisUtterance = class {
      text: string;
      rate: number = 1.0;
      onend: any;
      onerror: any;
      constructor(t: string) {
        this.text = t;
      }
    };
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
      },
      writable: true,
      configurable: true,
    });

    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        sender: 'ASSISTANT',
        content: 'Hello Ada! Let us learn about Newton third law of motion.',
        tools_used: [],
        action_links: [],
        created_at: new Date().toISOString(),
      },
    ];

    renderWithProviders(<ChatMessageFeed messages={messages} />);

    const speakBtn = screen.getByRole('button', { name: /Read message aloud/i });
    expect(speakBtn).toBeInTheDocument();

    fireEvent.click(speakBtn);
    expect(mockSpeak).toHaveBeenCalled();

    // Test Voice Dictation button in ChatInputBar
    renderWithProviders(<ChatInputBar onSendMessage={vi.fn()} />);
    const micBtn = screen.getByRole('button', { name: /Voice input/i });
    expect(micBtn).toBeInTheDocument();
  });

  it('TC-FE-R3-06: clicks Release 3 interactive shortcuts on StudentAssistantPage', async () => {
    (assistantApi.getConversations as any).mockResolvedValue([]);
    (assistantApi.getSuggestions as any).mockResolvedValue([]);
    (assistantApi.sendMessage as any).mockResolvedValue({
      conversation_id: 'conv-rel3',
      message_id: 'msg-rel3',
      content: 'English Grammar Feedback',
      tools_used: ['evaluate_grammar'],
      action_links: [],
      created_at: new Date().toISOString(),
    });

    renderWithProviders(<StudentAssistantPage />);

    expect(screen.getByText('💬 English Practice')).toBeInTheDocument();
    expect(screen.getByText('⚖️ AI Debate')).toBeInTheDocument();
    expect(screen.getByText('🗺️ Concept Map')).toBeInTheDocument();
    expect(screen.getByText('📝 Class Notes')).toBeInTheDocument();

    // Click English Practice chip
    fireEvent.click(screen.getByText('💬 English Practice'));

    await waitFor(() => {
      expect(assistantApi.sendMessage).toHaveBeenCalledWith(
        'Check my English grammar and sentence: He go to school everyday.',
        null
      );
    });
  });
});
