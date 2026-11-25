import { test, expect } from '@playwright/test';

// ---------------------------------------------------------
// Shared Mock Data for Deterministic Visual Regression Tests
// ---------------------------------------------------------

const mockTeacherContext = {
  is_admin: false,
  sections: [
    { id: 'sec-10a', name: 'Section A', grade_id: 'cls-10', grade_name: 'Grade 10' },
    { id: 'sec-10b', name: 'Section B', grade_id: 'cls-10', grade_name: 'Grade 10' },
  ],
  subjects: [
    { id: 'sub-math', name: 'Mathematics', code: 'MATH-10' },
    { id: 'sub-cs', name: 'Computer Science', code: 'CS-10' },
  ],
  students: [
    {
      id: 'stu-ada',
      name: 'Ada Lovelace',
      section_id: 'sec-10a',
      student_code: 'STU-1001',
      class_name: 'Grade 10',
      section_name: 'Section A',
    },
    {
      id: 'stu-charles',
      name: 'Charles Babbage',
      section_id: 'sec-10a',
      student_code: 'STU-1002',
      class_name: 'Grade 10',
      section_name: 'Section A',
    },
  ],
};

const mockTeacherEntries = [
  {
    id: 'entry-01',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Real Numbers & Polynomials — Exercise 2.1',
    description: 'We covered real numbers and polynomials today in class. Homework: Complete questions 1 to 10 from Chapter 2.',
    entry_type: 'HOMEWORK',
    category: 'ACADEMIC',
    entry_date: '2026-11-24',
    due_date: '2026-11-25',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: true,
    is_conversation_allowed: true,
    status: 'PUBLISHED',
    published_at: '2026-11-24T09:30:00Z',
    grade_id: 'cls-10',
    grade_name: 'Grade 10',
    section_id: 'sec-10a',
    section_name: 'Section A',
    subject_id: 'sub-math',
    subject_name: 'Mathematics',
    attachments: [{ name: 'Exercises_2_1.pdf', url: '/files/ex2.1.pdf', file_type: 'application/pdf', file_size: 1048576 }],
    created_at: '2026-11-24T09:00:00Z',
    updated_at: '2026-11-24T09:30:00Z',
    total_recipients: 25,
    read_count: 18,
    acknowledged_count: 12,
  },
  {
    id: 'entry-02',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Active Participation in Analytical Logic Seminar',
    description: 'Demonstrated outstanding reasoning and logic during the algorithm design workshop.',
    entry_type: 'POSITIVE_FEEDBACK',
    category: 'BEHAVIOUR',
    entry_date: '2026-11-24',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: false,
    is_conversation_allowed: true,
    status: 'PUBLISHED',
    published_at: '2026-11-24T11:00:00Z',
    grade_id: 'cls-10',
    grade_name: 'Grade 10',
    section_id: 'sec-10a',
    section_name: 'Section A',
    subject_id: 'sub-cs',
    subject_name: 'Computer Science',
    attachments: [],
    created_at: '2026-11-24T10:45:00Z',
    updated_at: '2026-11-24T11:00:00Z',
    total_recipients: 1,
    read_count: 1,
    acknowledged_count: 0,
  },
  {
    id: 'entry-03',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Midterm Science Fair Project Submissions Due Friday',
    description: 'All students are reminded to finalize project abstracts and apparatus requirements with the department lab assistant.',
    entry_type: 'NOTICE',
    category: 'GENERAL',
    entry_date: '2026-11-24',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: false,
    is_conversation_allowed: false,
    status: 'PUBLISHED',
    published_at: '2026-11-24T08:00:00Z',
    grade_id: 'cls-10',
    grade_name: 'Grade 10',
    section_id: 'sec-10a',
    section_name: 'Section A',
    attachments: [],
    created_at: '2026-11-24T07:50:00Z',
    updated_at: '2026-11-24T08:00:00Z',
    total_recipients: 25,
    read_count: 22,
    acknowledged_count: 0,
  },
];

