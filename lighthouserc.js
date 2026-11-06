/**
 * Lighthouse CI Configuration
 * Student Management System — Admin Frontend & Student Portal
 *
 * Thresholds follow performance-testing skill targets:
 *   LCP < 2500ms, CLS < 0.1, TBT < 500ms
 *
 * Usage:
 *   npx lhci autorun --config=lighthouserc.js
 */
module.exports = {
  ci: {
    collect: {
      url: [
        // ── Admin Frontend (port 3000) ──────────────────────────────────────
        "http://localhost:3000/",
        "http://localhost:3000/students",
        "http://localhost:3000/teachers",
        "http://localhost:3000/attendance",
        "http://localhost:3000/timetable",
        "http://localhost:3000/fees",
        "http://localhost:3000/examinations",
        "http://localhost:3000/calendar",
        // ── Student Portal (port 3001) ──────────────────────────────────────
        "http://localhost:3001/",
        "http://localhost:3001/dashboard",
        "http://localhost:3001/timetable",
        "http://localhost:3001/attendance",
        "http://localhost:3001/fees",
        "http://localhost:3001/results",
      ],
      numberOfRuns: 2,
      settings: {
        // Run headless in CI/dev environment
        chromeFlags: "--no-sandbox --headless --disable-gpu",
        // Skip service worker to avoid caching artifacts across runs
        skipAudits: ["uses-http2"],
        // Desktop viewport for primary audit; mobile can be run separately
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: "simulate",
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },

    assert: {
      // Thresholds aligned with performance-testing skill targets
      assertions: {
        "categories:performance": ["warn", { minScore: 0.6 }],
        "categories:accessibility": ["warn", { minScore: 0.8 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 500 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        "interactive": ["warn", { maxNumericValue: 3800 }],
      },
    },

    upload: {
      target: "filesystem",
      outputDir: "tests/performance/reports/lighthouse",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};

