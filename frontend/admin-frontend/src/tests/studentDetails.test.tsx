import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudentFeesTab from '../features/students/components/details/StudentFeesTab';
import StudentHeaderCard from '../features/students/components/details/StudentHeaderCard';
import StudentAcademicsTab from '../features/students/components/details/StudentAcademicsTab';

describe('Student Details Components', () => {
  describe('StudentFeesTab Currency Formatting', () => {
    it('formats amounts with ₹ for INR currency', () => {
      const feeInfo = {
        has_fee_assignment: true,
        fee_structure_name: 'Grade 4 Fees',
        currency: 'INR',
        net_amount: '46000.00',
        paid_amount: '11500.00',
        outstanding_balance: '34500.00',
        status: 'ACTIVE',
        installments: [
          {
            id: 'inst-1',
            installment_number: 1,
            due_date: '2026-04-10',
            amount: '11500.00',
            paid_amount: '11500.00',
            balance: '0.00',
            status: 'PAID',
          },
        ],
        payments: [
          {
            id: 'pmt-1',
            receipt_number: 'REC-001',
            payment_date: '2026-04-05',
            payment_method: 'RAZORPAY',
            amount: '11500.00',
          },
        ],
      };

      render(<StudentFeesTab feeInfo={feeInfo} />);

      // Should display amounts formatted with Indian Rupee symbol (₹)
      expect(screen.getByText('₹46000.00')).toBeDefined();
      expect(screen.getAllByText('₹11500.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('₹34500.00')).toBeDefined();
    });

    it('renders alert when student has no fee assignment', () => {
      render(<StudentFeesTab feeInfo={{ has_fee_assignment: false }} />);
      expect(screen.getByText(/No fee structures or fee assignments configured/i)).toBeDefined();
    });
  });

  describe('StudentHeaderCard Status Badges', () => {
    it('displays inactive / left status badge when student has no active enrollment', () => {
      const studentData = {
        student_code: 'STU-DEVF73C',
        enrollment_number: 'ENR-2026-2A1B9',
        personal_details: {
          first_name: 'Dev',
          last_name: 'Patel',
          user_status: 'active',
          department: 'General',
        },
        academic_details: {
          current_grade: 'Grade 4',
          current_section: '4-A',
          is_currently_enrolled: false,
          enrollment_status: 'LEFT',
        },
      };

      render(<StudentHeaderCard studentData={studentData} onOpenEdit={vi.fn()} />);

      expect(screen.getByText('Dev Patel')).toBeDefined();
      expect(screen.getByText('Grade 4 - 4-A')).toBeDefined();
      expect(screen.getByText('Status: LEFT')).toBeDefined();
    });
  });

  describe('StudentAcademicsTab Null Safety and Status', () => {
    it('renders gracefully when enrolled_at is null or missing without displaying 1970', () => {
      const academicInfo = {
        current_academic_year: '2026-2027',
        current_grade: 'Grade 4',
        current_section: '4-A',
        is_currently_enrolled: false,
        enrollment_status: 'LEFT',
        active_subjects: [],
        enrollment_history: [
          {
            id: 'hist-1',
            academic_year_name: '2026-2027',
            grade_name: 'Grade 4',
            section_name: '4-A',
            status: 'LEFT',
            enrolled_at: null,
          },
        ],
      };

      render(
        <StudentAcademicsTab
          academicInfo={academicInfo}
          timetable={[]}
          currentGrade="Grade 4"
          currentSection="4-A"
        />
      );

      // Dash fallback rendered instead of 1970
      expect(screen.getByText('—')).toBeDefined();
      expect(screen.getByText('Enrollment: LEFT')).toBeDefined();
    });
  });

  describe('StudentFeesTab Grade Change and Adjustments', () => {
    it('displays fee adjustments table with Need to Pay and Overpaid badges', () => {
      const feeInfo = {
        has_fee_assignment: true,
        fee_structure_name: 'Grade 12 Science Fees',
        currency: 'INR',
        net_amount: '95000.00',
        paid_amount: '75000.00',
        outstanding_balance: '20000.00',
        overpaid_amount: '0.00',
        status: 'ACTIVE',
        installments: [],
        payments: [],
        adjustments: [
          {
            id: 'adj-1',
            adjustment_type: 'ADDITIONAL_CHARGE',
            category: 'additional_charge',
            description: 'Grade Change: Grade 10 → Grade 12 (Need to Pay: +₹20,000.00)',
            amount: '20000.00',
            created_at: '2026-04-15T10:00:00',
          },
        ],
      };

      render(<StudentFeesTab feeInfo={feeInfo} />);

      expect(screen.getByText('Fee Adjustments & Grade Changes')).toBeDefined();
      expect(screen.getByText('Grade Change: Grade 10 → Grade 12 (Need to Pay: +₹20,000.00)')).toBeDefined();
      expect(screen.getByText('NEED TO PAY')).toBeDefined();
      expect(screen.getByText('+₹20000.00')).toBeDefined();
    });

    it('displays overpaid surplus alert when overpaid_amount is greater than 0', () => {
      const feeInfo = {
        has_fee_assignment: true,
        fee_structure_name: 'Grade 1 Fees',
        currency: 'INR',
        net_amount: '35000.00',
        paid_amount: '75000.00',
        outstanding_balance: '0.00',
        overpaid_amount: '40000.00',
        status: 'ACTIVE',
        installments: [],
        payments: [],
        adjustments: [
          {
            id: 'adj-2',
            adjustment_type: 'DISCOUNT_FIXED',
            category: 'discount',
            description: 'Grade Change: Grade 10 → Grade 1 (Overpaid Difference: -₹40,000.00)',
            amount: '40000.00',
            created_at: '2026-04-15T11:00:00',
          },
        ],
      };

      render(<StudentFeesTab feeInfo={feeInfo} />);

      expect(screen.getByText(/Overpaid Surplus \/ Credit Balance: ₹40000.00/i)).toBeDefined();
      expect(screen.getByText('OVERPAY / CREDIT')).toBeDefined();
      expect(screen.getByText('-₹40000.00')).toBeDefined();
    });
  });
});