const mockStudentEntries = [
  {
    id: 'entry-01',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Real Numbers & Polynomials — Exercise 2.1',
    description: 'We covered real numbers and polynomials today in class. Homework: Complete questions 1 to 10 from Chapter 2.',
    entry_type: 'HOMEWORK',
    category: 'ACADEMIC',
    entry_date: '2026-11-24',
    due_date: '2026-11-25',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: true,
    is_conversation_allowed: true,
    status: 'PUBLISHED',
    published_at: '2026-11-24T09:30:00Z',
    grade_name: 'Grade 10',
    section_name: 'Section A',
    subject_name: 'Mathematics',
    attachments: [{ name: 'Exercises_2_1.pdf', url: '/files/ex2.1.pdf' }],
    created_at: '2026-11-24T09:00:00Z',
    updated_at: '2026-11-24T09:30:00Z',
    is_read_by_student: false,
    is_acknowledged: false,
    target_student_id: 'stu-ada',
    target_student_name: 'Ada Lovelace',
  },
  {
    id: 'entry-02',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Active Participation in Analytical Logic Seminar',
    description: 'Demonstrated outstanding reasoning and logic during the algorithm design workshop.',
    entry_type: 'POSITIVE_FEEDBACK',
    category: 'BEHAVIOUR',
    entry_date: '2026-11-24',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: false,
    is_conversation_allowed: true,
    status: 'PUBLISHED',
    published_at: '2026-11-24T11:00:00Z',
    grade_name: 'Grade 10',
    section_name: 'Section A',
    subject_name: 'Computer Science',
    attachments: [],
    created_at: '2026-11-24T10:45:00Z',
    updated_at: '2026-11-24T11:00:00Z',
    is_read_by_student: true,
    is_acknowledged: false,
    target_student_id: 'stu-ada',
    target_student_name: 'Ada Lovelace',
  },
  {
    id: 'entry-03',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Midterm Science Fair Project Submissions Due Friday',
    description: 'All students are reminded to finalize project abstracts and apparatus requirements with the department lab assistant.',
    entry_type: 'NOTICE',
    category: 'GENERAL',
    entry_date: '2026-11-24',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: false,
    is_conversation_allowed: false,
    status: 'PUBLISHED',
    published_at: '2026-11-24T08:00:00Z',
    grade_name: 'Grade 10',
    section_name: 'Section A',
    attachments: [],
    created_at: '2026-11-24T07:50:00Z',
    updated_at: '2026-11-24T08:00:00Z',
    is_read_by_student: true,
    is_acknowledged: false,
    target_student_id: 'stu-ada',
    target_student_name: 'Ada Lovelace',
  },
];

const mockParentChildren = [
  {
    id: 'child-link-1',
    relationship_id: 'rel-1',
    student_id: 'stu-ada',
    student_code: 'STU-1001',
    first_name: 'Ada',
    last_name: 'Lovelace',
    class_name: 'Grade 10',
    section: 'A',
    relationship_type: 'FATHER',
    is_primary_guardian: true,
    verification_status: 'VERIFIED',
    status: 'ACTIVE',
    linked_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'child-link-2',
    relationship_id: 'rel-2',
    student_id: 'stu-charles',
    student_code: 'STU-0702',
    first_name: 'Charles',
    last_name: 'Byron',
    class_name: 'Grade 7',
    section: 'B',
    relationship_type: 'FATHER',
    is_primary_guardian: true,
    verification_status: 'VERIFIED',
    status: 'ACTIVE',
    linked_at: '2026-01-10T08:00:00Z',
  },
];

const mockParentEntriesAda = [
  {
    id: 'entry-01',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Real Numbers & Polynomials — Exercise 2.1',
    description: 'We covered real numbers and polynomials today in class. Homework: Complete questions 1 to 10 from Chapter 2.',
    entry_type: 'HOMEWORK',
    category: 'ACADEMIC',
    entry_date: '2026-11-24',
    due_date: '2026-11-25',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: true,
    is_conversation_allowed: true,
    status: 'PUBLISHED',
    published_at: '2026-11-24T09:30:00Z',
    grade_name: 'Grade 10',
    section_name: 'Section A',
    subject_name: 'Mathematics',
    attachments: [{ name: 'Exercises_2_1.pdf', url: '/files/ex2.1.pdf' }],
    created_at: '2026-11-24T09:00:00Z',
    updated_at: '2026-11-24T09:30:00Z',
    is_read_by_student: true,
    is_acknowledged: false,
    conversation_id: 'conv-01',
    target_student_id: 'stu-ada',
    target_student_name: 'Ada Lovelace',
  },
  {
    id: 'entry-02',
    teacher_id: 'tch-001',
    teacher_name: 'Mr. Alan Turing',
    title: 'Active Participation in Analytical Logic Seminar',
    description: 'Demonstrated outstanding reasoning and logic during the algorithm design workshop.',
    entry_type: 'POSITIVE_FEEDBACK',
    category: 'BEHAVIOUR',
    entry_date: '2026-11-24',
    visibility: 'STUDENT_AND_PARENT',
    requires_acknowledgement: false,
    is_conversation_allowed: true,
    status: 'PUBLISHED',
    published_at: '2026-11-24T11:00:00Z',
    grade_name: 'Grade 10',
    section_name: 'Section A',
    subject_name: 'Computer Science',
    attachments: [],
    created_at: '2026-11-24T10:45:00Z',
    updated_at: '2026-11-24T11:00:00Z',
    is_read_by_student: true,
    is_acknowledged: true,
    acknowledgement_id: 'ack-01',
    target_student_id: 'stu-ada',
    target_student_name: 'Ada Lovelace',
  },
];

