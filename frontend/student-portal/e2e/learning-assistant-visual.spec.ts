import { test, expect } from '@playwright/test';

const mockOverview = {
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

const mockSubjects = [
  {
    subject_id: 'sub-2',
    subject_name: 'Mathematics',
    subject_code: 'MATH-101',
    official_exam_average: 48.0,
    total_chapters: 4,
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
          {
            id: 'top-2',
            title: 'Radicals & Fractional Exponents',
            learning_objective: 'Simplify higher-order radicals.',
            difficulty_level: 'MEDIUM',
            estimated_minutes: 25,
            order_index: 2,
            diagnostic_accuracy: 65.0,
            is_mastered: false,
          },
        ],
      },
    ],
  },
];

const mockRecs = [
  {
    id: 'rec-1',
    subject_name: 'Mathematics',
    topic_title: 'Linear Equations in Two Variables',
    reason: 'Exam average in Mathematics is 48%. Essential foundational concept revision.',
    priority: 'HIGH',
    estimated_minutes: 25,
    status: 'NOT_STARTED',
    order_index: 1,
  },
  {
    id: 'rec-2',
    subject_name: 'General Science',
    topic_title: 'Periodic Table Trends',
    reason: 'Prepare ahead for upcoming midterm evaluation.',
    priority: 'MEDIUM',
    estimated_minutes: 20,
    status: 'IN_PROGRESS',
    order_index: 2,
  },
];

const mockDailyPlan = {
  id: 'plan-1',
  plan_date: '2026-11-24',
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
      duration_minutes: 25,
      is_completed: false,
      time_spent_seconds: 0,
      order_index: 2,
    },
  ],
};

test.beforeEach(async ({ page }) => {
  // Deterministic API routes
  await page.route('**/api/v1/students/me/learning-assistant/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOverview),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/subjects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSubjects),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/learning-path', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRecs),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/daily-plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDailyPlan),
    });
  });

  // Mock student profile/auth endpoints
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'usr-1',
        email: 'student@school.edu',
        role: 'STUDENT',
        first_name: 'Alice',
        last_name: 'Johnson',
      }),
    });
  });
});

test.describe('AI Personal Learning Assistant Visual Tests', () => {
  test('Tab 1: Learning Overview visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');

    // Wait for title and key metrics to appear
    await expect(page.getByText('AI Personal Learning Assistant')).toBeVisible();
    await expect(page.getByText('AI Recommended Next Topic')).toBeVisible();
    await expect(page.getByText('Overall Exam Average')).toBeVisible();

    // Visual screenshot comparison with dynamic element masking
    await expect(page).toHaveScreenshot('learning-overview-tab.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });

  test('Tab 2: Subject Analysis & Curriculum visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');
    await expect(page.getByText('AI Personal Learning Assistant')).toBeVisible();

    // Click Subject Analysis tab
    const tab = page.getByRole('tab', { name: /Subject Analysis/i });
    await tab.scrollIntoViewIfNeeded();
    await tab.click({ force: true });
    await expect(page.getByText('Enrolled Subjects & Curriculum Syllabus')).toBeVisible();
    await expect(page.getByText('Number Systems & Arithmetic')).toBeVisible();

    await expect(page).toHaveScreenshot('subject-analysis-tab.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });

  test('Tab 3: Personalized Learning Path visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');
    await expect(page.getByText('AI Personal Learning Assistant')).toBeVisible();

    // Click My Learning Path tab
    const tab = page.getByRole('tab', { name: /My Learning Path/i });
    await tab.scrollIntoViewIfNeeded();
    await tab.click({ force: true });
    await expect(page.getByText('Personalized Academic Learning Path')).toBeVisible();
    await expect(page.getByText('Priority: HIGH')).toBeVisible();

    await expect(page).toHaveScreenshot('learning-path-tab.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });

  test('Tab 4: Today Study Plan visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');
    await expect(page.getByText('AI Personal Learning Assistant')).toBeVisible();

    // Click Today's Study Plan tab
    const tab = page.getByRole('tab', { name: /Today's Study Plan/i });
    await tab.scrollIntoViewIfNeeded();
    await tab.click({ force: true });
    await expect(page.getByText(/Today's Personalized Study Routine/i)).toBeVisible();
    await expect(page.getByText('Linear Equations Review')).toBeVisible();

    await expect(page).toHaveScreenshot('daily-study-plan-tab.png', {
      mask: [page.locator('.MuiAvatar-root'), page.locator('.MuiChip-label:has-text("Date:")')],
      animations: 'disabled',
    });
  });

  test('Tab 5: Practice & Quizzes visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');
    await expect(page.getByText('AI Personal Learning Assistant')).toBeVisible();

    // Click Practice & Quizzes tab
    const tab = page.getByRole('tab', { name: /Practice & Quizzes/i });
    await tab.scrollIntoViewIfNeeded();
    await tab.click({ force: true });
    await expect(page.getByText('Adaptive Diagnostic Practice')).toBeVisible();
    await expect(page.getByText('Start 5-Question Quiz')).toBeVisible();

    await expect(page).toHaveScreenshot('practice-quiz-tab.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });

  test('Tab 6: AI Tutor Chat visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');
    await expect(page.getByText('AI Personal Learning Assistant')).toBeVisible();

    // Click AI Tutor Chat tab
    const tab = page.getByRole('tab', { name: /AI Tutor Chat/i });
    await tab.scrollIntoViewIfNeeded();
    await tab.click({ force: true });
    await expect(page.getByText('AI Academic Coach & Tutor')).toBeVisible();
    await expect(page.getByText(/Hello! I am your AI Personal Learning Assistant/i)).toBeVisible();

    await expect(page).toHaveScreenshot('ai-tutor-chat-tab.png', {
      mask: [page.locator('.MuiAvatar-root'), page.locator('text=/\\d{1,2}:\\d{2}/')],
      animations: 'disabled',
    });
  });
});
