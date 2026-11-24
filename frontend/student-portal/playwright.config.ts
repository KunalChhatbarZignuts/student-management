import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Visual Regression Testing Configuration
 * Following the visual-testing skill:
 * - pixelmatch comparator with 0.5% max diff ratio tolerance
 * - animations disabled and caret hidden to prevent false positives
 * - desktop (1280x800) and mobile (390x844) viewport projects
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    toHaveScreenshot: {
      comparator: 'pixelmatch',
      maxDiffPixelRatio: 0.005, // Allow up to 0.5% diff for sub-pixel anti-aliasing
      animations: 'disabled',   // Freeze CSS transitions and animations
      caret: 'hide',            // Hide text cursor
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.005,
    },
  },
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'visual-desktop',
      use: {
        viewport: { width: 1280, height: 800 },
        colorScheme: 'light',
      },
      testMatch: /.*visual.*\.spec\.ts/,
    },
    {
      name: 'visual-mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        colorScheme: 'light',
        isMobile: true,
      },
      testMatch: /.*visual.*\.spec\.ts/,
    },
  ],
});
