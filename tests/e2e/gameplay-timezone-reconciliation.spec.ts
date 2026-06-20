import { expect, test } from '@playwright/test';

import { onboardingTimeZone } from './support/runtime';

// Thin UI smoke for the game-round timezone reconciliation (the SQL invariant is
// covered exhaustively by tests/integration/update-couple-timezone-game-rounds.test.ts).
// It only proves the user-facing path holds: after a date-shifting couple-timezone
// change, the daily-question route still resolves a round instead of erroring on a
// stranded one. The shared couple timezone is restored in `finally` so the test
// stays order-independent under workers:1, mirroring E2E-MOBILE-TIMEZONE.
test('E2E-GAME-TZ daily-question still resolves after a couple-timezone change', async ({
  page,
}) => {
  test.slow();

  // A round exists for the couple under the onboarding zone after baseline seeding.
  await page.goto('/en/games/daily-question');
  await expect(page.getByRole('heading', { name: 'Daily question' })).toBeVisible();

  await page.goto('/en/settings');
  let timezoneInput = page.getByLabel('Couple timezone');
  await expect(timezoneInput).toBeVisible();

  try {
    await timezoneInput.fill('America/New_York');
    await timezoneInput.press('Tab');
    await page.getByRole('button', { name: 'Save timezone' }).click();
    await expect(page.getByText('Current timezone: America/New_York')).toBeVisible({
      timeout: 15_000,
    });

    // After the date shift, the daily-question route must resolve a round under the
    // new zone (regenerated, or the still-revealed prior round) without throwing.
    await page.goto('/en/games/daily-question');
    await expect(page.getByRole('heading', { name: 'Daily question' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Something went wrong')).toBeHidden();
  } finally {
    await page.goto('/en/settings');
    timezoneInput = page.getByLabel('Couple timezone');
    await timezoneInput.fill(onboardingTimeZone);
    await timezoneInput.press('Tab');
    await page.getByRole('button', { name: 'Save timezone' }).click();
    await expect(page.getByText(`Current timezone: ${onboardingTimeZone}`)).toBeVisible({
      timeout: 15_000,
    });
  }
});
