import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DailyStudyPlanTab from '../components/DailyStudyPlanTab';
import { DailyStudyPlan, StudentStudySettings } from '../types';
import { learningAssistantApi } from '../api';

// Mock API
vi.mock('../api', () => ({
  learningAssistantApi: {
    getDailyRoutine: vi.fn(),
    createRoutineActivity: vi.fn(),
    updateRoutineActivity: vi.fn(),
    updateActivityStatus: vi.fn(),
    deleteRoutineActivity: vi.fn(),
    reorderRoutineActivities: vi.fn(),
    duplicateRoutine: vi.fn(),
    updateRoutineMetadata: vi.fn(),
    getActiveStudySession: vi.fn().mockResolvedValue(null),
    startStudySession: vi.fn(),
    pauseStudySession: vi.fn(),
    resumeStudySession: vi.fn(),
    finishStudySession: vi.fn(),
    cancelStudySession: vi.fn(),
  },
}));

describe('DailyStudyPlanTab Component Tests', () => {
  const mockPlan: DailyStudyPlan = {
    id: 'plan-1',
    plan_date: '2026-11-24',
    total_planned_minutes: 70,
    completed_minutes: 25,
    remaining_minutes: 45,
    completion_percentage: 35.7,
    status: 'PARTIALLY_COMPLETED',
    total_activities_count: 2,
    completed_activities_count: 1,
    pending_activities_count: 1,
    items: [
      {
        id: 'item-1',
        subject_name: 'Mathematics',
        topic_title: 'Real Numbers & Rational Exponents',
        title: 'Exponents Practice Quiz',
        description: 'Complete 15 questions from chapter 1',
        activity_type: 'PRACTICE_QUIZ',
        duration_minutes: 25,
        is_completed: false,
        is_custom: true,
        priority: 'HIGH',
        status: 'PENDING',
        time_spent_seconds: 0,
        order_index: 0,
        start_time: '18:00',
        end_time: '18:25',
      },
      {
        id: 'item-2',
        subject_name: 'Science',
        topic_title: 'Newtonian Mechanics',
        title: 'Newton Laws Revision',
        activity_type: 'REVISION',
        duration_minutes: 25,
        is_completed: true,
        is_custom: false,
        priority: 'MEDIUM',
        status: 'COMPLETED',
        time_spent_seconds: 1500,
        order_index: 1,
      },
    ],
  };

  const mockSettings: StudentStudySettings = {
    student_id: 'stu-1',
    weekday_daily_minutes: 70,
    weekend_daily_minutes: 90,
    preferred_study_time: 'EVENING',
    break_interval_minutes: 10,
    notifications_enabled: true,
  };

  const mockOnUpdateItem = vi.fn().mockResolvedValue(undefined);
  const mockOnRescheduleItem = vi.fn().mockResolvedValue(undefined);
  const mockOnUpdateSettings = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-ROUTINE-01: renders daily routine overview and checklist correctly', async () => {
    render(
      <DailyStudyPlanTab
        plan={mockPlan}
        settings={mockSettings}
        onUpdateItem={mockOnUpdateItem}
        onRescheduleItem={mockOnRescheduleItem}
        onUpdateSettings={mockOnUpdateSettings}
      />
    );

    expect(screen.getByText(/Daily Routine Overview/i)).toBeInTheDocument();
    expect(screen.getAllByText(/70 mins/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/25 mins/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/45 mins/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Exponents Practice Quiz/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Newton Laws Revision/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HIGH/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Custom/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/AI Recommended/i).length).toBeGreaterThanOrEqual(1);
  });

  it('TC-ROUTINE-02: opens Add Activity dialog and submits a new activity', async () => {
    vi.mocked(learningAssistantApi.createRoutineActivity).mockResolvedValueOnce({
      ...mockPlan,
      items: [
        ...mockPlan.items,
        {
          id: 'item-3',
          subject_name: 'English',
          topic_title: 'Grammar Review',
          activity_type: 'READING',
          duration_minutes: 20,
          is_completed: false,
          is_custom: true,
          priority: 'LOW',
          status: 'PENDING',
          time_spent_seconds: 0,
          order_index: 2,
        },
      ],
    });

    render(
      <DailyStudyPlanTab
        plan={mockPlan}
        settings={mockSettings}
        onUpdateItem={mockOnUpdateItem}
      />
    );

    // Click Add Activity
    const addBtns = screen.getAllByRole('button', { name: /Add Activity/i });
    fireEvent.click(addBtns[0]);

    expect(screen.getByText(/Add Activity to Routine/i)).toBeInTheDocument();

    // Fill form
    const topicInput = screen.getByPlaceholderText(/Real Numbers & Rational Exponents/i);
    fireEvent.change(topicInput, { target: { value: 'Grammar Review' } });

    const submitBtn = screen.getByRole('button', { name: /^Add Activity$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(learningAssistantApi.createRoutineActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_name: 'Mathematics',
          topic_title: 'Grammar Review',
        })
      );
    });
  });

  it('TC-ROUTINE-03: starts server focus session when clicking Start Focus', async () => {
    vi.mocked(learningAssistantApi.startStudySession).mockResolvedValueOnce({
      id: 'session-101',
      student_id: 'stu-1',
      plan_item_id: 'item-1',
      status: 'ACTIVE',
      start_time: new Date().toISOString(),
      end_time: null,
      paused_at: null,
      accumulated_seconds: 0,
      target_duration_seconds: 1500,
      notes: null,
      activity_title: 'Exponents Practice Quiz',
      subject_name: 'Mathematics',
      elapsed_seconds: 0,
      remaining_seconds: 1500,
    });
    vi.mocked(learningAssistantApi.getDailyRoutine).mockResolvedValueOnce(mockPlan);

    render(
      <DailyStudyPlanTab
        plan={mockPlan}
        settings={mockSettings}
        onUpdateItem={mockOnUpdateItem}
      />
    );

    const startBtn = screen.getAllByRole('button', { name: /Start Focus/i })[0];
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(learningAssistantApi.startStudySession).toHaveBeenCalledWith({
        plan_item_id: 'item-1',
        target_duration_seconds: 1500,
      });
    });

    // Check timer display rendered
    await waitFor(() => {
      expect(screen.getByText(/Timer Running/i)).toBeInTheDocument();
      expect(screen.getByText(/25:00/i)).toBeInTheDocument();
    });
  });

  it('TC-ROUTINE-04: finishes study session explicitly and does not auto-complete on timer zero', async () => {
    vi.mocked(learningAssistantApi.getActiveStudySession).mockResolvedValueOnce({
      id: 'session-101',
      student_id: 'stu-1',
      plan_item_id: 'item-1',
      status: 'ACTIVE',
      start_time: new Date().toISOString(),
      end_time: null,
      paused_at: null,
      accumulated_seconds: 1500,
      target_duration_seconds: 1500,
      notes: null,
      activity_title: 'Exponents Practice Quiz',
      subject_name: 'Mathematics',
      elapsed_seconds: 1500,
      remaining_seconds: 0,
    });
    vi.mocked(learningAssistantApi.finishStudySession).mockResolvedValueOnce({
      id: 'session-101',
      student_id: 'stu-1',
      plan_item_id: 'item-1',
      status: 'COMPLETED',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      paused_at: null,
      accumulated_seconds: 1500,
      target_duration_seconds: 1500,
      notes: 'Understood negative exponents',
      elapsed_seconds: 1500,
      remaining_seconds: 0,
    });
    vi.mocked(learningAssistantApi.getDailyRoutine).mockResolvedValueOnce(mockPlan);

    render(
      <DailyStudyPlanTab
        plan={mockPlan}
        settings={mockSettings}
        onUpdateItem={mockOnUpdateItem}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Target duration reached/i)).toBeInTheDocument();
    });

    // Student clicks Finish Session
    const finishBtn = screen.getByRole('button', { name: /Finish Session/i });
    fireEvent.click(finishBtn);

    expect(screen.getByText(/Finish Study Session/i)).toBeInTheDocument();

    const saveFinishBtn = screen.getByRole('button', { name: /Save & Finish/i });
    fireEvent.click(saveFinishBtn);

    await waitFor(() => {
      expect(learningAssistantApi.finishStudySession).toHaveBeenCalledWith(
        'session-101',
        expect.objectContaining({
          mark_activity_completed: true,
        })
      );
    });
  });

  it('TC-ROUTINE-05: toggles checklist item completion with server sync', async () => {
    vi.mocked(learningAssistantApi.updateActivityStatus).mockResolvedValueOnce({
      ...mockPlan,
      items: [
        { ...mockPlan.items[0], is_completed: true, status: 'COMPLETED' },
        mockPlan.items[1],
      ],
    });

    render(
      <DailyStudyPlanTab
        plan={mockPlan}
        settings={mockSettings}
        onUpdateItem={mockOnUpdateItem}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // First item checkbox is unchecked
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(learningAssistantApi.updateActivityStatus).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          status: 'COMPLETED',
        })
      );
    });
  });
});
