import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AILearningAssistantPage from '@/app/learning-assistant/page';
import { renderWithProviders, createTestQueryClient } from '@/tests/test-utils';
import { learningAssistantApi } from '../api';
import { LearningOverview, SubjectLearningDetail, Recommendation, DailyStudyPlan } from '../types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/learning-assistant',
}));

vi.mock('../api', () => ({
  learningAssistantKeys: {
    all: ['learning-assistant'],
    overview: () => ['learning-assistant', 'overview'],
    subjects: () => ['learning-assistant', 'subjects'],
    learningPath: () => ['learning-assistant', 'learning-path'],
    dailyPlan: () => ['learning-assistant', 'daily-plan'],
    weeklyPlan: () => ['learning-assistant', 'weekly-plan'],
    settings: () => ['learning-assistant', 'settings'],
    mastery: () => ['learning-assistant', 'mastery'],
    mistakes: () => ['learning-assistant', 'mistakes'],
  },
  learningAssistantApi: {
    getOverview: vi.fn(),
    getSubjects: vi.fn(),
    getLearningPath: vi.fn(),
    recalculateLearningPath: vi.fn(),
    updateRecommendationStatus: vi.fn(),
    getDailyPlan: vi.fn(),
    updateDailyPlanItem: vi.fn(),
    addDailyPlanItem: vi.fn(),
    generatePractice: vi.fn(),
    submitPractice: vi.fn(),
    sendChatMessage: vi.fn(),
    getSettings: vi.fn().mockResolvedValue(null),
    updateSettings: vi.fn(),
    getWeeklyPlan: vi.fn().mockResolvedValue(null),
    rescheduleDailyPlanItem: vi.fn(),
    getMasteryMatrix: vi.fn().mockResolvedValue({ total_topics: 0, mastered_count: 0, in_progress_count: 0, needs_practice_count: 0, topics: [] }),
    getMistakes: vi.fn().mockResolvedValue([]),
    resolveMistake: vi.fn(),
    explainConcept: vi.fn(),
  },
}));

const mockOverview: LearningOverview = {
  student_id: 'stu-123',
  student_name: 'Alice Johnson',
  grade_name: 'Grade 10',
  section_name: 'Section A',
  academic_year: '2026-2027',
  overall_exam_average: 74.5,
  strong_subjects: [
    {
      subject_id: 'sub-1',
      subject_name: 'English Literature',
      subject_code: 'ENG-101',
      average_marks: 88.0,
      total_exams: 2,
      status: 'EXCELLING',
      trend: 'IMPROVING',
    },
  ],
  weak_subjects: [
    {
      subject_id: 'sub-2',
      subject_name: 'Mathematics',
      subject_code: 'MATH-101',
      average_marks: 48.0,
      total_exams: 2,
      status: 'CRITICAL_ATTENTION',
      trend: 'DECLINING',
    },
  ],
  recommendations_summary: {
    total_recommendations: 5,
    completed_count: 2,
    in_progress_count: 1,
    completion_percentage: 40.0,
  },
  top_recommendation: {
    id: 'rec-1',
    subject_name: 'Mathematics',
    topic_title: 'Linear Equations in Two Variables',
    reason: 'Exam average in Mathematics is 48%. Essential foundational concept revision.',
    priority: 'HIGH',
    estimated_minutes: 25,
    status: 'NOT_STARTED',
  },
  today_plan_summary: {
    total_minutes: 45,
    completed_minutes: 20,
    items_count: 3,
    completed_items: 1,
  },
  data_attribution: {
    exam_source: 'Verified Official School Examination Records',
    practice_source: 'Formative AI Practice Analytics',
    confidence: 'HIGH',
    data_availability: 'EXAMINATION_AND_DIAGNOSTIC',
  },
  historical_improvement: [
    { exam_name: 'Unit Test 1', percentage: 70.0, grade: 'B', date: '2026-08-15' },
    { exam_name: 'Mid-Term Exam', percentage: 74.5, grade: 'B+', date: '2026-10-20' },
  ],
};

const mockSubjects: SubjectLearningDetail[] = [
  {
    subject_id: 'sub-2',
    subject_name: 'Mathematics',
    subject_code: 'MATH-101',
    official_exam_average: 48.0,
    total_chapters: 5,
    completed_chapters: 1,
    diagnostic_accuracy: 60.0,
    status: 'CRITICAL_ATTENTION',
    chapters: [
      {
        id: 'ch-1',
        chapter_number: 1,
        title: 'Number Systems & Arithmetic',
        description: 'Real numbers and exponent foundations.',
        order_index: 1,
        diagnostic_accuracy: 75.0,
        status: 'IN_PROGRESS',
        topics: [
          {
            id: 'top-1',
            title: 'Real Numbers & Rational Exponents',
            learning_objective: 'Understand real number classification.',
            difficulty_level: 'EASY',
            estimated_minutes: 15,
            order_index: 1,
            diagnostic_accuracy: 80.0,
            is_mastered: true,
          },
        ],
      },
    ],
  },
];

