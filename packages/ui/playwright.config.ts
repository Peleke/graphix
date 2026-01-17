/**
 * Playwright Configuration for Graphix UI E2E Tests
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Environment-based configuration
 */
const CI = !!process.env.CI;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3002';

export default defineConfig({
  // Test directory
  testDir: './e2e/specs',

  // Maximum time a test can run
  timeout: 30_000,

  // Maximum time expect() can run
  expect: {
    timeout: 5_000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: CI,

  // Retry on CI only
  retries: CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    CI ? ['github'] : ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: BASE_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording
    video: CI ? 'on-first-retry' : 'off',

    // Custom attributes for test ID
    testIdAttribute: 'data-testid',
  },

  // Projects for different browsers and viewports
  projects: [
    // Desktop Browsers (Primary)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile Browsers (Secondary - post-MVP)
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: [
    // UI development server
    {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
    // API server (assumes it's running or needs to be started)
    // {
    //   command: 'npm run -w @graphix/server dev',
    //   url: API_URL,
    //   reuseExistingServer: !CI,
    //   timeout: 120_000,
    // },
  ],

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Global setup/teardown
  // globalSetup: './e2e/global-setup.ts',
  // globalTeardown: './e2e/global-teardown.ts',
});