const mockConversation = {
  id: 'conv-01',
  diary_entry_id: 'entry-01',
  entry_title: 'Real Numbers & Polynomials — Exercise 2.1',
  student_id: 'stu-ada',
  student_name: 'Ada Lovelace',
  parent_id: 'par-01',
  parent_name: 'Lord Byron',
  teacher_id: 'tch-001',
  teacher_name: 'Mr. Alan Turing',
  status: 'OPEN' as const,
  created_at: '2026-11-24T09:30:00Z',
  unread_count: 0,
  messages: [
    {
      id: 'msg-01',
      conversation_id: 'conv-01',
      sender_user_id: 'usr-teacher-1',
      sender_role: 'TEACHER',
      sender_name: 'Mr. Alan Turing',
      message: 'Please ensure Ada reviews questions 7-10 on rational exponents, as they form the foundation for tomorrow\'s test.',
      attachments: [],
      is_read: true,
      created_at: '2026-11-24T09:35:00Z',
    },
    {
      id: 'msg-02',
      conversation_id: 'conv-01',
      sender_user_id: 'usr-parent-1',
      sender_role: 'PARENT',
      sender_name: 'Lord Byron',
      message: 'Thank you Mr. Turing. We will supervise her practice this evening and make sure she completes the exercises.',
      attachments: [],
      is_read: true,
      created_at: '2026-11-24T10:15:00Z',
    },
  ],
};

// ---------------------------------------------------------
// Helper for Student Portal Auth (Student / Parent)
// ---------------------------------------------------------
async function setupStudentPortalAuth(
  page: any,
  role: 'student' | 'parent',
  user: { id: string; email: string; first_name: string; last_name: string }
) {
  await page.addInitScript(
    ({ role, user }: { role: string; user: any }) => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            accessToken: 'mock-valid-jwt-token',
            user: {
              id: user.id,
              email: user.email,
              role: role,
              first_name: user.first_name,
              last_name: user.last_name,
            },
            isAuthenticated: true,
            isBootstrapped: true,
          },
          version: 0,
        })
      );
    },
    { role, user }
  );

  await page.route('**/api/v1/auth/refresh', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-valid-jwt-token',
        token_type: 'bearer',
      }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        role: role,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: true,
      }),
    });
  });
}