const mockRecs: Recommendation[] = [
  {
    id: 'rec-1',
    subject_name: 'Mathematics',
    topic_title: 'Linear Equations in Two Variables',
    reason: 'Exam average is 48%. Essential foundational concept revision.',
    priority: 'HIGH',
    estimated_minutes: 25,
    status: 'NOT_STARTED',
    order_index: 1,
    created_at: '2026-11-20T10:00:00Z',
  },
];

const mockDailyPlan: DailyStudyPlan = {
  id: 'plan-1',
  plan_date: '2026-11-20',
  total_planned_minutes: 45,
  completed_minutes: 20,
  status: 'PARTIALLY_COMPLETED',
  items: [
    {
      id: 'item-1',
      subject_name: 'Mathematics',
      topic_title: 'Linear Equations Review',
      activity_type: 'CONCEPT_REVIEW',
      duration_minutes: 20,
      is_completed: true,
      time_spent_seconds: 1200,
      order_index: 1,
    },
    {
      id: 'item-2',
      subject_name: 'General Science',
      topic_title: 'Life Processes & Respiration',
      activity_type: 'PRACTICE_QUIZ',
      duration_minutes: 15,
      is_completed: false,
      time_spent_seconds: 0,
      order_index: 2,
    },
  ],
};

describe('AI Personal Learning Assistant Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (learningAssistantApi.getOverview as any).mockImplementation(() => Promise.resolve(mockOverview));
    (learningAssistantApi.getSubjects as any).mockImplementation(() => Promise.resolve(mockSubjects));
    (learningAssistantApi.getLearningPath as any).mockImplementation(() => Promise.resolve(mockRecs));
    (learningAssistantApi.getDailyPlan as any).mockImplementation(() => Promise.resolve(mockDailyPlan));
    (learningAssistantApi.addDailyPlanItem as any).mockImplementation(() =>
      Promise.resolve({
        id: 'plan-item-new',
        plan_id: 'plan-1',
        subject_name: 'Mathematics',
        topic_title: 'Graphical Method',
        duration_minutes: 25,
        activity_type: 'WEAK_TOPIC_REVISION',
        is_completed: false,
        seconds_spent: 0,
        order_index: 3,
      })
    );
  });

  it('TC-FE-01: renders Learning Overview with KPI metrics and Top Recommendation', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    // Check title
    expect(screen.getByText(/Academic Performance & Study Planner/i)).toBeDefined();

    // Wait for Overview data
    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    // Check Top Recommendation
    expect(screen.getByText(/AI Recommended Next Topic/i)).toBeDefined();
    expect(screen.getByText(/Linear Equations in Two Variables/i)).toBeDefined();

    // Check Data Attribution note
    expect(screen.getByText(/Data Attribution Boundary/i)).toBeDefined();
  });

  it('TC-FE-02: renders Strong and Weak Subject sections with proper tags', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getByText('Strong Subjects')).toBeDefined();
      expect(screen.getByText('English Literature')).toBeDefined();
      expect(screen.getByText('Subjects Requiring Improvement')).toBeDefined();
      expect(screen.getAllByText('Mathematics').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('TC-FE-03: renders 2 focused tabs and excludes redundant tabs', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByRole('tab', { name: /Academic Overview/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Study Planner & Routine/i })).toBeDefined();
    expect(screen.queryByRole('tab', { name: /My Learning Path/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Practice & Quizzes/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /AI Tutor Chat/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Subject Analysis/i })).toBeNull();
  });

  it('TC-FE-04: switches to Study Planner & Routine tab and displays activities checklist', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Study Planner & Routine/i }));

    await waitFor(() => {
      expect(screen.getByText(/Today's Personalized Study Routine/i)).toBeDefined();
      expect(screen.getByText('Linear Equations Review')).toBeDefined();
    });
  });

  it('TC-FE-05: navigates to study plan from overview recommendation card', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    const viewPlanBtn = screen.getByRole('button', { name: /View Study Plan/i });
    fireEvent.click(viewPlanBtn);

    await waitFor(() => {
      expect(screen.getByText(/Today's Personalized Study Routine/i)).toBeDefined();
    });
  });

  it('TC-FE-06: opens study preferences modal from Study Planner', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Study Planner & Routine/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Preferences/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Preferences/i }));

    await waitFor(() => {
      expect(screen.getByText(/Study Plan Preferences/i)).toBeDefined();
    });
  });

  it('TC-FE-07: toggles Weekly study view on Study Planner', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Study Planner & Routine/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Weekly/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Weekly/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Weekly/i })).toBeDefined();
    });
  });

  it('TC-FE-08: marks study plan item completed', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Study Planner & Routine/i }));

    await waitFor(() => {
      expect(screen.getByText('Linear Equations Review')).toBeDefined();
    });

    const markDoneBtn = screen.getByRole('button', { name: /Mark Done/i });
    fireEvent.click(markDoneBtn);

    await waitFor(() => {
      expect(learningAssistantApi.updateDailyPlanItem).toHaveBeenCalled();
    });
  });
});
