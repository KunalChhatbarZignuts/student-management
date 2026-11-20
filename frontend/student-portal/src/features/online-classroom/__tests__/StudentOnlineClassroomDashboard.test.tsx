import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import StudentOnlineClassroomPage from '@/app/online-classroom/page';
import { renderWithProviders } from '@/tests/test-utils';
import { studentOnlineClassApi } from '../api';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/online-classroom',
}));

vi.mock('../api', () => ({
  studentOnlineClassKeys: {
    all: ['student-online-classes'],
    list: (status?: string) => ['student-online-classes', 'list', status || 'all'],
    preJoin: (classId: string) => ['student-online-classes', 'pre-join', classId],
    detail: (classId: string) => ['student-online-classes', 'detail', classId],
  },
  studentOnlineClassApi: {
    getClasses: vi.fn(),
    getPreJoinInfo: vi.fn(),
    getClassDetail: vi.fn(),
    getToken: vi.fn(),
  },
}));

const mockStudentClasses = [
  {
    id: 'cls-1',
    teacher_id: 't-1',
    teacher_name: 'Dr. Katherine Johnson',
    title: 'Advanced Orbital Mechanics',
    description: 'Trajectory calculation and rendezvous orbits',
    room_name: 'cls-orb101',
    scheduled_date: '2026-11-20',
    start_time: '10:00:00',
    expected_duration_minutes: 60,
    status: 'LIVE' as const,
    is_recording_enabled: true,
    allow_student_mic: true,
    allow_student_cam: true,
    allow_student_chat: true,
    allow_student_whiteboard: false,
    participant_count: 15,
    created_at: '2026-11-19T00:00:00Z',
    updated_at: '2026-11-19T00:00:00Z',
  },
  {
    id: 'cls-2',
    teacher_id: 't-2',
    teacher_name: 'Prof. Carl Sagan',
    title: 'Cosmic Evolution Seminar',
    description: 'Star formation and planetary development',
    room_name: 'cls-cosmo202',
    scheduled_date: '2026-11-21',
    start_time: '14:00:00',
    expected_duration_minutes: 45,
    status: 'SCHEDULED' as const,
    is_recording_enabled: false,
    allow_student_mic: false,
    allow_student_cam: false,
    allow_student_chat: true,
    allow_student_whiteboard: false,
    participant_count: 22,
    created_at: '2026-11-19T00:00:00Z',
    updated_at: '2026-11-19T00:00:00Z',
  },
  {
    id: 'cls-3',
    teacher_id: 't-1',
    teacher_name: 'Dr. Katherine Johnson',
    title: 'Calculus III: Vector Fields',
    description: 'Completed review on divergence and Stokes theorem',
    room_name: 'cls-calc303',
    scheduled_date: '2026-11-18',
    start_time: '09:00:00',
    expected_duration_minutes: 60,
    status: 'COMPLETED' as const,
    is_recording_enabled: true,
    allow_student_mic: true,
    allow_student_cam: true,
    allow_student_chat: true,
    allow_student_whiteboard: true,
    participant_count: 18,
    created_at: '2026-11-18T00:00:00Z',
    updated_at: '2026-11-18T00:00:00Z',
  },
];

describe('StudentOnlineClassroomPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-STUDENT-01: renders dashboard title, subtitle, and metric cards', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: mockStudentClasses,
      total: 3,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    expect(screen.getByRole('heading', { name: /Online Classroom/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Join live video lectures, collaborate with teachers/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Live Right Now')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Classes')).toBeInTheDocument();
      expect(screen.getByText('Completed Classes')).toBeInTheDocument();
      expect(screen.queryByText('Recordings Ready')).not.toBeInTheDocument();
    });
  });

  it('TC-STUDENT-02: renders live banner when a class is in progress', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: mockStudentClasses,
      total: 3,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    await waitFor(() => {
      expect(screen.getByText(/Class in Session:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Advanced Orbital Mechanics/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('TC-STUDENT-03: renders student class cards with teacher name and status chips', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: mockStudentClasses,
      total: 3,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    await waitFor(() => {
      expect(screen.getByText('LIVE NOW')).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Prof. Carl Sagan')).toBeInTheDocument();
    });
  });

  it('TC-STUDENT-04: clicks join button and navigates to pre-join route', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: mockStudentClasses,
      total: 3,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Join Live Now/i })).toBeInTheDocument();
    });

    const joinBtn = screen.getByRole('button', { name: /Join Live Now/i });
    fireEvent.click(joinBtn);

    expect(mockPush).toHaveBeenCalledWith('/online-classroom/cls-1/join');
  });

  it('TC-STUDENT-05: switches to Past Sessions tab and displays completed classes', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: mockStudentClasses,
      total: 3,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Past Sessions/i })).toBeInTheDocument();
    });

    const pastTab = screen.getByRole('tab', { name: /Past Sessions/i });
    fireEvent.click(pastTab);

    await waitFor(() => {
      expect(screen.getByText('Calculus III: Vector Fields')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('TC-STUDENT-06: verifies Recordings Library tab is completely removed from dashboard', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: mockStudentClasses,
      total: 3,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Upcoming & Live/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Past Sessions/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('tab', { name: /Recordings Library/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Watch Recording/i)).not.toBeInTheDocument();
  });

  it('TC-STUDENT-07: renders empty state when no classes are scheduled', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    await waitFor(() => {
      expect(screen.getByText('No Scheduled Online Classes')).toBeInTheDocument();
    });
  });

  it('TC-STUDENT-08: filters classes by search query in real time', async () => {
    vi.mocked(studentOnlineClassApi.getClasses).mockResolvedValue({
      items: mockStudentClasses,
      total: 3,
      page: 1,
      size: 50,
    });

    renderWithProviders(<StudentOnlineClassroomPage />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Orbital Mechanics')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search title or teacher/i);
    fireEvent.change(searchInput, { target: { value: 'Orbital' } });

    await waitFor(() => {
      expect(screen.getByText('Advanced Orbital Mechanics')).toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'Nonexistent Class Query' } });
    await waitFor(() => {
      expect(screen.getByText('No Matching Classes Found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear Search/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Clear Search/i }));
    await waitFor(() => {
      expect(screen.getByText('Advanced Orbital Mechanics')).toBeInTheDocument();
    });
  });
});

