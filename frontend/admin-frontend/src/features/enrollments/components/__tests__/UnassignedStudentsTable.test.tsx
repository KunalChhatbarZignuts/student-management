import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import UnassignedStudentsTable from '../UnassignedStudentsTable';
import { renderWithProviders } from '@/tests/test-utils';

describe('UnassignedStudentsTable Component', () => {
  const mockStudents = [
    {
      student_id: 'stu-1',
      student_code: 'CODE-001',
      enrollment_number: 'ENR-001',
      first_name: 'John',
      last_name: 'Doe',
      department: 'General',
      admission_date: '2026-01-10',
    },
    {
      student_id: 'stu-2',
      student_code: 'CODE-002',
      enrollment_number: 'ENR-002',
      first_name: 'Jane',
      last_name: 'Smith',
      department: 'General',
      admission_date: '2026-01-11',
    },
  ];

  it('TC-UNASSIGNED-01: renders unassigned students with disabled bulk button when none selected', () => {
    renderWithProviders(
      <UnassignedStudentsTable
        students={mockStudents}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenBulkEnroll={vi.fn()}
      />
    );

    expect(screen.getByText(/Admitted Students Awaiting Class Assignment \(2\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bulk Assign Section \(0\)/i })).toBeDisabled();
  });

  it('TC-UNASSIGNED-02: clicking individual student checkbox triggers onSelect with student ID', () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <UnassignedStudentsTable
        students={mockStudents}
        selectedIds={[]}
        onSelect={onSelect}
        onOpenBulkEnroll={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /Select student John Doe/i });
    fireEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith(['stu-1']);
  });

  it('TC-UNASSIGNED-03: clicking bulk assign button opens modal when students are selected', () => {
    const onOpenBulkEnroll = vi.fn();
    renderWithProviders(
      <UnassignedStudentsTable
        students={mockStudents}
        selectedIds={['stu-1']}
        onSelect={vi.fn()}
        onOpenBulkEnroll={onOpenBulkEnroll}
      />
    );

    const bulkBtn = screen.getByRole('button', { name: /Bulk Assign Section \(1\)/i });
    expect(bulkBtn).not.toBeDisabled();
    fireEvent.click(bulkBtn);

    expect(onOpenBulkEnroll).toHaveBeenCalledTimes(1);
  });
});
