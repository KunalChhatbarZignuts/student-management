import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DigitalDiaryPage from '@/app/diary/page';
import { diaryApi } from '@/features/diary/api';

vi.mock('@/components/guards/RequireRole', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/diary/api', () => ({
  diaryApi: {
    getTeacherContext: vi.fn(),
    listTeacherEntries: vi.fn(),
    createDiaryEntry: vi.fn(),
    updateDiaryEntry: vi.fn(),
    publishDiaryEntry: vi.fn(),
    retractDiaryEntry: vi.fn(),
    getEntryRecipients: vi.fn(),
    getConversationDetails: vi.fn(),
    postConversationMessage: vi.fn(),
    resolveConversation: vi.fn(),
  },
}));

describe('DigitalDiaryPage Component in Admin Frontend', () => {
  const mockContext = {
    is_admin: false,
    sections: [{ id: 'sec-1', name: '10-A', grade_name: 'Grade 10' }],
    subjects: [{ id: 'sub-1', name: 'Mathematics', code: 'MATH10' }],
    students: [{ id: 'stu-1', name: 'Aarav Patel', student_code: 'STU-01' }],
  };

  const mockEntries = [
    {
      id: 'entry-1',
      teacher_id: 't-1',
      teacher_name: 'Anita Sharma',
      title: 'Algebra Polynomial Exercise',
      description: 'Complete problems 1 to 10 on page 50.',
      entry_type: 'HOMEWORK',
      entry_date: '2026-11-24',
      due_date: '2026-11-26',
      visibility: 'STUDENT_AND_PARENT',
      requires_acknowledgement: true,
      is_conversation_allowed: true,
      status: 'PUBLISHED' as const,
      section_name: '10-A',
      subject_name: 'Mathematics',
      attachments: [],
      created_at: '2026-11-24T08:00:00Z',
      updated_at: '2026-11-24T08:00:00Z',
      total_recipients: 25,
      read_count: 18,
      acknowledged_count: 12,
    },
    {
      id: 'entry-2',
      teacher_id: 't-1',
      teacher_name: 'Anita Sharma',
      title: 'Draft Science Fair Note',
      description: 'Science fair submission details.',
      entry_type: 'NOTICE',
      entry_date: '2026-11-24',
      visibility: 'STUDENT_AND_PARENT',
      requires_acknowledgement: false,
      is_conversation_allowed: true,
      status: 'DRAFT' as const,
      section_name: '10-A',
      attachments: [],
      created_at: '2026-11-24T09:00:00Z',
      updated_at: '2026-11-24T09:00:00Z',
      total_recipients: 25,
      read_count: 0,
      acknowledged_count: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (diaryApi.getTeacherContext as any).mockResolvedValue(mockContext);
    (diaryApi.listTeacherEntries as any).mockResolvedValue({
      entries: mockEntries,
      total: 2,
    });
  });

  it('TC-DIARY-01: renders page title, metric cards, and entries table', async () => {
    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Digital School Diary')).toBeInTheDocument();
    });

    expect(screen.getByText('TOTAL ENTRIES')).toBeInTheDocument();
    expect(screen.getAllByText('PUBLISHED').length).toBeGreaterThan(0);
    expect(screen.getByText('DRAFTS')).toBeInTheDocument();
    expect(screen.getByText('ACK REQUIRED')).toBeInTheDocument();

    // Table rows
    expect(screen.getByText('Algebra Polynomial Exercise')).toBeInTheDocument();
    expect(screen.getByText('Draft Science Fair Note')).toBeInTheDocument();
    expect(screen.getByText('18 / 25 Read')).toBeInTheDocument();
    expect(screen.getByText(/12 \/ 25 Acknowledged/)).toBeInTheDocument();
  });

  it('TC-DIARY-02: opens compose modal on clicking Compose Entry', async () => {
    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Digital School Diary')).toBeInTheDocument();
    });

    const composeBtn = screen.getByRole('button', { name: /Compose Entry/i });
    fireEvent.click(composeBtn);

    expect(screen.getByText('Compose Digital Diary Entry')).toBeInTheDocument();
    expect(screen.getByLabelText(/Entry Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Detailed Description/i)).toBeInTheDocument();
  });

  it('TC-DIARY-03: publishes draft entry when clicking send icon', async () => {
    (diaryApi.publishDiaryEntry as any).mockResolvedValue({ id: 'entry-2', status: 'PUBLISHED' });

    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Draft Science Fair Note')).toBeInTheDocument();
    });

    const publishButtons = screen.getAllByRole('button', { name: /Publish Now/i });
    expect(publishButtons.length).toBeGreaterThan(0);
    fireEvent.click(publishButtons[0]);

    await waitFor(() => {
      expect(diaryApi.publishDiaryEntry).toHaveBeenCalledWith('entry-2');
    });
  });

  it('TC-DIARY-04: validates required fields and blocks empty title/description', async () => {
    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Digital School Diary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Compose Entry/i }));
    expect(screen.getByText('Compose Digital Diary Entry')).toBeInTheDocument();

    // Click Publish without title
    fireEvent.click(screen.getByRole('button', { name: /Publish Entry/i }));

    await waitFor(() => {
      expect(screen.getByText('Entry title is required.')).toBeInTheDocument();
    });
    expect(diaryApi.createDiaryEntry).not.toHaveBeenCalled();
  });

  it('TC-DIARY-05: validates that specific student recipients cannot be empty', async () => {
    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Digital School Diary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Compose Entry/i }));

    // Fill title and description
    fireEvent.change(screen.getByLabelText(/Entry Title/i), { target: { value: 'Discipline Observation' } });
    fireEvent.change(screen.getByLabelText(/Detailed Description/i), { target: { value: 'Observed hallway disruption.' } });

    // Switch audience scope to Specific Selected Students
    const audienceSelect = screen.getByLabelText(/Audience Scope/i);
    fireEvent.mouseDown(audienceSelect);
    const specificOption = await screen.findByRole('option', { name: /Specific Selected Students/i });
    fireEvent.click(specificOption);

    // Attempt to publish without selecting students
    fireEvent.click(screen.getByRole('button', { name: /Publish Entry/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Please select at least one student recipient when choosing Specific Selected Students.')
      ).toBeInTheDocument();
    });
    expect(diaryApi.createDiaryEntry).not.toHaveBeenCalled();
  });

  it('TC-DIARY-06: adds and removes attachments in compose modal', async () => {
    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Digital School Diary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Compose Entry/i }));

    // Add an attachment
    const nameInput = screen.getByLabelText(/Document \/ Resource Name/i);
    const urlInput = screen.getByLabelText(/Resource Link \/ URL/i);
    const addBtn = screen.getByRole('button', { name: /^Add$/i });

    fireEvent.change(nameInput, { target: { value: 'Worksheet_Unit1.pdf' } });
    fireEvent.change(urlInput, { target: { value: 'https://school.edu/worksheets/u1.pdf' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('Worksheet_Unit1.pdf')).toBeInTheDocument();

    // Remove the attachment
    const cancelIcon = screen.getByTestId('CancelIcon');
    fireEvent.click(cancelIcon);

    expect(screen.queryByText('Worksheet_Unit1.pdf')).not.toBeInTheDocument();
  });

  it('TC-DIARY-07: successfully creates and publishes a complete diary entry with attachments', async () => {
    (diaryApi.createDiaryEntry as any).mockResolvedValue({ id: 'entry-new', status: 'PUBLISHED' });

    render(<DigitalDiaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Digital School Diary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Compose Entry/i }));

    fireEvent.change(screen.getByLabelText(/Entry Title/i), { target: { value: 'Trigonometry Homework' } });
    fireEvent.change(screen.getByLabelText(/Detailed Description/i), { target: { value: 'Complete exercises 1 to 5.' } });

    // Add attachment
    fireEvent.change(screen.getByLabelText(/Document \/ Resource Name/i), { target: { value: 'Trig_Sheet.pdf' } });
    fireEvent.change(screen.getByLabelText(/Resource Link \/ URL/i), { target: { value: '/files/trig.pdf' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    // Click Publish Entry
    fireEvent.click(screen.getByRole('button', { name: /Publish Entry/i }));

    await waitFor(() => {
      expect(diaryApi.createDiaryEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Trigonometry Homework',
          description: 'Complete exercises 1 to 5.',
          status: 'PUBLISHED',
          attachments: [
            expect.objectContaining({
              name: 'Trig_Sheet.pdf',
              url: '/files/trig.pdf',
            }),
          ],
        })
      );
    });
  });
});
