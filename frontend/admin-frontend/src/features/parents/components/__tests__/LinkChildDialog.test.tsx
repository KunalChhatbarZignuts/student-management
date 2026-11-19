import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import LinkChildDialog, { LinkChildDialogProps } from '../LinkChildDialog';
import { renderWithProviders } from '@/tests/test-utils';
import { mockParentActive, mockStudentOptions } from '../../__tests__/fixtures';

describe('LinkChildDialog Component', () => {
  const defaultProps: LinkChildDialogProps = {
    linkingParent: mockParentActive,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    studentOptions: mockStudentOptions,
    isLoadingStudents: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-LINK-CHILD-01: renders nothing when linkingParent is null', () => {
    const { container } = renderWithProviders(
      <LinkChildDialog {...defaultProps} linkingParent={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('TC-LINK-CHILD-02: renders target parent info banner when open', () => {
    renderWithProviders(<LinkChildDialog {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Link Student to Parent Account/i })).toBeInTheDocument();
    expect(screen.getByText(/Linking to:/i)).toBeInTheDocument();
    expect(screen.getByText(/Lord Byron/i)).toBeInTheDocument();
  });

  it('TC-LINK-CHILD-03: shows warning alert when studentOptions is empty', () => {
    renderWithProviders(<LinkChildDialog {...defaultProps} studentOptions={[]} />);

    expect(
      screen.getByText(/All enrolled students currently have an active parent profile/i)
    ).toBeInTheDocument();
  });

  it('TC-LINK-CHILD-04: keeps Link Student button disabled until a student is selected', () => {
    renderWithProviders(<LinkChildDialog {...defaultProps} />);

    const linkBtn = screen.getByRole('button', { name: /Link Student/i });
    expect(linkBtn).toBeDisabled();
  });

  it('TC-LINK-CHILD-05: selects a student and submits with relationship details', () => {
    renderWithProviders(<LinkChildDialog {...defaultProps} />);

    // Open Autocomplete and select student
    const autocomplete = screen.getByRole('combobox', { name: /Search Enrolled Student/i });
    fireEvent.mouseDown(autocomplete);

    const option = screen.getByText(/Charles Babbage/i);
    fireEvent.click(option);

    // Toggle Primary Guardian switch
    const primarySwitch = screen.getByRole('checkbox', {
      name: /Designate as Primary Guardian/i,
    });
    fireEvent.click(primarySwitch);

    // Click Link Student
    const linkBtn = screen.getByRole('button', { name: /Link Student/i });
    expect(linkBtn).toBeEnabled();
    fireEvent.click(linkBtn);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      studentId: 'stu-201',
      relationshipType: 'Guardian',
      isPrimaryGuardian: true,
    });
  });

  it('TC-LINK-CHILD-06: calls onClose when Cancel button is clicked', () => {
    renderWithProviders(<LinkChildDialog {...defaultProps} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
