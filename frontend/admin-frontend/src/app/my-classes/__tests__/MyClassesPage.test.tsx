import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MyClassesPage from '../page';
import { renderWithProviders } from '@/tests/test-utils';
import { teacherPortalApi } from '@/features/teacher-portal/api';
import { teacherSubjectApi } from '@/features/teachers/subjectApi';
import { apiClient } from '@/lib/axios';

// Mock layout guards
vi.mock('@/components/guards/RequireRole', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/layout/AppShell', () => ({
  default: ({ children }: any) => <div data-testid="app-shell">{children}</div>,
}));

// Mock APIs
vi.mock('@/features/teacher-portal/api', () => ({
  teacherPortalApi: {
    getMySections: vi.fn(),
    getMySectionStudents: vi.fn(),
    getAssignedClasses: vi.fn(),
    getClassRoster: vi.fn(),
  },
}));

vi.mock('@/features/teachers/subjectApi', () => ({
  teacherSubjectKeys: {
    mySubjects: () => ['teacher', 'my-subjects'],
  },
  teacherSubjectApi: {
    getMySubjects: vi.fn(),
  },
}));

vi.mock('@/lib/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockSectionsData = {
  sections: [
    {
      section_id: 'sec-101',
      section_name: '10-A',
      grade_name: 'Grade 10',
      role: 'CLASS_TEACHER',
      academic_year: '2026-2027',
      total_students: 28,
    },
  ],
};

const mockSubjectsData = [
  {
    id: 'ts-201',
    subject_name: 'Mathematics',
    subject_code: 'MATH101',
    grade_name: 'Grade 10',
    section_name: '10-A',
    academic_year_name: '2026-2027',
    status: 'active',
  },
];

const mockAssignmentsData = [
  {
    id: 'asgn-301',
    teacher_id: 't-1',
    class_id: 'cls-101',
    subject_id: 'sub-101',
    is_class_teacher: true,
    academic_year: '2026-2027',
    status: 'active',
    class_name: 'Grade 10',
    section: '10-A',
    subject_name: 'Mathematics',
    subject_code: 'MATH101',
  },
];

const mockSubstitutionsData = [
  {
    id: 'sub-401',
    date: '2026-11-20',
    period_name: 'Period 2',
    grade_name: 'Grade 11',
    section_name: '11-B',
    subject_name: 'Physics',
    original_teacher_name: 'Dr. Alan Turing',
    status: 'ASSIGNED',
    notes: 'Medical leave coverage',
  },
];

const mockClassRosterData = {
  class_id: 'cls-101',
  class_name: 'Grade 10',
  section: '10-A',
  items: [
    {
      id: 'stu-1',
      student_code: 'STU-1001',
      name: 'Ada Lovelace',
      status: 'active',
    },
  ],
  total: 1,
  page: 1,
  size: 10,
};

const mockSectionStudentsData = {
  items: [
    {
      enrollment_id: 'enr-1',
      roll_no: '01',
      student_code: 'STU-1001',
      first_name: 'Ada',
      last_name: 'Lovelace',
      enrollment_date: '2026-08-01',
      status: 'ACTIVE',
    },
  ],
};

