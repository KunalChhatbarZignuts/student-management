import { test, expect } from '@playwright/test';

const mockConversations = [
  {
    id: 'conv-rag-1',
    title: 'School Policy & Grading Query',
    last_message_preview: 'The minimum passing grade for all core curriculum subjects is 50%.',
    message_count: 2,
    created_at: '2026-11-24T10:00:00Z',
    updated_at: '2026-11-24T10:05:00Z',
  },
  {
    id: 'conv-rag-2',
    title: 'Mathematics Homework Help',
    last_message_preview: 'Let us solve the quadratic equation step by step...',
    message_count: 4,
    created_at: '2026-11-23T14:00:00Z',
    updated_at: '2026-11-23T14:15:00Z',
  },
];

const mockConversationDetail = {
  id: 'conv-rag-1',
  title: 'School Policy & Grading Query',
  created_at: '2026-11-24T10:00:00Z',
  messages: [
    {
      id: 'msg-u1',
      sender: 'STUDENT',
      content: 'What is the passing mark for examinations and late fee policy?',
      created_at: '2026-11-24T10:00:00Z',
    },
    {
      id: 'msg-a1',
      sender: 'ASSISTANT',
      content:
        '### Official School Information & Guidelines\n\n' +
        '- **Minimum Passing Grade**: All core subjects require at least 50% to pass.\n' +
        '- **Remediation**: Students scoring below 50% must attend revision sessions.\n' +
        '- **Fee Policy**: A grace period of 15 days is allowed before late fee penalties apply.\n\n' +
        'Source: *Academic Handbook & Evaluation Rules (Section 4.2)*',
      tools_used: ['search_school_knowledge'],
      action_links: [
        { label: 'View Academic Handbook', url: '/handbook' },
        { label: 'View Fee Schedule', url: '/fees' },
      ],
      created_at: '2026-11-24T10:00:02Z',
    },
  ],
};

const mockSuggestions = [
  {
    id: 'sug-1',
    label: 'Exam Passing Criteria',
    prompt: 'What is the minimum passing grade for my examinations?',
    category: 'school_rules',
  },
  {
    id: 'sug-2',
    label: 'Fee Payment Deadline',
    prompt: 'What is the late fee policy and deadline for term fees?',
    category: 'school_rules',
  },
  {
    id: 'sug-3',
    label: "Today's Timetable",
    prompt: 'What classes do I have scheduled for today?',
    category: 'timetable',
  },
];

const mockBriefing = {
  student_name: 'Alice',
  date_str: '2026-11-24',
  day_name: 'Tuesday',
  classes_count: 4,
  next_class_summary: 'Mathematics at 10:00 AM (Room 204)',
  nearest_exam_name: 'Midterm Examination',
  nearest_exam_days: 14,
  pending_fee_balance: 0,
  calendar_notice: 'National Science Day Exhibition next week',
  inspirational_quote: 'Consistent effort every day leads to mastery.',
  proactive_recommendation: 'Review Quadratic Equations in Mathematics before 10:00 AM',
};

test.beforeEach(async ({ page }) => {
  // Pre-seed localStorage auth state
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          accessToken: 'mock-valid-jwt-token',
          user: {
            id: 'usr-stu-rag',
            email: 'alice.johnson@school.edu',
            role: 'student',
            first_name: 'Alice',
            last_name: 'Johnson',
          },
          isAuthenticated: true,
          isBootstrapped: true,
        },
        version: 0,
      })
    );
  });

  // Mock Auth Refresh
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-valid-jwt-token',
        token_type: 'bearer',
      }),
    });
  });

  // Mock Auth Me
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'usr-stu-rag',
        email: 'alice.johnson@school.edu',
        role: 'student',
        first_name: 'Alice',
        last_name: 'Johnson',
      }),
    });
  });

  // Mock Conversations List
  await page.route('**/api/v1/student/assistant/conversations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockConversations),
      });
    } else {
      await route.continue();
    }
  });

  // Mock Active Conversation Detail
  await page.route('**/api/v1/student/assistant/conversations/conv-rag-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConversationDetail),
    });
  });

  // Mock Consolidated Insights (suggestions, briefing, daily-challenge, career)
  await page.route('**/api/v1/student/assistant/insights**', async (route) => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get('type');

    if (type === 'suggestions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuggestions),
      });
    } else if (type === 'briefing') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBriefing),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    }
  });
});

test.describe('AI Student Assistant Visual Regression Tests', () => {
  test('Scenario 1: Assistant Welcome Stage with Morning Briefing and Suggestions', async ({ page }) => {
    await page.goto('/assistant');

    // Wait for title and cards to render
    await expect(page.getByRole('main').getByRole('heading', { name: 'AI Student Assistant' })).toBeVisible();
    await expect(page.getByText('Consistent effort every day leads to mastery.')).toBeVisible();
    await expect(page.getByText('How can I help you today?')).toBeVisible();
    await expect(page.getByText('Ask about your timetable, attendance, marks, fees, or lessons.')).toBeVisible();
    await expect(page.getByText('Exam Passing Criteria')).toBeVisible();

    // Visual screenshot assertion
    await expect(page).toHaveScreenshot('assistant-welcome-stage.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });

  test('Scenario 2: Active RAG Grounded Conversation with Verified Badge & Citations', async ({ page }) => {
    await page.goto('/assistant');

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 900) {
      const historyBtn = page.getByRole('button', { name: /Conversation history/i });
      await expect(historyBtn).toBeVisible();
      await historyBtn.click();
    }

    // Wait for conversations list
    await expect(page.getByText('School Policy & Grading Query')).toBeVisible();

    // Click to select the RAG conversation
    await page.getByText('School Policy & Grading Query').click();

    // Verify RAG grounded response elements are rendered
    await expect(page.getByText(/Verified via.*search_school_knowledge/i)).toBeVisible();
    await expect(page.getByText('Official School Information & Guidelines')).toBeVisible();
    await expect(page.getByRole('button', { name: /View Academic Handbook/i })).toBeVisible();

    // Visual screenshot assertion
    await expect(page).toHaveScreenshot('assistant-rag-conversation.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });

  test('Scenario 3: Floating Assistant Widget Popup with Welcome State', async ({ page }) => {
    // Mock student profile & attendance for the dashboard shell
    await page.route('**/api/v1/student/profile**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'stu-1',
          user_id: 'usr-stu-rag',
          first_name: 'Alice',
          last_name: 'Johnson',
          admission_number: 'ADM-2026-001',
          class_name: 'Grade 10',
          section: 'A',
          roll_number: '12',
        }),
      });
    });

    await page.route('**/api/v1/academic/attendance/me**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          overall_percentage: 92.5,
          total_days: 120,
          present_days: 111,
          absent_days: 9,
        }),
      });
    });

    await page.goto('/');

    // Wait for the floating AI assistant trigger button in AppShell
    const fab = page.getByRole('button', { name: /Ask AI Student Assistant/i });
    await expect(fab).toBeVisible();

    // Click to open floating popup
    await fab.click();

    // Verify popup header and welcome message
    await expect(page.getByText('How can I help you today?')).toBeVisible();
    await expect(page.getByText('Ask about your timetable, attendance, marks, fees, or lessons.')).toBeVisible();

    // Visual screenshot assertion of the floating assistant popup
    await expect(page).toHaveScreenshot('assistant-floating-widget.png', {
      mask: [page.locator('.MuiAvatar-root')],
      animations: 'disabled',
    });
  });
});
