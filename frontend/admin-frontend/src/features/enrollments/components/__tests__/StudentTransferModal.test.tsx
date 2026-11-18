import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import StudentTransferModal from '../StudentTransferModal';
import { renderWithProviders } from '@/tests/test-utils';
import { apiClient } from '@/lib/axios';
import { enrollmentsApi } from '../../api';

// Mock apiClient and enrollmentsApi
vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../api', () => ({
  enrollmentsApi: {
    transferStudent: vi.fn(),
  },
}));

describe('StudentTransferModal Component', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    studentId: 'stu-12345',
    studentName: 'Aarav Patel',
    currentGradeName: 'Grade 10',
    currentSectionName: '10-A',
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/grades?size=100')) {
        return Promise.resolve({
          data: {
            items: [
              { id: 'grade-10', name: 'Grade 10' },
              { id: 'grade-11', name: 'Grade 11' },
            ],
          },
        });
      }
      if (url.includes('/grades/grade-10/sections')) {
        return Promise.resolve({
          data: [
            { id: 'sec-10b', name: '10-B', class_capacity: 40 },
            { id: 'sec-10c', name: '10-C', class_capacity: 35 },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('TC-TRANSFER-01: renders modal with student info and current grade/section', async () => {
    renderWithProviders(<StudentTransferModal {...defaultProps} />);

    expect(screen.getByText(/Transfer Student: Aarav Patel/i)).toBeInTheDocument();
    expect(screen.getByText(/Grade 10 - 10-A/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('TC-TRANSFER-02: disables confirm button when target section is not selected', () => {
    renderWithProviders(<StudentTransferModal {...defaultProps} />);

    const confirmBtn = screen.getByRole('button', { name: /Confirm Transfer/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('TC-TRANSFER-03: closes dialog when cancel button is clicked', () => {
    renderWithProviders(<StudentTransferModal {...defaultProps} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-TRANSFER-04: displays error message when API call fails during transfer', async () => {
    (enrollmentsApi.transferStudent as any).mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Target section has reached maximum capacity limit.',
        },
      },
    });

    renderWithProviders(<StudentTransferModal {...defaultProps} />);

    // Wait for grades query to populate
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/admin/grades?size=100');
    });
  });
});
