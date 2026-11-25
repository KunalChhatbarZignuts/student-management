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

  await page.route('**/api/v1/students/me/learning-assistant/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        daily_target_minutes: 60,
        weekend_target_minutes: 90,
        preferred_study_time: 'EVENING',
        break_interval_minutes: 25,
        break_duration_minutes: 5,
        notifications_enabled: true,
      }),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/weekly-plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        student_id: 'stu-123',
        week_start_date: '2026-11-23',
        week_end_date: '2026-11-29',
        total_target_minutes: 420,
        completed_minutes: 120,
        days: [
          {
            plan_date: '2026-11-24',
            day_name: 'Tuesday',
            is_today: true,
            total_minutes: 45,
            completed_minutes: 20,
            items_count: 3,
            completed_count: 1,
            items: mockDailyPlan.items,
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/mistakes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/mastery', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_topics: 10,
        mastered_count: 4,
        in_progress_count: 3,
        needs_practice_count: 3,
        topics: [],
      }),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/daily-routine**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDailyPlan),
    });
  });

  await page.route('**/api/v1/students/me/learning-assistant/study-sessions/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    });
  });

  await page.route('**/api/v1/auth/refresh**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'fake', refresh_token: 'fake' }),
    });
  });

  // Mock student profile/auth endpoints
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'fake-jwt-token-for-visual-testing');
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'usr-1',
        email: 'student@school.edu',
        role: 'student',
        first_name: 'Alice',
        last_name: 'Johnson',
      }),
    });
  });

  await page.route('**/api/v1/student/profile**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'stu-1',
        user_id: 'usr-1',
        first_name: 'Alice',
        last_name: 'Johnson',
        admission_number: 'ADM-2026-001',
        class_name: 'Grade 10',
        section: 'A',
        roll_number: '12',
      }),
    });
  });
});

test.describe('Academic Performance & Study Planner Visual Tests', () => {
  test('Tab 1: Academic Overview visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');

    // Wait for title and key metrics to appear
    await expect(page.getByText('Academic Performance & Study Planner')).toBeVisible();
    await expect(page.getByText('AI Recommended Next Topic')).toBeVisible();
    await expect(page.getByText('Overall Exam Average')).toBeVisible();

    // Visual screenshot comparison with dynamic element masking
    await expect(page).toHaveScreenshot('learning-overview-tab.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });

  test('Tab 2: Study Planner & Routine visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');
    await expect(page.getByText('Academic Performance & Study Planner')).toBeVisible();

    // Click Study Planner & Routine tab
    await page.getByRole('tab', { name: /Study Planner & Routine/i }).dispatchEvent('click');
    await expect(page.getByText(/Today's Personalized Study Routine/i)).toBeVisible();
    await expect(page.getByText('Linear Equations Review').first()).toBeVisible();

    await expect(page).toHaveScreenshot('daily-study-plan-tab.png', {
      mask: [page.locator('.MuiAvatar-root'), page.locator('.MuiChip-label:has-text("Date:")')],
      animations: 'disabled',
    });
  });

  test('Tab 2: Add Activity Dialog visual baseline', async ({ page }) => {
    await page.goto('/learning-assistant');
    await page.getByRole('tab', { name: /Study Planner & Routine/i }).click();
    await expect(page.getByText(/Today's Personalized Study Routine/i)).toBeVisible();
    await expect(page.getByText('Linear Equations Review').first()).toBeVisible();

    const addBtn = page.getByRole('button', { name: 'Add Activity' }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.getByText('Add Activity to Routine')).toBeVisible();

    await expect(page).toHaveScreenshot('add-activity-dialog.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });
});
