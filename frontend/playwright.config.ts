import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
/* 5173 is vite's default, so it is also the port a developer's `npm run dev`
   takes - and the CI runner is that same laptop. A dev server started between
   two runs is enough to fail the suite outright:

     Error: http://localhost:5173 is already used, make sure that nothing is
     running on the port/url or set reuseExistingServer:true in config.webServer

   which is exactly what happened to 5bdb5a7 on main, nine minutes after the
   same suite passed on the pull request.

   reuseExistingServer stays false under CI on purpose: testing against
   whatever happens to be listening is worse than failing. So CI is handed a
   port of its own instead, the same way the postgres and redis services are
   already shifted off their defaults. Locally the default stays 5173, where
   reusing a dev server that is already up is the point. */
const E2E_PORT = Number(process.env.E2E_PORT) || 5173;

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. Must track the
       webServer port below. When it did not, the suite started a preview on
       its own port and then drove the browser at 5173 anyway - straight into
       whatever dev server happened to be running - and reported 14 passes
       against it before one test disagreed. */
    baseURL: `http://localhost:${E2E_PORT}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* The suite had no way to start the app it tests, so running it meant
     remembering to start a server first — which is part of why nothing ran it.
     Building and previewing, rather than `npm run dev`, so CI exercises the
     bundle that actually ships. */
  webServer: {
    command: `npm run build && npm run preview -- --port ${E2E_PORT} --strictPort`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },

  /* Configure projects for major browsers */
  projects: [
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

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],


});
