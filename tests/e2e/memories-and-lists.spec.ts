import { Buffer } from 'node:buffer';

import { expect, test } from '@playwright/test';

import { memoryFixturePath } from './support/runtime';
import { buildUniqueText, createTodayDateTimeLocalInput } from './support/test-data';

test('E2E-MEM-000 memory creation requires a note or media', async ({ page }) => {
  await page.goto('/en/memories/new');
  await page.getByLabel('Note').fill('');
  await page.getByRole('button', { name: 'Save memory' }).click();

  await expect(page).toHaveURL(/\/en\/memories\/new$/);
  await expect(page.getByText('Add a note or at least one media file.')).toBeVisible();
});

test('E2E-MEM-000-TYPE unsupported memory media is rejected before save', async ({ page }) => {
  await page.goto('/en/memories/new');
  const mediaInput = page.locator('input[type="file"]');
  const fileChooserPromise = page.waitForEvent('filechooser');

  await page.getByLabel('Media').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    buffer: Buffer.from('not an image or video'),
    mimeType: 'text/plain',
    name: 'unsupported-memory-file.txt',
  });
  await expect
    .poll(async () =>
      mediaInput.evaluate((input) => {
        const fileInput = input as HTMLInputElement;

        return fileInput.files?.[0]?.type ?? null;
      }),
    )
    .toBe('text/plain');
  await page.getByLabel('Note').fill(buildUniqueText('Unsupported media note', 'E2E-MEM-000-TYPE'));

  await page.getByRole('button', { name: 'Save memory' }).click();

  await expect(page).toHaveURL(/\/en\/memories\/new$/);
  await expect(page.getByText('Only image and video files are supported.')).toBeVisible();
});

test('E2E-HOME-001 / E2E-MEM-001 / E2E-OTD-001 / E2E-WISH-001 / E2E-CHK-001 memory, wishlist, and checklist flows work across home, detail, and lists', async ({
  page,
}) => {
  test.slow();

  const memoryLocation = buildUniqueText('Memory place', 'E2E-MEM-001');
  const memoryNote = buildUniqueText('Memory note', 'E2E-MEM-001');
  const wishTitle = buildUniqueText('Wish item', 'E2E-WISH-001');
  const wishNote = buildUniqueText('Wish note', 'E2E-WISH-001');
  const checklistTitle = buildUniqueText('Checklist', 'E2E-CHK-001');
  const checklistItemText = buildUniqueText('Checklist item', 'E2E-CHK-001');

  await page.goto('/en/memories/new');
  await page.getByLabel('Happened at').fill(createTodayDateTimeLocalInput(11, 30));
  await page.getByLabel('Location').fill(memoryLocation);
  await page.getByLabel('Note').fill(memoryNote);
  await page.getByLabel('Media').setInputFiles(memoryFixturePath);
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });
  await expect(page.getByText(/^Day \d+$/).first()).toBeVisible();
  await expect(page.getByText(memoryNote).first()).toBeVisible();

  const memoryLink = page.locator('a').filter({ hasText: memoryNote }).first();
  await expect(memoryLink).toBeVisible();
  await memoryLink.click();
  await expect(page).toHaveURL(/\/en\/memories\/[0-9a-f-]+$/);
  await expect(page.getByText(memoryLocation).first()).toBeVisible();
  await expect(page.getByText(memoryNote).first()).toBeVisible();
  await expect(page.getByAltText('Memory media')).toBeVisible();

  await page.goto('/en/on-this-day');
  await expect(page.getByRole('heading', { name: 'On this day' })).toBeVisible();
  await expect(page.getByText(memoryNote).first()).toBeVisible();

  await page.goto('/en/home');
  await page.getByLabel('Category').selectOption('food');
  await page.getByRole('textbox', { name: /^Title$/ }).fill(wishTitle);
  await page.getByLabel('Note (optional)').fill(wishNote);
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText(wishTitle)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel('Checklist title').fill(checklistTitle);
  await page.getByRole('button', { name: 'Create checklist' }).click();
  await expect(page.getByRole('heading', { name: checklistTitle })).toBeVisible({
    timeout: 15_000,
  });

  await page.goto('/en/lists');
  await expect(page.getByRole('heading', { name: 'Shared lists' })).toBeVisible();
  await expect(page.getByText(wishTitle)).toBeVisible();
  await expect(page.getByText(wishNote)).toBeVisible();
  await expect(page.getByRole('heading', { name: checklistTitle })).toBeVisible();

  const checklistCard = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: checklistTitle }),
    })
    .first();
  await checklistCard.getByPlaceholder('Add item').fill(checklistItemText);
  await checklistCard.getByRole('button', { exact: true, name: 'Add' }).click();
  await expect(checklistCard.getByText(checklistItemText)).toBeVisible({
    timeout: 15_000,
  });

  const refreshedChecklistCard = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: checklistTitle }),
    })
    .first();
  await expect(refreshedChecklistCard.getByText(checklistItemText)).toBeVisible();
  await refreshedChecklistCard.getByRole('button', { name: 'Done' }).click();
  await expect(refreshedChecklistCard.getByText('Completed')).toBeVisible({
    timeout: 15_000,
  });

  const completedChecklistCard = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: checklistTitle }),
    })
    .first();
  await expect(completedChecklistCard.getByText(checklistItemText)).toBeVisible();
  await expect(completedChecklistCard.getByText('Completed')).toBeVisible();
  await completedChecklistCard.getByRole('button', { name: 'Undo' }).click();

  const pendingChecklistCard = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: checklistTitle }),
    })
    .first();
  await expect(pendingChecklistCard.getByText(checklistItemText)).toBeVisible();
  await expect(pendingChecklistCard.getByRole('button', { name: 'Done' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(pendingChecklistCard.getByText('Completed')).toHaveCount(0);
});
