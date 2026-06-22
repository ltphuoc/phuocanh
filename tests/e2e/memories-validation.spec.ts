import { expect, test } from '@playwright/test';

import { createMemory } from './support/journeys/seed-journeys';
import { buildUniqueText, createTodayDateTimeLocalInput } from './support/test-data';

// Order-independent: a note-only success path and the note-length failure path. Both assert only on
// their own tokenized data or an inline error, never on couple-wide counts.

test('E2E-MEM-NOTE-ONLY a note-only memory saves without any media', async ({ page }) => {
  const note = buildUniqueText('Note-only memory', 'E2E-MEM-NOTE-ONLY');

  await createMemory(page, {
    happenedAt: createTodayDateTimeLocalInput(9, 0),
    note,
  });

  await expect(page.getByText(note).first()).toBeVisible();
});

test('E2E-MEM-NOTE-MAX rejects a note longer than 4000 characters', async ({ page }) => {
  await page.goto('/en/memories/new');
  await page.getByLabel('Note').fill('a'.repeat(4001));
  await page.getByRole('button', { name: 'Save memory' }).click();

  await expect(page).toHaveURL(/\/en\/memories\/new$/);
  await expect(page.getByText('Keep the note to 4000 characters or fewer.')).toBeVisible();
});
