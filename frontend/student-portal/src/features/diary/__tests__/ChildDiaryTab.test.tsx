import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChildDiaryTab } from '@/features/parents/components/ChildDiaryTab';
import { studentDiaryApi } from '@/features/diary/api';

vi.mock('@/features/diary/api', () => ({
  studentDiaryApi: {
    getParentEntries: vi.fn(),
    acknowledgeEntry: vi.fn(),
    getOrCreateConversation: vi.fn(),
    getConversationDetails: vi.fn(),
    postConversationMessage: vi.fn(),
  },
}));

describe('ChildDiaryTab', () => {
  const mockEntries = [
    {
      id: 'entry-1',
      teacher_id: 't-1',
      teacher_name: 'Anita Sharma',
      title: 'Maths Quadratic Formula Worksheet',
      description: 'Solve questions 1 through 10 from chapter 4.',
      entry_type: 'HOMEWORK',
      entry_date: '2026-11-24',
      due_date: '2026-11-26',
      visibility: 'STUDENT_AND_PARENT',
      requires_acknowledgement: true,
      is_conversation_allowed: true,
      status: 'PUBLISHED',
      subject_name: 'Mathematics',
      attachments: [],
      created_at: '2026-11-24T10:00:00Z',
      updated_at: '2026-11-24T10:00:00Z',
      is_acknowledged: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders diary entries and displays signature button when acknowledgement is required', async () => {
    (studentDiaryApi.getParentEntries as any).mockResolvedValue({
      entries: mockEntries,
      total: 1,
    });

    render(<ChildDiaryTab childId="student-123" />);

    await waitFor(() => {
      expect(screen.getByText('Maths Quadratic Formula Worksheet')).toBeInTheDocument();
    });

    expect(screen.getByText('Solve questions 1 through 10 from chapter 4.')).toBeInTheDocument();
    expect(screen.getByText(/Anita Sharma/)).toBeInTheDocument();
    expect(screen.getByText('Signature Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acknowledge/i })).toBeInTheDocument();
  });

  it('opens acknowledgement dialog and submits digital signature', async () => {
    (studentDiaryApi.getParentEntries as any).mockResolvedValue({
      entries: mockEntries,
      total: 1,
    });
    (studentDiaryApi.acknowledgeEntry as any).mockResolvedValue({
      id: 'ack-1',
      parent_name: 'Vikram Patel',
      acknowledged_at: '2026-11-24T10:30:00Z',
    });

    render(<ChildDiaryTab childId="student-123" />);

    await waitFor(() => {
      expect(screen.getByText('Maths Quadratic Formula Worksheet')).toBeInTheDocument();
    });

    const ackBtn = screen.getByRole('button', { name: /Acknowledge/i });
    fireEvent.click(ackBtn);

    expect(screen.getByText(/Confirming your digital signature/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Signature/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(studentDiaryApi.acknowledgeEntry).toHaveBeenCalledWith(
        'entry-1',
        'student-123',
        undefined
      );
    });
  });

  it('renders empty state when no entries exist', async () => {
    (studentDiaryApi.getParentEntries as any).mockResolvedValue({
      entries: [],
      total: 0,
    });

    render(<ChildDiaryTab childId="student-123" />);

    await waitFor(() => {
      expect(screen.getByText('No Diary Entries Yet')).toBeInTheDocument();
    });
  });
});
