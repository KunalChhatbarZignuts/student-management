import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import ParentDetailDialog, { ParentDetailDialogProps } from '../ParentDetailDialog';
import { renderWithProviders } from '@/tests/test-utils';
import { mockParentActive, mockParentSuspended, mockLinkedChild } from '../../__tests__/fixtures';

describe('ParentDetailDialog Component', () => {
  const defaultProps: ParentDetailDialogProps = {
    viewingParent: mockParentActive,
    onClose: vi.fn(),
    onLinkNewChild: vi.fn(),
    onUnlinkChild: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-PARENT-DETAIL-01: renders nothing when viewingParent is null', () => {
    const { container } = renderWithProviders(
      <ParentDetailDialog {...defaultProps} viewingParent={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('TC-PARENT-DETAIL-02: renders parent summary info and linked student count', () => {
    renderWithProviders(<ParentDetailDialog {...defaultProps} />);

    expect(screen.getByText('Lord Byron')).toBeInTheDocument();
    expect(screen.getByText('lord.byron@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1 555-0100')).toBeInTheDocument();
    expect(screen.getByText('10 Downing St, London')).toBeInTheDocument();
    expect(screen.getByText(/Linked Students \(1\)/i)).toBeInTheDocument();
  });

  it('TC-PARENT-DETAIL-03: renders linked children table with student details', () => {
    renderWithProviders(<ParentDetailDialog {...defaultProps} />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('STU-2026-00001')).toBeInTheDocument();
    expect(screen.getByText('Grade 12 (12-A)')).toBeInTheDocument();
    expect(screen.getByText('Father')).toBeInTheDocument();
  });

  it('TC-PARENT-DETAIL-04: calls onUnlinkChild when unlink button is clicked', () => {
    renderWithProviders(<ParentDetailDialog {...defaultProps} />);

    const unlinkBtn = screen.getByRole('button', { name: /Unlink Student/i });
    fireEvent.click(unlinkBtn);

    expect(defaultProps.onUnlinkChild).toHaveBeenCalledWith(
      mockParentActive,
      mockLinkedChild
    );
  });

  it('TC-PARENT-DETAIL-05: renders info banner when parent has no linked children', () => {
    renderWithProviders(
      <ParentDetailDialog {...defaultProps} viewingParent={mockParentSuspended} />
    );

    expect(
      screen.getByText(/No active children are currently linked to this parent account/i)
    ).toBeInTheDocument();
  });

  it('TC-PARENT-DETAIL-06: triggers onLinkNewChild when Link New Child button is clicked', () => {
    renderWithProviders(<ParentDetailDialog {...defaultProps} />);

    const linkNewBtn = screen.getByRole('button', { name: /Link New Child/i });
    fireEvent.click(linkNewBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onLinkNewChild).toHaveBeenCalledWith(mockParentActive);
  });

  it('TC-PARENT-DETAIL-07: calls onClose when Close button is clicked', () => {
    renderWithProviders(<ParentDetailDialog {...defaultProps} />);

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
