import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CreateParentDialog, { CreateParentDialogProps } from '../CreateParentDialog';
import { renderWithProviders } from '@/tests/test-utils';

describe('CreateParentDialog Component', () => {
  const defaultProps: CreateParentDialogProps = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-CREATE-PARENT-01: renders dialog title and input fields when open', () => {
    renderWithProviders(<CreateParentDialog {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Add Parent \/ Guardian/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('TC-CREATE-PARENT-02: shows validation errors when submitted empty', async () => {
    renderWithProviders(<CreateParentDialog {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Valid email is required/i)).toBeInTheDocument();
    });

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('TC-CREATE-PARENT-03: populates form and calls onSubmit on valid input', async () => {
    renderWithProviders(<CreateParentDialog {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Byron' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'ada.byron@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '1234567890' } });

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Ada',
          last_name: 'Byron',
          email: 'ada.byron@example.com',
          phone: '1234567890',
        })
      );
    });
  });

  it('TC-CREATE-PARENT-04: generates password when Generate button is clicked', () => {
    renderWithProviders(<CreateParentDialog {...defaultProps} />);

    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    fireEvent.click(generateBtn);

    const passwordInput = screen.getByLabelText(/Initial Password/i) as HTMLInputElement;
    expect(passwordInput.value).toMatch(/^Parent@\d{4}$/);
  });

  it('TC-CREATE-PARENT-05: calls onClose when Cancel button is clicked', () => {
    renderWithProviders(<CreateParentDialog {...defaultProps} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('TC-CREATE-PARENT-06: disables submit button while isSubmitting is true', () => {
    renderWithProviders(<CreateParentDialog {...defaultProps} isSubmitting={true} />);

    const submitBtn = screen.getByRole('button', { name: /Creating.../i });
    expect(submitBtn).toBeDisabled();
  });
});
