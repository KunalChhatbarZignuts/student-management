import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MarksEntryTable } from '@/features/examinations/components/MarksEntryTable';
import { ExaminationScheduleTable } from '@/features/examinations/components/ExaminationScheduleTable';
import { ScheduleRosterResponse, ExaminationSchedule } from '@/features/examinations/types';

const mockRoster: ScheduleRosterResponse = {
  schedule_id: 'sch-1',
  exam_name: 'Mid-Term Exam 2026',
  exam_type: 'MID_TERM',
  term: 'Term 1',
  grade_name: 'Grade 5',
  section_name: '5-A',
  subject_name: 'Mathematics',
  subject_code: 'MTH-101',
  exam_date: '2026-11-20',
  start_time: '09:00:00',
  end_time: '11:00:00',
  max_marks: 100,
  pass_marks: 35,
  status: 'SCHEDULED',
  students: [
    {
      student_id: 'stu-1',
      student_name: 'Arjun Kapoor',
      enrollment_number: 'ENR-001',
      roll_no: 1,
      marks_obtained: null,
      is_absent: false,
      grade: null,
      is_passed: null,
      remarks: null,
      status: 'PENDING',
    },
    {
      student_id: 'stu-2',
      student_name: 'Ananya Roy',
      enrollment_number: 'ENR-002',
      roll_no: 2,
      marks_obtained: 88,
      is_absent: false,
      grade: 'A',
      is_passed: true,
      remarks: 'Great effort',
      status: 'DRAFT',
    },
  ],
};

const mockSchedules: ExaminationSchedule[] = [
  {
    id: 'sch-1',
    examination_id: 'exam-1',
    exam_name: 'Mid-Term Exam 2026',
    grade_id: 'g-1',
    grade_name: 'Grade 5',
    section_id: 'sec-1',
    section_name: '5-A',
    subject_id: 'sub-1',
    subject_name: 'Mathematics',
    subject_code: 'MTH-101',
    exam_date: '2026-11-20',
    start_time: '09:00:00',
    end_time: '11:00:00',
    max_marks: 100,
    pass_marks: 35,
    room_number: 'Room 101',
    instructions: 'Bring scientific calculator',
    status: 'SCHEDULED',
    marks_entry_status: 'DRAFT',
    created_at: '2026-11-01T00:00:00Z',
  },
];

describe('Admin Frontend Examination Components', () => {
  it('renders MarksEntryTable with student roster correctly', () => {
    render(
      <MarksEntryTable
        roster={mockRoster}
        onSaveDraft={vi.fn()}
        onSubmitMarks={vi.fn()}
        isSaving={false}
        isSubmitting={false}
      />
    );

    expect(screen.getByText('Arjun Kapoor')).toBeInTheDocument();
    expect(screen.getByText('Ananya Roy')).toBeInTheDocument();
    expect(screen.getByText('ENR-001')).toBeInTheDocument();
    expect(screen.getByText('ENR-002')).toBeInTheDocument();
  });

  it('updates live grade calculation when entering valid marks', () => {
    render(
      <MarksEntryTable
        roster={mockRoster}
        onSaveDraft={vi.fn()}
        onSubmitMarks={vi.fn()}
        isSaving={false}
        isSubmitting={false}
      />
    );

    const inputs = screen.getAllByPlaceholderText('0.0');
    fireEvent.change(inputs[0], { target: { value: '95' } });

    expect(screen.getByText('A+')).toBeInTheDocument();
  });

  it('displays validation error alert when entering score exceeding max marks', () => {
    render(
      <MarksEntryTable
        roster={mockRoster}
        onSaveDraft={vi.fn()}
        onSubmitMarks={vi.fn()}
        isSaving={false}
        isSubmitting={false}
      />
    );

    const inputs = screen.getAllByPlaceholderText('0.0');
    fireEvent.change(inputs[0], { target: { value: '110' } });

    expect(screen.getByText(/Score must be between 0 and maximum marks/i)).toBeInTheDocument();
  });

  it('toggles student absence and calculates AB grade', () => {
    render(
      <MarksEntryTable
        roster={mockRoster}
        onSaveDraft={vi.fn()}
        onSubmitMarks={vi.fn()}
        isSaving={false}
        isSubmitting={false}
      />
    );

    const switches = screen.getAllByRole('checkbox');
    fireEvent.click(switches[0]);

    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders ExaminationScheduleTable with schedules and status chips', () => {
    render(
      <ExaminationScheduleTable
        schedules={mockSchedules}
        onDeleteSchedule={vi.fn()}
      />
    );

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText(/Code: MTH-101/i)).toBeInTheDocument();
    expect(screen.getByText('Room 101')).toBeInTheDocument();
    expect(screen.getByText('Draft Marks')).toBeInTheDocument();
  });
});
