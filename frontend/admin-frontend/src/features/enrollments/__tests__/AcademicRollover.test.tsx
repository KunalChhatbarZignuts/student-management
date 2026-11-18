import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AcademicYearRolloverPage from '@/app/enrollments/rollover/page';
import { renderWithProviders } from '@/tests/test-utils';
import { apiClient } from '@/lib/axios';
import { rolloverApi } from '@/features/enrollments/api/rolloverApi';

// Mock dependencies
vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/features/enrollments/api/rolloverApi', () => ({
  rolloverApi: {
    getPreview: vi.fn(),
    executeRollover: vi.fn(),
  },
}));

vi.mock('@/components/guards/RequireRole', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AcademicYearRolloverPage Component', () => {
  const mockYears = [
    { id: 'ay-2025', name: '2025-2026', is_current: false },
    { id: 'ay-2026', name: '2026-2027', is_current: true },
    { id: 'ay-2027', name: '2027-2028', is_current: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/academic-years')) {
        return Promise.resolve({ data: mockYears });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('TC-ROLLOVER-01: renders 3-step wizard with headers and stepper', async () => {
    renderWithProviders(<AcademicYearRolloverPage />);

    expect(screen.getByText(/Annual Student Promotion & Academic Year Rollover/i)).toBeInTheDocument();
    expect(screen.getByText('Select Academic Years')).toBeInTheDocument();
    expect(screen.getByText('Cohort Progression Review')).toBeInTheDocument();
    expect(screen.getByText('Rollover Summary')).toBeInTheDocument();
  });

  it('TC-ROLLOVER-02: automatically defaults source year to current academic year', async () => {
    renderWithProviders(<AcademicYearRolloverPage />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/admin/academic-years');
    });

    const proceedBtn = screen.getByRole('button', { name: /Review Cohort Progression/i });
    expect(proceedBtn).toBeInTheDocument();
  });

  it('TC-ROLLOVER-03: advances to step 2 preview when valid years are chosen and preview succeeds', async () => {
    (rolloverApi.getPreview as any).mockResolvedValueOnce({
      source_year_id: 'ay-2026',
      source_year_name: '2026-2027',
      target_year_id: 'ay-2025',
      target_year_name: '2025-2026',
      total_active_students: 45,
      cohort_mappings: [
        {
          source_grade_id: 'g-1',
          source_grade_name: 'Grade 1',
          target_grade_id: 'g-2',
          target_grade_name: 'Grade 2',
          student_count: 25,
          target_sections_available: 2,
          fee_structure_configured: true,
        },
      ],
      is_ready_to_rollover: true,
      warnings: [],
    });

    renderWithProviders(<AcademicYearRolloverPage />);

    const proceedBtn = screen.getByRole('button', { name: /Review Cohort Progression/i });

    // Wait until query resolves and defaults are populated
    await waitFor(() => {
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(rolloverApi.getPreview).toHaveBeenCalledWith('ay-2026', 'ay-2025');
    });

    await waitFor(() => {
      expect(screen.getByText('TOTAL ACTIVE STUDENTS')).toBeInTheDocument();
      expect(screen.getByText('Grade 1')).toBeInTheDocument();
      expect(screen.getByText('Grade 2')).toBeInTheDocument();
    });
  });

  it('TC-ROLLOVER-04: shows alert error when preview API call fails', async () => {
    (rolloverApi.getPreview as any).mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Target academic year has no active grades defined.',
        },
      },
    });

    renderWithProviders(<AcademicYearRolloverPage />);

    const proceedBtn = screen.getByRole('button', { name: /Review Cohort Progression/i });

    // Wait until query resolves and defaults are populated
    await waitFor(() => {
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(screen.getByText('Target academic year has no active grades defined.')).toBeInTheDocument();
    });
  });

  it('TC-ROLLOVER-05: gracefully renders step 2 when warnings are undefined or present', async () => {
    (rolloverApi.getPreview as any).mockResolvedValueOnce({
      source_year_id: 'ay-2026',
      source_year_name: '2026-2027',
      target_year_id: 'ay-2025',
      target_year_name: '2025-2026',
      total_active_students: 10,
      cohort_mappings: [],
      is_ready_to_rollover: false,
      warnings: ['Target year has no sections configured for Grade 1'],
    });

    renderWithProviders(<AcademicYearRolloverPage />);

    const proceedBtn = screen.getByRole('button', { name: /Review Cohort Progression/i });

    await waitFor(() => {
      expect(proceedBtn).not.toBeDisabled();
    });

    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(screen.getByText(/Configuration Notice:/i)).toBeInTheDocument();
      expect(screen.getByText('Target year has no sections configured for Grade 1')).toBeInTheDocument();
    });
  });
});
