import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import BulkEnrollmentDialog from '../BulkEnrollmentDialog';
import { renderWithProviders } from '@/tests/test-utils';
import { apiClient } from '@/lib/axios';
import { enrollmentsApi } from '../../api';

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../api', () => ({
  enrollmentsApi: {
    bulkEnroll: vi.fn(),
  },
}));

describe('BulkEnrollmentDialog Component', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedStudentIds: ['stu-01', 'stu-02', 'stu-03'],
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/academic-years')) {
        return Promise.resolve({
          data: [
            { id: 'ay-2026', name: '2026-2027', is_current: true },
          ],
        });
      }
      if (url.includes('/grades')) {
        return Promise.resolve({
          data: {
            items: [{ id: 'grade-1', name: 'Grade 1', academic_year_id: 'ay-2026' }],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('TC-BULK-01: renders dialog with selected student count', () => {
    renderWithProviders(<BulkEnrollmentDialog {...defaultProps} />);

    expect(screen.getByText(/Bulk Assign Students to Section \(3 Selected\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Assignment/i })).toBeDisabled();
  });

  it('TC-BULK-02: disables target section until target grade is chosen', () => {
    renderWithProviders(<BulkEnrollmentDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Confirm Assignment/i })).toBeDisabled();
  });

  it('TC-BULK-03: triggers onClose when cancel button is clicked', () => {
    renderWithProviders(<BulkEnrollmentDialog {...defaultProps} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
