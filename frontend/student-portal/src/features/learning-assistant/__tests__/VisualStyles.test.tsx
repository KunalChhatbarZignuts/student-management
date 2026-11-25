import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '@/theme/theme';

import DailyStudyPlanTab from '../components/DailyStudyPlanTab';
import LearningOverviewTab from '../components/LearningOverviewTab';
import {
  DailyStudyPlan,
  LearningOverview,
  SubjectLearningDetail,
  PracticeSession,
  PracticeEvaluation,
  Recommendation,
} from '../types';

// Mock dependencies
vi.mock('../api', () => ({
  learningAssistantApi: {
    addDailyPlanItem: vi.fn().mockResolvedValue({ id: 'item-new' }),
  },
}));

const testTheme = createAppTheme('light');

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);
}

const mockSubjects: SubjectLearningDetail[] = [
  {
    subject_id: 'sub-math',
    subject_name: 'Mathematics',
    subject_code: 'MATH-101',
    official_exam_average: 54.0,
    total_chapters: 4,
    completed_chapters: 1,
    diagnostic_accuracy: 62.0,
    status: 'CRITICAL_ATTENTION',
    chapters: [
      {
        id: 'ch-algebra',
        chapter_number: 1,
        title: 'Linear Systems & Matrices',
        description: 'Systems of equations and matrix algebra.',
        order_index: 1,
        diagnostic_accuracy: 65.0,
        status: 'IN_PROGRESS',
        topics: [
          {
            id: 'top-gaussian',
            title: 'Gaussian Elimination',
            learning_objective: 'Row reduction techniques.',
            difficulty_level: 'HARD',
            estimated_minutes: 25,
            order_index: 1,
            diagnostic_accuracy: 50.0,
            is_mastered: false,
          },
        ],
      },
    ],
  },
];

const mockSession: PracticeSession = {
  session_id: 'sess-123',
  subject_name: 'Mathematics',
  chapter_title: 'Linear Systems & Matrices',
  difficulty: 'MEDIUM',
  total_questions: 3,
  questions: [
    {
      id: 'q1',
      question_number: 1,
      question_text: 'What is the determinant of a 2x2 identity matrix?',
      options: ['0', '1', '2', '-1'],
      hint: 'Recall that identity matrices have ones along the diagonal.',
    },
    {
      id: 'q2',
      question_number: 2,
      question_text: 'Which operation is NOT an elementary row operation?',
      options: ['Multiply row by scalar', 'Swap two rows', 'Square all elements', 'Add scalar multiple to another row'],
      hint: 'Think about linear combination operations.',
    },
    {
      id: 'q3',
      question_number: 3,
      question_text: 'A matrix with non-zero determinant is:',
      options: ['Singular', 'Invertible', 'Orthogonal', 'Skew'],
      hint: 'Determinant non-zero means an inverse exists.',
    },
  ],
};

const mockEvaluation: PracticeEvaluation = {
  session_id: 'sess-123',
  subject_name: 'Mathematics',
  chapter_title: 'Linear Systems & Matrices',
  total_questions: 3,
  correct_count: 2,
  score_percentage: 67,
  learning_impact: 'Good grasp of matrix operations. Review non-linear transformations.',
  results: [
    {
      question_id: 'q1',
      question_text: 'What is the determinant of a 2x2 identity matrix?',
      selected_option_index: 1,
      correct_option_index: 1,
      is_correct: true,
      explanation: 'Identity matrices have determinant equal to 1.',
      hint: 'Recall that identity matrices have ones along the diagonal.',
    },
    {
      question_id: 'q2',
      question_text: 'Which operation is NOT an elementary row operation?',
      selected_option_index: 2,
      correct_option_index: 2,
      is_correct: true,
      explanation: 'Squaring elements changes the solution set.',
      hint: 'Think about linear combination operations.',
    },
    {
      question_id: 'q3',
      question_text: 'A matrix with non-zero determinant is:',
      selected_option_index: 0,
      correct_option_index: 1,
      is_correct: false,
      explanation: 'Non-zero determinant means the matrix is non-singular and invertible.',
      hint: 'Determinant non-zero means an inverse exists.',
    },
  ],
};

const mockPlan: DailyStudyPlan = {
  id: 'plan-1',
  plan_date: '2026-11-24',
  total_planned_minutes: 50,
  completed_minutes: 25,
  status: 'PARTIALLY_COMPLETED',
  items: [
    {
      id: 'item-1',
      subject_name: 'Mathematics',
      topic_title: 'Gaussian Elimination',
      activity_type: 'WEAK_TOPIC_REVISION',
      duration_minutes: 25,
      is_completed: true,
      time_spent_seconds: 1500,
      order_index: 1,
    },
    {
      id: 'item-2',
      subject_name: 'Mathematics',
      topic_title: 'Matrix Inversion',
      activity_type: 'PRACTICE_QUIZ',
      duration_minutes: 25,
      is_completed: false,
      time_spent_seconds: 0,
      order_index: 2,
    },
  ],
};