// ---------------------------------------------------------
// Helper for Admin Frontend Auth (Teacher)
// ---------------------------------------------------------
async function setupTeacherAuth(page: any) {
  await page.route('**/api/v1/auth/refresh', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-valid-teacher-jwt',
        token_type: 'bearer',
      }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'usr-teacher-1',
        email: 'alan.turing@school.edu',
        role: 'teacher',
        first_name: 'Alan',
        last_name: 'Turing',
        is_active: true,
      }),
    });
  });

  // Mock teacher context
  await page.route('**/api/v1/diary/teacher-context*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTeacherContext),
    });
  });

  // Mock teacher entries
  await page.route('**/api/v1/diary/entries*', async (route: any) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: mockTeacherEntries.length,
          entries: mockTeacherEntries,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

// =========================================================
// TEST SUITE: Digital School Diary Visual Regression
// =========================================================
test.describe('Digital School Diary Visual Suite', () => {

  // -------------------------------------------------------
  // 1. TEACHER: Management Dashboard (Admin Portal)
  // -------------------------------------------------------
  test('Teacher - Diary Dashboard & KPI Metrics', async ({ page }) => {
    await setupTeacherAuth(page);

    await page.goto('http://localhost:3000/diary');
    await page.waitForLoadState('networkidle');

    // Verify key UI landmarks
    await expect(page.locator('text=Digital School Diary').first()).toBeVisible();
    await expect(page.locator('text=TOTAL ENTRIES').first()).toBeVisible();
    await expect(page.locator('text=Real Numbers & Polynomials — Exercise 2.1').first()).toBeVisible();

    // Disable CSS animations for deterministic screenshot
    await page.addStyleTag({
      content: `*, *::before, *::after { transition-property: none !important; transform: none !important; animation: none !important; }`,
    });

    // Capture visual snapshot
    await expect(page).toHaveScreenshot('teacher-diary-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });
  });

  // -------------------------------------------------------
  // 2. TEACHER: Compose Entry Dialog (Admin Portal)
  // -------------------------------------------------------
  test('Teacher - Compose Entry Modal', async ({ page }) => {
    await setupTeacherAuth(page);

    await page.goto('http://localhost:3000/diary');
    await page.waitForLoadState('networkidle');

    // Click Compose Entry button
    const composeBtn = page.locator('button:has-text("Compose Entry")').first();
    await expect(composeBtn).toBeVisible();
    await composeBtn.scrollIntoViewIfNeeded();
    await composeBtn.click({ force: true });

    // Verify Compose Modal is open
    await expect(page.locator('text=Compose Digital Diary Entry').first()).toBeVisible();
    await expect(page.locator('text=Entry Title').first()).toBeVisible();

    await page.addStyleTag({
      content: `*, *::before, *::after { transition-property: none !important; transform: none !important; animation: none !important; }`,
    });

    await expect(page).toHaveScreenshot('teacher-diary-compose-dialog.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  // -------------------------------------------------------
  // 3. STUDENT: School Diary Feed & Homework View (Student Portal)
  // -------------------------------------------------------
  test('Student - School Diary Feed & Homework', async ({ page }) => {
    await setupStudentPortalAuth(page, 'student', {
      id: 'usr-ada',
      email: 'ada.lovelace@school.edu',
      first_name: 'Ada',
      last_name: 'Lovelace',
    });

    // Mock student entries endpoint
    await page.route('**/api/v1/diary/student/entries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: mockStudentEntries.length,
          skip: 0,
          limit: 20,
          entries: mockStudentEntries,
        }),
      });
    });

    await page.goto('http://localhost:3001/diary');
    await page.waitForLoadState('networkidle');

    // Verify student landmarks
    await expect(page.locator('text=Digital School Diary').first()).toBeVisible();
    await expect(page.locator('text=Stay up to date with daily classroom remarks').first()).toBeVisible();
    await expect(page.locator('text=Real Numbers & Polynomials — Exercise 2.1').first()).toBeVisible();
    await expect(page.locator('text=Mr. Alan Turing').first()).toBeVisible();

    await page.addStyleTag({
      content: `*, *::before, *::after { transition-property: none !important; transform: none !important; animation: none !important; }`,
    });

    await expect(page).toHaveScreenshot('student-diary-feed.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });
  });

  // -------------------------------------------------------
  // 4. PARENT: Multi-Child Diary Feed & Action Alerts
  // -------------------------------------------------------
  test('Parent - Multi-Child Diary Feed & Action Alerts', async ({ page }) => {
    await setupStudentPortalAuth(page, 'parent', {
      id: 'usr-byron',
      email: 'lord.byron@school.edu',
      first_name: 'Lord',
      last_name: 'Byron',
    });

    // Mock parent children
    await page.route('**/parent/children', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockParentChildren),
      });
    });

    // Mock parent entries for child
    await page.route('**/api/v1/diary/parent/entries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: mockParentEntriesAda.length,
          skip: 0,
          limit: 20,
          entries: mockParentEntriesAda,
        }),
      });
    });

    await page.goto('http://localhost:3001/diary');
    await page.waitForLoadState('networkidle');

    // Verify parent landmarks
    await expect(page.locator('text=Digital School Diary').first()).toBeVisible();
    await expect(page.locator('text=Ada Lovelace').first()).toBeVisible();
    await expect(page.locator('text=Charles Byron').first()).toBeVisible();
    await expect(page.locator('text=Signature Required').first()).toBeVisible();

    await page.addStyleTag({
      content: `*, *::before, *::after { transition-property: none !important; transform: none !important; animation: none !important; }`,
    });

    await expect(page).toHaveScreenshot('parent-diary-feed.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });
  });

  // -------------------------------------------------------
  // 5. PARENT: Digital Signature & Acknowledgement Dialog
  // -------------------------------------------------------
  test('Parent - Digital Signature Modal', async ({ page }) => {
    await setupStudentPortalAuth(page, 'parent', {
      id: 'usr-byron',
      email: 'lord.byron@school.edu',
      first_name: 'Lord',
      last_name: 'Byron',
    });

    await page.route('**/parent/children', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockParentChildren),
      });
    });

    await page.route('**/api/v1/diary/parent/entries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: mockParentEntriesAda.length,
          skip: 0,
          limit: 20,
          entries: mockParentEntriesAda,
        }),
      });
    });

    await page.goto('http://localhost:3001/diary');
    await page.waitForLoadState('networkidle');

    // Click Acknowledge button
    const ackBtn = page.locator('button:has-text("Acknowledge")').first();
    await expect(ackBtn).toBeVisible();
    await ackBtn.click();

    // Verify Signature Dialog is open
    await expect(page.locator('text=Acknowledge School Diary Entry').first()).toBeVisible();
    await expect(page.locator('button:has-text("Confirm Signature")').first()).toBeVisible();

    await page.addStyleTag({
      content: `*, *::before, *::after { transition-property: none !important; transform: none !important; animation: none !important; }`,
    });

    await expect(page).toHaveScreenshot('parent-diary-ack-dialog.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  // -------------------------------------------------------
  // 6. PARENT: 1-on-1 Teacher Discussion Thread Drawer
  // -------------------------------------------------------
  test('Parent - Teacher Discussion Drawer', async ({ page }) => {
    await setupStudentPortalAuth(page, 'parent', {
      id: 'usr-byron',
      email: 'lord.byron@school.edu',
      first_name: 'Lord',
      last_name: 'Byron',
    });

    await page.route('**/parent/children', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockParentChildren),
      });
    });

    await page.route('**/api/v1/diary/parent/entries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: mockParentEntriesAda.length,
          skip: 0,
          limit: 20,
          entries: mockParentEntriesAda,
        }),
      });
    });

    // Mock conversation thread creation & details using regex to match both query params and path params
    await page.route(/\/api\/v1\/diary\/conversations/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ conversation_id: 'conv-01' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockConversation),
        });
      }
    });

    await page.goto('http://localhost:3001/diary');
    await page.waitForLoadState('networkidle');

    // Click Message Teacher button
    const discussBtn = page.locator('button:has-text("Message Teacher")').first();
    await expect(discussBtn).toBeVisible();
    await discussBtn.scrollIntoViewIfNeeded();
    await discussBtn.click({ force: true });

    // Verify discussion drawer opened
    await expect(page.locator('text=Message Teacher').first()).toBeVisible();
    await expect(page.locator('text=Please ensure Ada reviews questions 7-10').first()).toBeVisible();

    await page.addStyleTag({
      content: `*, *::before, *::after { transition-property: none !important; transform: none !important; animation: none !important; }`,
    });

    await expect(page).toHaveScreenshot('parent-diary-chat-drawer.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  // -------------------------------------------------------
  // 7. PARENT PORTAL: Digital Diary Tab in Child Detail Profile (/children)
  // -------------------------------------------------------
  test('Parent - Child Profile Digital Diary Tab', async ({ page }) => {
    await setupStudentPortalAuth(page, 'parent', {
      id: 'usr-byron',
      email: 'lord.byron@school.edu',
      first_name: 'Lord',
      last_name: 'Byron',
    });

    await page.route('**/parent/children', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockParentChildren),
      });
    });

    await page.route('**/api/v1/diary/parent/entries*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: mockParentEntriesAda.length,
          skip: 0,
          limit: 20,
          entries: mockParentEntriesAda,
        }),
      });
    });

    await page.goto('http://localhost:3001/children');
    await page.waitForLoadState('networkidle');

    // Click on Digital Diary tab with force click to avoid mobile header overlay
    const diaryTab = page.locator('button[role="tab"]:has-text("Digital Diary")').first();
    if (await diaryTab.count() > 0) {
      await diaryTab.click({ force: true });
      await page.waitForTimeout(500);

      await page.addStyleTag({
        content: `*, *::before, *::after { transition-property: none !important; transform: none !important; animation: none !important; }`,
      });

      await expect(page).toHaveScreenshot('parent-child-tab-diary.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.005,
      });
    }
  });

});
