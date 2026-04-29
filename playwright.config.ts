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
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 2 : 0,
  testDir: './tests/e2e',
  timeout: 90_000,
  use: {
    baseURL: BASE_URL,
    headless: process.env.PLAYWRIGHT_HEADLESS === '0' ? false : undefined,
    locale: 'en-US',
    timezoneId: COUPLE_TIME_ZONE,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm start',
    env: {
      ...process.env,
      PORT: port,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? BASE_URL,
    },
    reuseExistingServer: false,
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
      dependencies: ['setup'],
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: partnerAStorageStatePath,
      },
    },
  ],
});