describe('MyClassesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (teacherPortalApi.getMySections as any).mockResolvedValue(mockSectionsData);
    (teacherSubjectApi.getMySubjects as any).mockResolvedValue(mockSubjectsData);
    (teacherPortalApi.getAssignedClasses as any).mockResolvedValue(mockAssignmentsData);
    (apiClient.get as any).mockResolvedValue({ data: mockSubstitutionsData });
    (teacherPortalApi.getClassRoster as any).mockResolvedValue(mockClassRosterData);
    (teacherPortalApi.getMySectionStudents as any).mockResolvedValue(mockSectionStudentsData);
  });

  afterEach(() => {
    cleanup();
  });

  it('TC-CLASSES-01: renders page title and homeroom section cards', async () => {
    renderWithProviders(<MyClassesPage />);

    expect(screen.getByText('My Classes & Teaching Schedule')).toBeInTheDocument();
    expect(
      screen.getByText(/Review assigned classes, subjects, and student rosters/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Assigned Homeroom & Coordinated Sections')).toBeInTheDocument();
      expect(screen.getAllByText('Class Teacher').length).toBeGreaterThan(0);
      expect(screen.getByText(/Academic Year: 2026-2027/i)).toBeInTheDocument();
      expect(screen.getByText(/Enrolled Students: 28/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View Section Roster/i })).toBeInTheDocument();
    });
  });

  it('TC-CLASSES-02: renders assigned subjects and scope table', async () => {
    renderWithProviders(<MyClassesPage />);

    await waitFor(() => {
      expect(screen.getByText('My Assigned Subjects & Scope')).toBeInTheDocument();
      expect(screen.getAllByText('Mathematics').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MATH101').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Section 10-A/i).length).toBeGreaterThan(0);
    });
  });

  it('TC-CLASSES-03: renders assigned substitution coverage table', async () => {
    renderWithProviders(<MyClassesPage />);

    await waitFor(() => {
      expect(screen.getByText('Assigned Substitution Coverage')).toBeInTheDocument();
      expect(screen.getByText('1 Assigned')).toBeInTheDocument();
      expect(screen.getByText('Period 2')).toBeInTheDocument();
      expect(screen.getByText('Grade 11 - 11-B')).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getByText('Dr. Alan Turing')).toBeInTheDocument();
    });
  });

  it('TC-CLASSES-04: renders subject teaching assignments cards with class teacher badge', async () => {
    renderWithProviders(<MyClassesPage />);

    await waitFor(() => {
      expect(screen.getByText('Subject Teaching Assignments')).toBeInTheDocument();
      expect(screen.getByText('Sec 10-A')).toBeInTheDocument();
      expect(screen.getByText('Term: 2026-2027')).toBeInTheDocument();
    });
  });

  it('TC-CLASSES-05: opens Class Student Roster modal on clicking View Student Roster', async () => {
    renderWithProviders(<MyClassesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View Student Roster/i })).toBeInTheDocument();
    });

    const rosterBtn = screen.getByRole('button', { name: /View Student Roster/i });
    fireEvent.click(rosterBtn);

    await waitFor(() => {
      expect(screen.getByText(/Subject: Mathematics \(MATH101\)/i)).toBeInTheDocument();
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('STU-1001')).toBeInTheDocument();
    });

    // Test search filter input
    const searchInput = screen.getByPlaceholderText(/Search students by name or code/i);
    fireEvent.change(searchInput, { target: { value: 'Ada' } });

    await waitFor(() => {
      expect(teacherPortalApi.getClassRoster).toHaveBeenCalledWith(
        'cls-101',
        expect.objectContaining({ search: 'Ada' })
      );
    });

    // Close dialog
    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);
  });

  it('TC-CLASSES-06: opens Section Student Roster modal on clicking View Section Roster', async () => {
    renderWithProviders(<MyClassesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /View Section Roster/i })).toBeInTheDocument();
    });

    const sectionRosterBtn = screen.getByRole('button', { name: /View Section Roster/i });
    fireEvent.click(sectionRosterBtn);

    await waitFor(() => {
      expect(screen.getByText('Roll No')).toBeInTheDocument();
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('2026-08-01')).toBeInTheDocument();
    });

    // Close section modal
    const doneBtn = screen.getByRole('button', { name: /^Done$/i });
    fireEvent.click(doneBtn);
  });

  it('TC-CLASSES-07: renders empty states when teacher has no assignments', async () => {
    (teacherPortalApi.getMySections as any).mockResolvedValue({ sections: [] });
    (teacherSubjectApi.getMySubjects as any).mockResolvedValue([]);
    (teacherPortalApi.getAssignedClasses as any).mockResolvedValue([]);
    (apiClient.get as any).mockResolvedValue({ data: [] });

    renderWithProviders(<MyClassesPage />);

    await waitFor(() => {
      expect(screen.getByText('No subjects currently assigned to you.')).toBeInTheDocument();
      expect(screen.getByText('No Classes Assigned')).toBeInTheDocument();
      expect(
        screen.getByText(/You do not currently have any active classroom or subject assignments/i)
      ).toBeInTheDocument();
    });
  });
});
