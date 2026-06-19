import { expect, test } from '@playwright/test';

import { buildUniqueText } from './support/test-data';

// Wishlist and checklist form failure paths. These submit invalid input and assert the inline error,
// so they create no couple data and are safe on the shared couple.

test('E2E-WISH-VALIDATION wishlist form enforces title required and length limits', async ({
  page,
}) => {
  await page.goto('/en/home');

  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('Enter a wishlist title.')).toBeVisible();

  await page.getByRole('textbox', { name: /^Title$/ }).fill('a'.repeat(121));
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('Keep the title to 120 characters or fewer.')).toBeVisible();

  await page
    .getByRole('textbox', { name: /^Title$/ })
    .fill(buildUniqueText('Wish', 'E2E-WISH-VALIDATION'));
  await page.getByLabel('Note (optional)').fill('a'.repeat(201));
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('Keep the note to 200 characters or fewer.')).toBeVisible();
});

test('E2E-CHK-VALIDATION checklist and checklist-item forms enforce required text', async ({
  page,
}) => {
  await page.goto('/en/home');

  await page.getByRole('button', { name: 'Create checklist' }).click();
  await expect(page.getByText('Enter a checklist title.')).toBeVisible();

  const checklistTitle = buildUniqueText('Checklist', 'E2E-CHK-VALIDATION');
  await page.getByLabel('Checklist title').fill(checklistTitle);
  await page.getByRole('button', { name: 'Create checklist' }).click();
  await expect(page.getByRole('heading', { name: checklistTitle })).toBeVisible({
    timeout: 15_000,
  });

  await page.goto('/en/lists');
  const checklistCard = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: checklistTitle }),
    })
    .last();
  await checklistCard.getByRole('button', { exact: true, name: 'Add' }).click();
  await expect(checklistCard.getByText('Enter an item.')).toBeVisible();
});
