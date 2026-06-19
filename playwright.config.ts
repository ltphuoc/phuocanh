import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const baseUrl = new URL(BASE_URL);
const port = baseUrl.port || (baseUrl.protocol === 'https:' ? '443' : '80');
const authDirectory = resolve('playwright/.auth');
const partnerAStorageStatePath = resolve(authDirectory, 'partner-a.json');
const COUPLE_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 2 : 0,
  testDir: './tests/e2e',
  timeout: 90_000,
  use: {
    baseURL: BASE_URL,
    headless: process.env.PLAYWRIGHT_HEADLESS === '0' ? false : undefined,
    locale: 'en-US',
    screenshot: 'only-on-failure',
    timezoneId: COUPLE_TIME_ZONE,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm start',
    env: {
      ...process.env,
      PORT: port,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? BASE_URL,
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: BASE_URL,
  },
  workers: 1,
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // Ordered, pre-baseline window: empty-state + couple-global gameplay counts are deterministic
      // here because nothing has touched the shared couple yet. Runs once, serially.
      dependencies: ['setup'],
      name: 'first-run',
      testMatch: /first-run\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: partnerAStorageStatePath,
      },
    },
    {
      // Seeds rich couple data through the real UI, once, after first-run and before feature tests.
      dependencies: ['first-run'],
      name: 'baseline',
      testMatch: /baseline\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: partnerAStorageStatePath,
      },
    },
    {
      // Order-independent feature/assertion tests; every test asserts only on its own tokenized rows.
      dependencies: ['baseline'],
      name: 'chromium',
      testIgnore: [
        /auth\.setup\.ts/,
        /first-run\.spec\.ts/,
        /baseline\.setup\.ts/,
        /\.mobile\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: partnerAStorageStatePath,
      },
    },
    {
      // Phone-viewport pass over high-value flows. Chromium at a 390px viewport (not a WebKit device
      // descriptor) keeps the existing browser install; mobile onboarding is out of scope under the
      // single-couple invariant, so these test mobile login → existing-couple home.
      dependencies: ['baseline'],
      name: 'mobile',
      testMatch: /\.mobile\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: partnerAStorageStatePath,
        viewport: {
          height: 844,
          width: 390,
        },
      },
    },
  ],
});