const mockOverview: LearningOverview = {
  student_id: 'stu-1',
  student_name: 'Ada Lovelace',
  grade_name: 'Grade 11',
  section_name: 'Section A',
  academic_year: '2026-2027',
  overall_exam_average: 78.5,
  strong_subjects: [
    {
      subject_id: 'sub-phys',
      subject_name: 'Physics',
      subject_code: 'PHY-101',
      average_marks: 85.0,
      total_exams: 3,
      status: 'EXCELLING',
      trend: 'IMPROVING',
    },
  ],
  weak_subjects: [
    {
      subject_id: 'sub-math',
      subject_name: 'Mathematics',
      subject_code: 'MATH-101',
      average_marks: 54.0,
      total_exams: 3,
      status: 'CRITICAL_ATTENTION',
      trend: 'DECLINING',
    },
  ],
  recommendations_summary: {
    total_recommendations: 4,
    completed_count: 2,
    in_progress_count: 1,
    completion_percentage: 50.0,
  },
  top_recommendation: {
    id: 'rec-1',
    subject_name: 'Mathematics',
    topic_title: 'Gaussian Elimination',
    reason: 'Mathematics exam average is 54%. Review fundamental row operations.',
    priority: 'HIGH',
    estimated_minutes: 25,
    status: 'NOT_STARTED',
  },
  today_plan_summary: {
    total_minutes: 50,
    completed_minutes: 25,
    items_count: 2,
    completed_items: 1,
  },
  data_attribution: {
    exam_source: 'Official School Examination Records',
    practice_source: 'Formative AI Analytics',
    confidence: 'HIGH',
    data_availability: 'EXAMINATION_AND_DIAGNOSTIC',
  },
  historical_improvement: [
    { exam_name: 'Mid-Term 1', percentage: 76.0, grade: 'B+', date: '2026-09-10' },
    { exam_name: 'Mid-Term 2', percentage: 78.5, grade: 'A-', date: '2026-11-15' },
  ],
};

const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    subject_name: 'Mathematics',
    topic_title: 'Gaussian Elimination',
    reason: 'Core foundational concept needing reinforcement.',
    priority: 'HIGH',
    estimated_minutes: 25,
    status: 'NOT_STARTED',
    order_index: 1,
    created_at: '2026-11-24T10:00:00Z',
  },
];

describe('AI Personal Learning Assistant Visual Styles & Design Tokens', () => {
  it('TC-VIS-01: LearningOverviewTab navigates to study plan using streamlined tab index', () => {
    const handleNavigate = vi.fn();
    renderWithTheme(
      <LearningOverviewTab
        overview={mockOverview}
        onNavigateTab={handleNavigate}
      />
    );

    const planBtn = screen.getByRole('button', { name: /View Study Plan/i });
    fireEvent.click(planBtn);
    expect(handleNavigate).toHaveBeenCalledWith(1);
  });

  it('TC-VIS-02: LearningOverviewTab renders hairline cards, official average, and attribution note', () => {
    const { container } = renderWithTheme(
      <LearningOverviewTab
        overview={mockOverview}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText('AI Recommended Next Topic')).toBeDefined();
    expect(screen.getByText('Priority: HIGH')).toBeDefined();
    expect(screen.getByText('Overall Exam Average')).toBeDefined();
    expect(screen.getAllByText('78.5%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Data Attribution Boundary:/i)).toBeDefined();

    // Check no emoji slop
    expect(container.textContent).not.toMatch(/[✨🔥🚀🎉]/);
  });

  it('TC-VIS-03: DailyStudyPlanTab renders quiet focus countdown timer and calm completion banner', () => {
    renderWithTheme(
      <DailyStudyPlanTab
        plan={mockPlan}
        onUpdateItem={vi.fn()}
      />
    );

    // Routine title and checklist
    expect(screen.getByText(/Today's Personalized Study Routine/i)).toBeDefined();
    expect(screen.getByText('Gaussian Elimination')).toBeDefined();
    expect(screen.getAllByText('Matrix Inversion').length).toBeGreaterThanOrEqual(1);

    // Active digital countdown
    expect(screen.getByText(/25:00/)).toBeDefined();

    // Zero celebration emojis
    expect(screen.queryByText(/🎉/)).toBeNull();
  });

  it('TC-VIS-04: DailyStudyPlanTab renders Weekly view toggle and Preferences buttons', () => {
    renderWithTheme(
      <DailyStudyPlanTab
        plan={mockPlan}
        onUpdateItem={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Today/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Weekly/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Preferences/i })).toBeDefined();
  });

  it('TC-VIS-05: DailyStudyPlanTab handles item checkbox selection without errors', () => {
    const updateItemMock = vi.fn();
    renderWithTheme(
      <DailyStudyPlanTab
        plan={mockPlan}
        onUpdateItem={updateItemMock}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(checkboxes[0]);
    expect(updateItemMock).toHaveBeenCalled();
  });

  it('TC-VIS-06: verifies zero decorative AI emojis across all rendered components', () => {
    const { container: overviewContainer } = renderWithTheme(
      <LearningOverviewTab
        overview={mockOverview}
        onNavigateTab={vi.fn()}
      />
    );

    const { container: planContainer } = renderWithTheme(
      <DailyStudyPlanTab
        plan={mockPlan}
        onUpdateItem={vi.fn()}
      />
    );

    expect(overviewContainer.textContent).not.toMatch(/[✨🔥🚀]/);
    expect(planContainer.textContent).not.toMatch(/[✨🔥🚀]/);
  });
});
