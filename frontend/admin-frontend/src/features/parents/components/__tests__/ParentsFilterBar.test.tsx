import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import ParentsFilterBar, { ParentsFilterBarProps } from '../ParentsFilterBar';
import { renderWithProviders } from '@/tests/test-utils';

describe('ParentsFilterBar Component', () => {
  const defaultProps: ParentsFilterBarProps = {
    search: '',
    onSearchChange: vi.fn(),
    statusFilter: '',
    onStatusFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-PARENTS-FILTER-01: renders search input and status select filter', () => {
    renderWithProviders(<ParentsFilterBar {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Search by parent name, email, or phone.../i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Status/i)).toBeInTheDocument();
  });

  it('TC-PARENTS-FILTER-02: calls onSearchChange when user types in search box', () => {
    renderWithProviders(<ParentsFilterBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Search by parent name, email, or phone.../i);
    fireEvent.change(searchInput, { target: { value: 'Byron' } });

    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('Byron');
  });

  it('TC-PARENTS-FILTER-03: renders current status filter and updates on change', () => {
    renderWithProviders(
      <ParentsFilterBar {...defaultProps} statusFilter="" />
    );

    const combobox = screen.getByRole('combobox', { name: /Account Status/i });
    fireEvent.mouseDown(combobox);

    const suspendedOption = screen.getByRole('option', { name: /Suspended/i });
    fireEvent.click(suspendedOption);

    expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith('suspended');
  });
});
