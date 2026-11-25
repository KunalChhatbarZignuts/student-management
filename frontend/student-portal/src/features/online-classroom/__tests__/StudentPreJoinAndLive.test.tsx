import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import PreJoinClassroomPage from '@/app/online-classroom/[id]/join/page';
import StudentLiveClassroomPage from '@/app/online-classroom/[id]/live/page';
import { renderWithProviders } from '@/tests/test-utils';
import { studentOnlineClassApi } from '../api';

vi.mock('@/components/guards/RequireRole', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({ id: 'cls-test-123' }),
  usePathname: () => '/online-classroom/cls-test-123/live',
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

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readyState = 1;
  onopen: any = null;
  onmessage: any = null;
  onclose: any = null;
  onerror: any = null;
  send = vi.fn();
  close = vi.fn();
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
}
(global as any).WebSocket = MockWebSocket;

describe('Student Pre-Join Screen & Interactive Meeting Room', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PreJoinClassroomPage', () => {
    it('TC-PREJOIN-01: renders Green Room when can_join is true', async () => {
      vi.mocked(studentOnlineClassApi.getPreJoinInfo).mockResolvedValue({
        class_id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        can_join: true,
        status: 'LIVE',
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        allow_student_mic: true,
        allow_student_cam: true,
      } as any);

      renderWithProviders(<PreJoinClassroomPage />);

      await waitFor(() => {
        expect(screen.getByText('Quantum Field Theory')).toBeInTheDocument();
        expect(screen.getByText(/Dr\. Richard Feynman/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Join Live Class Now/i })).toBeInTheDocument();
      });
    });

    it('TC-PREJOIN-02: navigates to live room on join click', async () => {
      vi.mocked(studentOnlineClassApi.getPreJoinInfo).mockResolvedValue({
        class_id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        can_join: true,
        status: 'LIVE',
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        allow_student_mic: true,
        allow_student_cam: true,
      } as any);

      renderWithProviders(<PreJoinClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Join Live Class Now/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Join Live Class Now/i }));
      expect(mockPush).toHaveBeenCalledWith('/online-classroom/cls-test-123/live');
    });

    it('TC-PREJOIN-03: renders Blocked screen when can_join is false', async () => {
      vi.mocked(studentOnlineClassApi.getPreJoinInfo).mockResolvedValue({
        class_id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        can_join: false,
        status: 'COMPLETED',
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        allow_student_mic: false,
        allow_student_cam: false,
      } as any);

      renderWithProviders(<PreJoinClassroomPage />);

      await waitFor(() => {
        expect(screen.getByText(/Cannot Join Classroom/i)).toBeInTheDocument();
      });
    });
  });

  describe('StudentLiveClassroomPage Interactive Meeting', () => {
    it('TC-MEETING-01: renders meeting grid with instructor tile and student self tile', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getAllByText(/Dr\. Richard Feynman/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByTestId('student-self-tile')).toBeInTheDocument();
      });
    });

    it('TC-MEETING-02: toggles microphone when allowed by instructor', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Unmute Microphone/i })).toBeInTheDocument();
      });

      const micBtn = screen.getByRole('button', { name: /Unmute Microphone/i });
      fireEvent.click(micBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Mute Microphone/i })).toBeInTheDocument();
      });
    });

    it('TC-MEETING-03: disables microphone button when allow_student_mic is false', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: false,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        const micBtn = screen.getByRole('button', { name: /Unmute Microphone/i });
        expect(micBtn).toBeDisabled();
      });
    });

    it('TC-MEETING-04: toggles camera when allowed by instructor', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Turn Camera On/i })).toBeInTheDocument();
      });

      const camBtn = screen.getByRole('button', { name: /Turn Camera On/i });
      fireEvent.click(camBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Turn Camera Off/i })).toBeInTheDocument();
      });
    });

    it('TC-MEETING-05: disables camera button when allow_student_cam is false', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: false,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        const camBtn = screen.getByRole('button', { name: /Turn Camera On/i });
        expect(camBtn).toBeDisabled();
      });
    });

    it('TC-MEETING-06: toggles Raise Hand button and displays Hand Raised state', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Raise Hand/i })).toBeInTheDocument();
      });

      const handBtn = screen.getByRole('button', { name: /Raise Hand/i });
      fireEvent.click(handBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Lower Hand/i })).toBeInTheDocument();
      });
    });

    it('TC-MEETING-07: sends in-class chat message when chat is enabled', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Send a message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Send a message/i);
      fireEvent.change(input, { target: { value: 'Can you please explain renormalization?' } });

      const sendBtn = screen.getByRole('button', { name: /Send message/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText('Can you please explain renormalization?')).toBeInTheDocument();
      });
    });

    it('TC-MEETING-08: opens Leave Meeting dialog and navigates to dashboard on confirm', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Leave Meeting/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Leave Meeting/i }));

      expect(screen.getByText(/Leave Online Classroom\?/i)).toBeInTheDocument();
      const confirmLeaveBtn = screen.getByRole('button', { name: /Leave Class/i });
      fireEvent.click(confirmLeaveBtn);

      expect(mockPush).toHaveBeenCalledWith('/online-classroom');
    });

    it('TC-MEETING-09: student meeting controls do NOT include a whiteboard toggle button (controller is only for teacher)', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: false,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Leave Meeting/i })).toBeInTheDocument();
      });

      // Assert whiteboard button is not in student controls
      expect(screen.queryByRole('button', { name: /Open Whiteboard/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Close Whiteboard/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Whiteboard/i)).not.toBeInTheDocument();
    });

    it('TC-MEETING-10: when teacher broadcasts WHITEBOARD_STATE (isOpen: true), stage renders Teacher Whiteboard Presentation (View Only)', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Leave Meeting/i })).toBeInTheDocument();
      });

      // Initially meeting video grid is shown
      expect(screen.getByTestId('student-self-tile')).toBeInTheDocument();

      // Teacher opens whiteboard
      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      act(() => {
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'WHITEBOARD_STATE',
            payload: { isOpen: true },
          }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Teacher Whiteboard/i)).toBeInTheDocument();
      });

      // Teacher closes whiteboard
      act(() => {
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'WHITEBOARD_STATE',
            payload: { isOpen: false },
          }),
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('student-self-tile')).toBeInTheDocument();
      });
    });

    it('TC-MEETING-11: when teacher ends class for all (CLASS_ENDED), displays Class Session Concluded dialog and navigates to dashboard', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByTestId('student-self-tile')).toBeInTheDocument();
      });

      // Teacher ends class for all
      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      act(() => {
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'CLASS_ENDED',
            payload: { reason: 'Teacher has concluded the class session for all students' },
          }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Class Session Concluded/i)).toBeInTheDocument();
        expect(screen.getByText(/Teacher has concluded the class session for all students/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Return to Dashboard/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Return to Dashboard/i }));
      expect(mockPush).toHaveBeenCalledWith('/online-classroom');
    });

    it('TC-MEETING-12: when teacher mutes student (MUTE_STUDENT), student microphone is muted and snackbar alert is shown', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Unmute Microphone/i })).toBeInTheDocument();
      });

      // Student unmutes microphone
      fireEvent.click(screen.getByRole('button', { name: /Unmute Microphone/i }));
      expect(screen.getByRole('button', { name: /Mute Microphone/i })).toBeInTheDocument();

      // Teacher mutes student
      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      act(() => {
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'MUTE_STUDENT',
            payload: { target_id: 'Student' },
          }),
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Unmute Microphone/i })).toBeDisabled();
        expect(screen.getByText(/Your microphone was muted and locked by the meeting host/i)).toBeInTheDocument();
      });

      // Teacher allows student to speak (ALLOW_STUDENT_MIC)
      act(() => {
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'ALLOW_STUDENT_MIC',
            payload: { target_id: 'Student', allow_mic: true },
          }),
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Unmute Microphone/i })).not.toBeDisabled();
        expect(screen.getByText(/permitted you to speak/i)).toBeInTheDocument();
      });
    });

    it('TC-MEETING-13: when teacher lowers hand (HAND_RAISE_QUEUE without student), student hand raised state resets', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Raise Hand/i })).toBeInTheDocument();
      });

      // Student raises hand
      fireEvent.click(screen.getByRole('button', { name: /Raise Hand/i }));
      expect(screen.getByRole('button', { name: /Lower Hand/i })).toBeInTheDocument();

      // Teacher lowers hand (sends queue without student)
      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      act(() => {
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'HAND_RAISE_QUEUE',
            payload: { queue: [] },
          }),
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Raise Hand/i })).toBeInTheDocument();
      });
    });

    it('TC-MEETING-14: when teacher kicks student (KICKED), alerts and redirects to dashboard', async () => {
      vi.mocked(studentOnlineClassApi.getClassDetail).mockResolvedValue({
        id: 'cls-test-123',
        title: 'Quantum Field Theory',
        teacher_name: 'Dr. Richard Feynman',
        teacher_id: 't-101',
        room_name: 'room-qft',
        status: 'LIVE',
        allow_student_mic: true,
        allow_student_cam: true,
        allow_student_chat: true,
        allow_student_whiteboard: true,
        scheduled_date: '2026-11-20',
        start_time: '10:00:00',
        expected_duration_minutes: 60,
      } as any);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(<StudentLiveClassroomPage />);

      await waitFor(() => {
        expect(screen.getByTestId('student-self-tile')).toBeInTheDocument();
      });

      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      act(() => {
        ws.onmessage?.({
          data: JSON.stringify({
            type: 'KICKED',
            payload: { reason: 'Removed by instructor' },
          }),
        });
      });

      expect(alertSpy).toHaveBeenCalledWith('Removed by instructor');
      expect(mockPush).toHaveBeenCalledWith('/online-classroom');
      alertSpy.mockRestore();
    });
  });
});
