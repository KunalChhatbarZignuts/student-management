import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import ParentsTable, { ParentsTableProps } from '../ParentsTable';
import { renderWithProviders } from '@/tests/test-utils';
import { mockParentActive, mockParentSuspended } from '../../__tests__/fixtures';

describe('ParentsTable Component', () => {
  const defaultProps: ParentsTableProps = {
    items: [mockParentActive, mockParentSuspended],
    total: 2,
    loading: false,
    paginationModel: { page: 0, pageSize: 10 },
    onPaginationModelChange: vi.fn(),
    onView: vi.fn(),
    onEdit: vi.fn(),
    onLink: vi.fn(),
    onResendInvite: vi.fn(),
    onToggleStatus: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-PARENTS-TABLE-01: renders table headers and parent data rows', () => {
    renderWithProviders(<ParentsTable {...defaultProps} />);

    expect(screen.getByText('Lord Byron')).toBeInTheDocument();
    expect(screen.getByText('lord.byron@example.com')).toBeInTheDocument();
    expect(screen.getByText('Meera Kapoor')).toBeInTheDocument();
    expect(screen.getByText('meera.kapoor@example.com')).toBeInTheDocument();
  });

  it('TC-PARENTS-TABLE-02: displays linked children count correctly', () => {
    renderWithProviders(<ParentsTable {...defaultProps} />);

    expect(screen.getByText('1 Children')).toBeInTheDocument();
    expect(screen.getByText('0 Children')).toBeInTheDocument();
  });

  it('TC-PARENTS-TABLE-03: triggers onView when View button is clicked', () => {
    renderWithProviders(<ParentsTable {...defaultProps} />);

    const viewButtons = screen.getAllByRole('button', { name: /View Details & Children/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    fireEvent.click(viewButtons[0]);

    expect(defaultProps.onView).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'parent-1', first_name: 'Lord' })
    );
  });

  it('TC-PARENTS-TABLE-04: triggers onEdit when Edit Profile button is clicked', () => {
    renderWithProviders(<ParentsTable {...defaultProps} />);

    const editButtons = screen.getAllByRole('button', { name: /Edit Parent Profile/i });
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'parent-1' })
    );
  });

  it('TC-PARENTS-TABLE-05: triggers onLink when Link a Student button is clicked', () => {
    renderWithProviders(<ParentsTable {...defaultProps} />);

    const linkButtons = screen.getAllByRole('button', { name: /Link a Student/i });
    fireEvent.click(linkButtons[0]);

    expect(defaultProps.onLink).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'parent-1' })
    );
  });

  it('TC-PARENTS-TABLE-06: triggers onToggleStatus with suspend for active parent and activate for suspended parent', () => {
    renderWithProviders(<ParentsTable {...defaultProps} />);

    const suspendButton = screen.getByRole('button', { name: /Suspend Account/i });
    fireEvent.click(suspendButton);
    expect(defaultProps.onToggleStatus).toHaveBeenCalledWith('suspend', 'parent-1', 'Lord Byron');

    const activateButton = screen.getByRole('button', { name: /Activate Account/i });
    fireEvent.click(activateButton);
    expect(defaultProps.onToggleStatus).toHaveBeenCalledWith('activate', 'parent-2', 'Meera Kapoor');
  });

  it('TC-PARENTS-TABLE-07: triggers onDelete when delete button is clicked', () => {
    renderWithProviders(<ParentsTable {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /Delete Parent & Revoke Portal Access/i });
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDelete).toHaveBeenCalledWith('parent-1', 'Lord Byron');
  });
});
