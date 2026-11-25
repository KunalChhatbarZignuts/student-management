import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DigitalDiaryPage from '@/app/diary/page';
import { studentDiaryApi } from '@/features/diary/api';

vi.mock('@/features/auth/hooks', () => ({
  useAuth: () => ({
    user: { id: 'stu-user-1', email: 'student@school.local' },
    role: 'student',
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/parents/hooks', () => ({
  useMyChildren: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/components/guards/RequireRole', () => ({
  default: ({ children }: any) => <div data-testid="require-role">{children}</div>,
}));

vi.mock('@/components/layout/AppShell', () => ({
  default: ({ children }: any) => <div data-testid="app-shell">{children}</div>,
}));

vi.mock('@/features/diary/api', () => ({
  studentDiaryApi: {
    getStudentEntries: vi.fn(),
    markAsRead: vi.fn(),
    getParentEntries: vi.fn(),
    acknowledgeEntry: vi.fn(),
    getOrCreateConversation: vi.fn(),
    getConversationDetails: vi.fn(),
    postConversationMessage: vi.fn(),
  },
}));

describe('DigitalDiaryPage for Students', () => {
  const mockEntries = [
    {
      id: 'entry-101',
      teacher_id: 't-1',
      teacher_name: 'Anita Sharma',
      title: 'Chemistry Lab Safety Instructions',
      description: 'Wear protective goggles and closed-toe shoes tomorrow.',
      entry_type: 'NOTICE',
      entry_date: '2026-11-24',
      visibility: 'STUDENT_AND_PARENT',
      requires_acknowledgement: false,
      is_conversation_allowed: false,
      status: 'PUBLISHED',
      subject_name: 'Chemistry',
      attachments: [],
      created_at: '2026-11-24T09:00:00Z',
      updated_at: '2026-11-24T09:00:00Z',
      is_read_by_student: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student diary entries with Mark Read button', async () => {
    (studentDiaryApi.getStudentEntries as any).mockResolvedValue({
      entries: mockEntries,
      total: 1,
    });
    (studentDiaryApi.markAsRead as any).mockResolvedValue({ is_read: true });

    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Chemistry Lab Safety Instructions')).toBeInTheDocument();
    });

    expect(screen.getByText('Wear protective goggles and closed-toe shoes tomorrow.')).toBeInTheDocument();
    expect(screen.getByText(/Anita Sharma/)).toBeInTheDocument();

    const markReadBtn = screen.getByRole('button', { name: /Mark Read/i });
    expect(markReadBtn).toBeInTheDocument();
    fireEvent.click(markReadBtn);

    await waitFor(() => {
      expect(studentDiaryApi.markAsRead).toHaveBeenCalledWith('entry-101');
    });
  });
});
