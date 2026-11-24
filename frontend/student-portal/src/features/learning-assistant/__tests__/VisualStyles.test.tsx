import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '@/theme/theme';

import SubjectAnalysisTab from '../components/SubjectAnalysisTab';
import PracticeQuizTab from '../components/PracticeQuizTab';
import DailyStudyPlanTab from '../components/DailyStudyPlanTab';
import LearningOverviewTab from '../components/LearningOverviewTab';
import LearningPathTab from '../components/LearningPathTab';
import AITutorChatTab from '../components/AITutorChatTab';
import {
  SubjectLearningDetail,
  PracticeSession,
  PracticeEvaluation,
  DailyStudyPlan,
  LearningOverview,
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
      question_text: 'What is the determinant of a 2x2 identity matrix?',
      options: ['0', '1', '2', '-1'],
      hint: 'Recall that identity matrices have ones along the diagonal.',
    },
    {
      id: 'q2',
      question_text: 'Which operation is NOT an elementary row operation?',
      options: ['Multiply row by scalar', 'Swap two rows', 'Square all elements', 'Add scalar multiple to another row'],
    },
    {
      id: 'q3',
      question_text: 'A matrix with non-zero determinant is:',
      options: ['Singular', 'Invertible', 'Orthogonal', 'Skew'],
    },
  ],
};

const mockEvaluation: PracticeEvaluation = {
  session_id: 'sess-123',
  chapter_id: 'ch-algebra',
  chapter_title: 'Linear Systems & Matrices',
  total_questions: 3,
  correct_count: 2,
  score_percentage: 67,
  difficulty_level: 'MEDIUM',
  learning_impact: 'Good grasp of matrix operations. Review non-linear transformations.',
  results: [
    {
      question_id: 'q1',
      question_text: 'What is the determinant of a 2x2 identity matrix?',
      selected_option_index: 1,
      correct_option_index: 1,
      is_correct: true,
      explanation: 'Identity matrices have determinant equal to 1.',
    },
    {
      question_id: 'q2',
      question_text: 'Which operation is NOT an elementary row operation?',
      selected_option_index: 2,
      correct_option_index: 2,
      is_correct: true,
      explanation: 'Squaring elements changes the solution set.',
    },
    {
      question_id: 'q3',
      question_text: 'A matrix with non-zero determinant is:',
      selected_option_index: 0,
      correct_option_index: 1,
      is_correct: false,
      explanation: 'Non-zero determinant means the matrix is non-singular and invertible.',
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
  },
];

describe('AI Personal Learning Assistant Visual Styles & Design Tokens', () => {
  it('TC-VIS-01: SubjectAnalysisTab renders quiet hairline accordions and 1-click Add to Plan button', async () => {
    renderWithTheme(
      <SubjectAnalysisTab
        subjects={mockSubjects}
        onStartChapterPractice={vi.fn()}
      />
    );

    // Subject and chapter titles
    expect(screen.getByText('Mathematics')).toBeDefined();
    expect(screen.getByText('Chapter 1: Linear Systems & Matrices')).toBeDefined();

    // 1-Click Add to Plan button
    const addBtn = screen.getByRole('button', { name: /Add to Plan/i });
    expect(addBtn).toBeDefined();

    // Zero decorative emoji check
    expect(screen.queryByText(/✨|🔥|🎉|🚀/)).toBeNull();

    // Click Add to Plan and verify transition
    fireEvent.click(addBtn);
    expect(await screen.findByText(/Added to Plan/i)).toBeDefined();
  });

  it('TC-VIS-02: PracticeQuizTab active session renders digital timer badge and question jump pills', () => {
    renderWithTheme(
      <PracticeQuizTab
        subjects={mockSubjects}
        activeSession={mockSession}
        evaluation={null}
        isLoading={false}
        onGenerateQuiz={vi.fn()}
        onSubmitQuiz={vi.fn()}
        onResetQuiz={vi.fn()}
      />
    );

    // Timer display exists in MM:SS format
    expect(screen.getByText(/00:00/)).toBeDefined();

    // Jump pills Q1, Q2, Q3 exist
    expect(screen.getByRole('button', { name: 'Q1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Q2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Q3' })).toBeDefined();

    // Navigation buttons
    expect(screen.getByRole('button', { name: /Next Question/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Previous/i })).toBeDefined();
  });

  it('TC-VIS-03: PracticeQuizTab evaluation review renders quiet hairline card without gradients', () => {
    renderWithTheme(
      <PracticeQuizTab
        subjects={mockSubjects}
        activeSession={null}
        evaluation={mockEvaluation}
        isLoading={false}
        onGenerateQuiz={vi.fn()}
        onSubmitQuiz={vi.fn()}
        onResetQuiz={vi.fn()}
      />
    );

    // Evaluation summary and score
    expect(screen.getByText('67% Score')).toBeDefined();
    expect(screen.getByText(/Detailed Step-by-Step Question Review/i)).toBeDefined();

    // Reset button
    expect(screen.getByRole('button', { name: /Take Another Quiz/i })).toBeDefined();

    // Zero decorative emojis
    expect(screen.queryByText(/✨|🎉|🔥/)).toBeNull();
  });

  it('TC-VIS-04: DailyStudyPlanTab renders quiet focus countdown timer and calm completion banner', () => {
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

  it('TC-VIS-05A: LearningOverviewTab renders hairline cards and priority tags', () => {
    const { container: overviewContainer } = renderWithTheme(
      <LearningOverviewTab
        overview={mockOverview}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText('AI Recommended Next Topic')).toBeDefined();
    expect(screen.getByText('Priority: HIGH')).toBeDefined();
    expect(screen.getByText('Overall Exam Average')).toBeDefined();
    expect(screen.getByText('Data Attribution Boundary:')).toBeDefined();

    // Check no emoji slop in overview
    expect(overviewContainer.textContent).not.toMatch(/[✨🔥🚀🎉]/);
  });

  it('TC-VIS-05B: LearningPathTab renders hairline cards and priority tags', () => {
    const { container: pathContainer } = renderWithTheme(
      <LearningPathTab
        recommendations={mockRecommendations}
        onUpdateStatus={vi.fn()}
        onRecalculate={vi.fn()}
        onStartPractice={vi.fn()}
      />
    );

    expect(screen.getByText('Personalized Academic Learning Path')).toBeDefined();
    expect(screen.getByRole('button', { name: /^Practice$/i })).toBeDefined();
    expect(pathContainer.textContent).not.toMatch(/[✨🔥🚀🎉]/);
  });

  it('TC-VIS-06: AITutorChatTab renders academic coaching header and clean chat input', () => {
    renderWithTheme(
      <AITutorChatTab
        onSendMessage={vi.fn()}
        onExecuteAction={vi.fn()}
      />
    );

    expect(screen.getByText('AI Academic Coach & Tutor')).toBeDefined();
    expect(screen.getByPlaceholderText(/Ask a question about your performance/i)).toBeDefined();
    expect(screen.getByText(/Why is my Math score low and how do I improve\?/i)).toBeDefined();
  });
});
