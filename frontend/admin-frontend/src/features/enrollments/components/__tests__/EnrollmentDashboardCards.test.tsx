import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import EnrollmentDashboardCards from '../EnrollmentDashboardCards';
import { renderWithProviders } from '@/tests/test-utils';
import { EnrollmentDashboardMetrics } from '../../types';

describe('EnrollmentDashboardCards Component', () => {
  const mockMetrics: EnrollmentDashboardMetrics = {
    total_enrolled: 420,
    unassigned_students: 15,
    transferred_students: 8,
    promoted_students: 395,
    inactive_students: 4,
  };

  it('TC-METRICS-01: renders all 5 metric cards with correct labels and numeric values', () => {
    renderWithProviders(<EnrollmentDashboardCards metrics={mockMetrics} />);

    // Verify card labels
    expect(screen.getByText('Active Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Unassigned Students')).toBeInTheDocument();
    expect(screen.getByText('Transferred Students')).toBeInTheDocument();
    expect(screen.getByText('Promoted Students')).toBeInTheDocument();
    expect(screen.getByText('Inactive / Left')).toBeInTheDocument();

    // Verify card values
    expect(screen.getByText('420')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('395')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('TC-METRICS-02: handles zero-value metrics gracefully without errors or NaN', () => {
    const zeroMetrics: EnrollmentDashboardMetrics = {
      total_enrolled: 0,
      unassigned_students: 0,
      transferred_students: 0,
      promoted_students: 0,
      inactive_students: 0,
    };

    renderWithProviders(<EnrollmentDashboardCards metrics={zeroMetrics} />);

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(5);
  });
});
