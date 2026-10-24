import { defineConfig, devices } from '@playwright/test';

// Read environment variables from an optional .env file (already set variables take precedence).
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

const SERIAL_TESTS = [/suggestions\.spec\.ts/];

const chromium = {
  ...devices['Desktop Chrome'],
  permissions: ['clipboard-read', 'clipboard-write'],
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: process.env.TEST_DIR || './tests',
  // timeout for each test
  timeout: 120_000,
  // timeout for each assertion
  expect: { timeout: 30_000 },
  // Tests run in parallel, also the tests within a file. They are isolated from each other by using their own data:
  // a fresh admin user per test (see `adminUser` in tests/utils/fixtures.ts), unique names for everything they create,
  // assertions scoped to their own entities and one mock LLM server per worker.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // no retries, also not in CI: a flaky test should fail right away instead of being hidden by a passing retry
  // (the trace of the failed attempt is kept, see `trace` below)
  retries: 0,
  // The whole stack runs on the same machine (docker), so do not use too many browsers at once.
  // The GitHub runners have 4 vCPUs. Override with `--workers=<n>`.
  workers: process.env.CI ? 3 : 4,
  // the github reporter shows failures as annotations of the CI job
  reporter: process.env.CI
    ? [['github'], ['list', { printSteps: true }], ['html', { open: 'never' }]]
    : [['list', { printSteps: true }], ['html']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      // creates the shared buckets (there may only be one user and one conversation bucket) before the tests run
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: SERIAL_TESTS,
      dependencies: ['setup'],
      use: chromium,
    },
    {
      // Tests that modify global state other tests (or other instances of themselves, e.g. with `--repeat-each`)
      // would observe. They run one at a time, but in parallel to the tests of the `chromium` project.
      // - suggestions: replaces the global chat suggestions and the language in the theme settings
      name: 'chromium-serial',
      testMatch: SERIAL_TESTS,
      dependencies: ['setup'],
      workers: 1,
      use: chromium,
    },
  ],
});
