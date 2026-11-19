import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import EditParentDialog, { EditParentDialogProps } from '../EditParentDialog';
import { renderWithProviders } from '@/tests/test-utils';
import { mockParentActive } from '../../__tests__/fixtures';

describe('EditParentDialog Component', () => {
  const getProps = (overrides = {}): EditParentDialogProps => ({
    editingParent: { ...mockParentActive },
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('TC-EDIT-PARENT-01: renders nothing when editingParent is null', () => {
    const { container } = renderWithProviders(
      <EditParentDialog {...getProps({ editingParent: null })} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('TC-EDIT-PARENT-02: pre-populates form inputs with existing parent data', async () => {
    renderWithProviders(<EditParentDialog {...getProps()} />);

    expect(screen.getByRole('heading', { name: /Edit Parent \/ Guardian Profile/i })).toBeInTheDocument();

    const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(/Last Name/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    const addressInput = screen.getByLabelText(/Home Address/i) as HTMLInputElement;

    await waitFor(() => {
      expect(firstNameInput.value).toBe('Lord');
      expect(lastNameInput.value).toBe('Byron');
      expect(phoneInput.value).toBe('+1 555-0100');
      expect(addressInput.value).toBe('10 Downing St, London');
    });
  });

  it('TC-EDIT-PARENT-03: shows validation errors if required fields are cleared', async () => {
    const props = getProps();
    renderWithProviders(<EditParentDialog {...props} />);

    await waitFor(() => {
      expect((screen.getByLabelText(/First Name/i) as HTMLInputElement).value).toBe('Lord');
    });

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: '' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
    });

    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('TC-EDIT-PARENT-04: calls onSubmit with modified data upon save', async () => {
    const onSubmitMock = vi.fn();
    const props = getProps({ onSubmit: onSubmitMock });
    renderWithProviders(<EditParentDialog {...props} />);

    const firstNameInput = screen.getByLabelText(/First Name/i);
    await waitFor(() => {
      expect((firstNameInput as HTMLInputElement).value).toBe('Lord');
    });

    fireEvent.change(firstNameInput, { target: { value: 'George' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Gordon' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '9876543210' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'George',
          last_name: 'Gordon',
          phone: '9876543210',
          address: '10 Downing St, London',
        }),
        expect.anything()
      );
    });
  });

  it('TC-EDIT-PARENT-05: calls onClose when Cancel button is clicked', () => {
    const props = getProps();
    renderWithProviders(<EditParentDialog {...props} />);

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(props.onClose).toHaveBeenCalled();
  });
});
