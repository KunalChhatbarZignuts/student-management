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
    expect(screen.getByText('AI Personal Learning Assistant')).toBeDefined();

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

  it('TC-FE-03: switches to Subject Analysis tab and displays curriculum chapters', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Subject Analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enrolled Subjects & Curriculum Syllabus/i)).toBeDefined();
      expect(screen.getByText(/Number Systems & Arithmetic/i)).toBeDefined();
      expect(screen.getByText(/Real Numbers & Rational Exponents/i)).toBeDefined();
    });
  });

  it('TC-FE-04: switches to My Learning Path tab and displays recommendations', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /My Learning Path/i }));

    await waitFor(() => {
      expect(screen.getByText(/Personalized Academic Learning Path/i)).toBeDefined();
      expect(screen.getByText(/Priority: HIGH/i)).toBeDefined();
    });
  });

  it('TC-FE-05: switches to Today\'s Study Plan tab and displays activities checklist', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Today's Study Plan/i }));

    await waitFor(() => {
      expect(screen.getByText(/Today's Personalized Study Routine/i)).toBeDefined();
      expect(screen.getByText('Linear Equations Review')).toBeDefined();
    });
  });

  it('TC-FE-06: switches to Practice & Quizzes tab and shows adaptive quiz launcher', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Practice & Quizzes/i }));

    await waitFor(() => {
      expect(screen.getByText(/Adaptive Diagnostic Practice/i)).toBeDefined();
      expect(screen.getByText('Start 5-Question Quiz')).toBeDefined();
    });
  });

  it('TC-FE-07: switches to AI Tutor Chat tab and displays message feed', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /AI Tutor Chat/i }));

    await waitFor(() => {
      expect(screen.getByText('AI Academic Coach & Tutor')).toBeDefined();
      expect(screen.getByText(/Why is my Math score low and how do I improve\?/i)).toBeDefined();
    });
  });

  it('TC-FE-08: adds curriculum topic to daily study plan from Subject Analysis tab', async () => {
    renderWithProviders(<AILearningAssistantPage />);

    await waitFor(() => {
      expect(screen.getAllByText('74.5%').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByRole('tab', { name: /Subject Analysis/i }));

    await waitFor(() => {
      expect(screen.getByText(/Number Systems & Arithmetic/i)).toBeDefined();
    });

    const addBtns = screen.getAllByRole('button', { name: /Add to Plan/i });
    expect(addBtns.length).toBeGreaterThan(0);

    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(learningAssistantApi.addDailyPlanItem).toHaveBeenCalled();
      expect(screen.getByText(/Added to Plan/i)).toBeDefined();
    });
  });
});
