import { expect, test } from '@playwright/test';

import { buildUniqueText } from './support/test-data';

// Countdown and future-note form failure paths. Invalid submissions surface inline errors and create
// no couple data. The future-note body limit is enforced client-side (zod), so a specific message is
// asserted rather than a generic toast.

test('E2E-COUNT-VALIDATION countdown form enforces title, target date, and note limits', async ({
  page,
}) => {
  await page.goto('/en/countdowns');

  await page.getByRole('button', { name: 'Save countdown' }).click();
  await expect(page.getByText('Enter a title.')).toBeVisible();

  await page.getByLabel('Title').fill(buildUniqueText('Countdown', 'E2E-COUNT-VALIDATION'));
  await page.getByLabel('Target date').fill('');
  await page.getByRole('button', { name: 'Save countdown' }).click();
  await expect(page.getByText('Choose a target date.')).toBeVisible();

  await page.getByLabel('Note (optional)').fill('a'.repeat(281));
  await page.getByRole('button', { name: 'Save countdown' }).click();
  await expect(page.getByText('Note must be 280 characters or fewer.')).toBeVisible();
});

test('E2E-FNOTE-VALIDATION future-note form enforces title and body required', async ({ page }) => {
  await page.goto('/en/future-notes');

  await page.getByLabel('Note body').fill(buildUniqueText('Body', 'E2E-FNOTE-VALIDATION'));
  await page.getByRole('button', { name: 'Seal future note' }).click();
  await expect(page.getByText('Enter a title.')).toBeVisible();

  await page.getByLabel('Title').fill(buildUniqueText('Future note', 'E2E-FNOTE-VALIDATION'));
  await page.getByLabel('Note body').fill('');
  await page.getByRole('button', { name: 'Seal future note' }).click();
  await expect(page.getByText('Write the note body.')).toBeVisible();
});
