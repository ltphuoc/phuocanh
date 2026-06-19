import { expect, test } from '@playwright/test';

// Memory-backed gameplay flows (daily-question / guess-date / trivia) and the prerequisite gate live
// in `first-run.spec.ts` because their assertions depend on couple-global state (empty memory set,
// "Completed" counts, streak) that is only deterministic before baseline data exists. This shell-only
// route test has no couple-data dependency, so it stays in the order-independent `chromium` project.

test('E2E-GAME-000 shell-only game mode stays non-live', async ({ page }) => {
  await page.goto('/en/games/compatibility');
  await expect(page.getByRole('heading', { name: 'Compatibility' })).toBeVisible();
  await expect(
    page.getByText(
      'This route is a structured shell for the selected game mode. Prompt generation, answer capture, and streak updates will connect here in a later phase.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to games' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate today’s question' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open today’s memory clue' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open today’s trivia clue' })).toBeHidden();
});

test('E2E-GAMESHUB-001 games hub shows completed statuses and per-mode entry points', async ({
  page,
}) => {
  // After the first-run window all three rounds are completed for the shared couple, so the hub is
  // deterministically "Completed" with the open-round entry points.
  await page.goto('/en/games');
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
  await expect(page.getByText(/^Completed$/)).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Open today’s round' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open today’s date guess' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open today’s trivia' })).toBeVisible();
});
