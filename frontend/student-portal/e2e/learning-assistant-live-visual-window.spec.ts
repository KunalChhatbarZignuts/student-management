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
    total_minutes: 70,
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
    chapters: [],
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
];

const mockDailyPlan = {
  id: 'plan-1',
  plan_date: '2026-11-24',
  total_planned_minutes: 70,
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
      priority: 'HIGH',
    },
    {
      id: 'item-2',
      subject_name: 'Mathematics',
      topic_title: 'Real Numbers & Rational Exponents',
      activity_type: 'PRACTICE_QUIZ',
      duration_minutes: 25,
      is_completed: false,
      time_spent_seconds: 0,
      order_index: 2,
      priority: 'HIGH',
    },
    {
      id: 'item-3',
      subject_name: 'General Science',
      topic_title: 'Chemical Reactions & Equations',
      activity_type: 'HOMEWORK',
      duration_minutes: 25,
      is_completed: false,
      time_spent_seconds: 0,
      order_index: 3,
      priority: 'MEDIUM',
    },
  ],
};

test.describe('Academic Performance & Study Planner - Live Window Walkthrough', () => {
  test.beforeEach(async ({ page }) => {
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
          daily_target_minutes: 70,
          weekend_target_minutes: 90,
          preferred_study_time: 'EVENING',
          break_interval_minutes: 25,
          break_duration_minutes: 5,
          notifications_enabled: true,
        }),
      });
    });

    await page.route('**/api/v1/students/me/learning-assistant/mistakes', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
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

  test('Walkthrough in separate window: Academic Overview -> Study Routine -> Add Activity', async ({ page }) => {
    // 1. Navigate to Learning Assistant
    await page.goto('/learning-assistant');

    // 2. Tab 1: Academic Performance Overview
    await expect(page.getByText('Academic Performance & Study Planner')).toBeVisible();
    await expect(page.getByText('Overall Exam Average')).toBeVisible();
    await expect(page.getByText('AI Recommended Next Topic')).toBeVisible();

    // Take screenshot of Academic Overview
    await page.screenshot({
      path: '/Users/ztlab53/.gemini/antigravity/brain/b0c9d005-0c5d-4011-b6f8-c55639893f2a/visual_tests/live-window-tab1-overview.png',
      fullPage: true,
    });
    await page.waitForTimeout(1500);

    // 3. Switch to Tab 2: Study Planner & Routine
    await page.getByRole('tab', { name: /Study Planner & Routine/i }).click();
    await expect(page.getByText(/Today's Personalized Study Routine/i)).toBeVisible();
    await expect(page.getByText('Real Numbers & Rational Exponents').first()).toBeVisible();

    // Take screenshot of Study Planner Tab
    await page.screenshot({
      path: '/Users/ztlab53/.gemini/antigravity/brain/b0c9d005-0c5d-4011-b6f8-c55639893f2a/visual_tests/live-window-tab2-planner.png',
      fullPage: true,
    });
    await page.waitForTimeout(1500);

    // 4. Open "Add Activity" Modal Dialog
    const addActivityBtn = page.getByRole('button', { name: 'Add Activity' }).first();
    await expect(addActivityBtn).toBeVisible();
    await addActivityBtn.click();

    await expect(page.getByText('Add Activity to Routine')).toBeVisible();

    // Take screenshot of modal dialog
    await page.screenshot({
      path: '/Users/ztlab53/.gemini/antigravity/brain/b0c9d005-0c5d-4011-b6f8-c55639893f2a/visual_tests/live-window-tab2-add-activity-modal.png',
      fullPage: true,
    });
    await page.waitForTimeout(2000);

    // Close modal dialog
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(1000);
  });
});
