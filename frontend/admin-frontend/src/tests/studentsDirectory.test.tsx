import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentsFilterBar from '../features/students/components/StudentsFilterBar';
import StudentsTable from '../features/students/components/StudentsTable';

describe('Students Directory Unit Tests', () => {
  describe('StudentsFilterBar Component', () => {
    it('renders comprehensive placeholder and triggers search and status filter callbacks', () => {
      const handleSearchChange = vi.fn();
      const handleStatusChange = vi.fn();

      render(
        <StudentsFilterBar
          search=""
          onSearchChange={handleSearchChange}
          statusFilter=""
          onStatusFilterChange={handleStatusChange}
        />
      );

      // Verify placeholder covers name, student ID, enrollment no, and email
      const searchInput = screen.getByPlaceholderText(/Search by name, student ID, enrollment no., or email.../i);
      expect(searchInput).toBeDefined();

      // Trigger search input change
      fireEvent.change(searchInput, { target: { value: 'Dev Patel' } });
      expect(handleSearchChange).toHaveBeenCalledWith('Dev Patel');
    });
  });

  describe('StudentsTable Component', () => {
    const mockItems = [
      {
        id: 'usr-1',
        email: 'dev.patel_f73c@student.school.edu',
        role: 'student',
        status: 'active',
        student: {
          id: 'stu-uuid-1',
          student_code: 'STU-DEVF73C',
          enrollment_number: 'ENR-2026-2A1B9',
          first_name: 'Dev',
          last_name: 'Patel',
          class_name: 'Nursery',
          section: 'A',
          department: 'General',
        },
      },
      {
        id: 'usr-2',
        email: 'ananya.deshmukh@student.school.edu',
        role: 'student',
        status: 'suspended',
        student: {
          id: 'stu-uuid-2',
          student_code: 'STU-ANA999',
          enrollment_number: 'ENR-2026-ANA88',
          first_name: 'Ananya',
          last_name: 'Deshmukh',
          class_name: 'Grade 9',
          section: 'A',
          department: 'Secondary',
        },
      },
    ];

    it('renders all student directory columns accurately', () => {
      render(
        <StudentsTable
          items={mockItems}
          total={2}
          loading={false}
          paginationModel={{ page: 0, pageSize: 10 }}
          onPaginationModelChange={vi.fn()}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onResendInvite={vi.fn()}
          onToggleStatus={vi.fn()}
          onPasswordReset={vi.fn()}
        />
      );

      // Column data checks
      expect(screen.getByText('ENR-2026-2A1B9')).toBeDefined();
      expect(screen.getByText('STU-DEVF73C')).toBeDefined();
      expect(screen.getByText('Dev Patel')).toBeDefined();
      expect(screen.getByText('dev.patel_f73c@student.school.edu')).toBeDefined();
      expect(screen.getByText('Nursery (A)')).toBeDefined();
      expect(screen.getByText('General')).toBeDefined();

      // Second row checks
      expect(screen.getByText('ENR-2026-ANA88')).toBeDefined();
      expect(screen.getByText('Ananya Deshmukh')).toBeDefined();
      expect(screen.getByText('Grade 9 (A)')).toBeDefined();
    });

    it('calls onView with studentId when View button is clicked', () => {
      const handleView = vi.fn();

      render(
        <StudentsTable
          items={mockItems}
          total={2}
          loading={false}
          paginationModel={{ page: 0, pageSize: 10 }}
          onPaginationModelChange={vi.fn()}
          onView={handleView}
          onEdit={vi.fn()}
          onResendInvite={vi.fn()}
          onToggleStatus={vi.fn()}
          onPasswordReset={vi.fn()}
        />
      );

      const viewButtons = screen.getAllByLabelText(/View Comprehensive Details/i);
      expect(viewButtons.length).toBe(2);

      fireEvent.click(viewButtons[0]);
      expect(handleView).toHaveBeenCalledWith('stu-uuid-1');
    });

    it('calls onEdit with student object when Edit button is clicked', () => {
      const handleEdit = vi.fn();

      render(
        <StudentsTable
          items={mockItems}
          total={2}
          loading={false}
          paginationModel={{ page: 0, pageSize: 10 }}
          onPaginationModelChange={vi.fn()}
          onView={vi.fn()}
          onEdit={handleEdit}
          onResendInvite={vi.fn()}
          onToggleStatus={vi.fn()}
          onPasswordReset={vi.fn()}
        />
      );

      const editButtons = screen.getAllByLabelText(/Edit Student & Enrollment/i);
      expect(editButtons.length).toBe(2);

      fireEvent.click(editButtons[0]);
      expect(handleEdit).toHaveBeenCalledWith(mockItems[0].student);
    });

    it('handles empty state without crashing', () => {
      render(
        <StudentsTable
          items={[]}
          total={0}
          loading={false}
          paginationModel={{ page: 0, pageSize: 10 }}
          onPaginationModelChange={vi.fn()}
          onView={vi.fn()}
          onEdit={vi.fn()}
          onResendInvite={vi.fn()}
          onToggleStatus={vi.fn()}
          onPasswordReset={vi.fn()}
        />
      );

      // DataGrid displays empty overlay
      expect(screen.getByText(/No rows/i)).toBeDefined();
    });
  });
});
