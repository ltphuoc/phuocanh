import { test } from '@playwright/test';

import { bootstrapCouple } from './support/journeys/auth-journeys';

test('E2E-AUTH-SETUP-000 bootstrap partner auth states with real magic links', async ({
  browser,
  page,
}) => {
  await bootstrapCouple({ browser, page });
});
