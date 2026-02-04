import { defineConfig, devices } from "@playwright/test";

/**
 * Comprehensive Playwright configuration with best practices
 *
 * See https://playwright.dev/docs/test-configuration
 */

export default defineConfig({
  // Test directory
  testDir: "./tests",

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Maximum time the whole test run can take
  globalTimeout: 60 * 60 * 1000, // 1 hour

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html"],
    ["list"],
    ["json", { outputFile: "test-results/test-results.json" }],
    // Uncomment for JUnit reporter (CI integration)
    // ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Take screenshot only on failure
    screenshot: "only-on-failure",

    // Record video only when retrying
    video: "retain-on-failure",

    // Maximum time each action such as `click()` can take
    actionTimeout: 10 * 1000,

    // Maximum time for navigation
    navigationTimeout: 30 * 1000,

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // User agent
    // userAgent: 'Custom User Agent',

    // Viewport size
    // viewport: { width: 1280, height: 720 },

    // Geolocation
    // geolocation: { longitude: 12.492507, latitude: 41.889938 },
    // permissions: ['geolocation'],

    // Color scheme
    // colorScheme: 'dark',

    // Timezone
    // timezoneId: 'Europe/Rome',

    // Locale
    // locale: 'en-GB',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: process.env.PLAYWRIGHT_PROJECT_NAME || "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    /* Test against branded browsers */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global setup and teardown
  // globalSetup: require.resolve('./global-setup'),
  // globalTeardown: require.resolve('./global-teardown'),

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: "test-results/",

  // Whether to preserve output between test runs
  preserveOutput: "always",

  // Fail the build on failed tests
  // reportSlowTests: { max: 5, threshold: 60 * 1000 },

  // Grep by tags
  // grep: /@smoke/,
  // grepInvert: /@skip/,

  // Shard tests when running on multiple machines
  // shard: process.env.CI ? { current: 1, total: 3 } : undefined,

  // Maximum number of test failures for the whole test run
  // maxFailures: process.env.CI ? 10 : undefined,

  // Update snapshots with npm test -- -u
  // updateSnapshots: 'missing',

  // Whether to suppress stdio from browsers
  // quiet: false,

  // Metadata to attach to the report
  metadata: {
    project: "My Project",
    environment: process.env.NODE_ENV || "development",
    // runId: process.env.CI_RUN_ID,
    // branch: process.env.GIT_BRANCH,
  },
});
