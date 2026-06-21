import { expect, test } from '@playwright/test';

import { createAlbum, createMemory, createTrip } from './support/journeys/seed-journeys';
import { memoryFixturePath } from './support/runtime';
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
} from './support/test-data';

// Trip create + edit and visited-place failure paths. The create checks need no trip; the edit and
// place checks reuse a single self-created tokenized trip. Existing E2E-TRIP-000 / E2E-PLACE-000
// already cover the create date-range and date-outside-window paths, so they are not repeated here.

test('E2E-TRIP-VALIDATION trip create form enforces title required and note length', async ({
  page,
}) => {
  await page.goto('/en/trips');

  await page.getByRole('button', { name: 'Save trip' }).click();
  await expect(page.getByText('Enter a trip title.')).toBeVisible();

  await page.getByLabel('Trip title').fill(buildUniqueText('Trip', 'E2E-TRIP-VALIDATION'));
  await page.getByLabel('Trip note (optional)').fill('a'.repeat(2001));
  await page.getByRole('button', { name: 'Save trip' }).click();
  await expect(page.getByText('Trip note must be 2000 characters or fewer.')).toBeVisible();
});

test('E2E-TRIP-EDIT-VALIDATION / E2E-PLACE-VALIDATION trip edit and visited-place enforce required fields', async ({
  page,
}) => {
  test.slow();

  await createTrip(page, {
    endDate: createOffsetDateInput(3),
    startDate: createOffsetDateInput(-3),
    title: buildUniqueText('Validation trip', 'E2E-TRIP-EDIT-VALIDATION'),
  });

  // Trip edit: clearing the title blocks the update with the required-field error.
  await page.getByLabel('Trip title').fill('');
  await page.getByRole('button', { name: 'Update trip' }).click();
  await expect(page.getByText('Enter a trip title.')).toBeVisible();

  // Visited place: empty title is rejected, then an over-long note is rejected.
  await page.getByRole('button', { name: 'Save visited place' }).click();
  await expect(page.getByText('Enter a place title.')).toBeVisible();

  await page
    .getByLabel('Place title')
    .fill(buildUniqueText('Validation place', 'E2E-PLACE-VALIDATION'));
  await page.getByLabel('Place note (optional)').fill('a'.repeat(801));
  await page.getByRole('button', { name: 'Save visited place' }).click();
  await expect(page.getByText('Place note must be 800 characters or fewer.')).toBeVisible();
});

test('E2E-TRIP-ALBUM-ORPHAN narrowing a trip that would orphan an album photo is blocked', async ({
  page,
}) => {
  test.slow();

  const tripUrl = await createTrip(page, {
    endDate: createOffsetDateInput(3),
    startDate: createOffsetDateInput(-3),
    title: buildUniqueText('Album orphan trip', 'E2E-TRIP-ALBUM-ORPHAN'),
  });

  // A memory dated today (inside the trip window) whose media is attached to the album.
  const memoryNote = buildUniqueText('Album orphan memory', 'E2E-TRIP-ALBUM-ORPHAN');
  await createMemory(page, {
    happenedAt: createOffsetDateTimeLocalInput(0, 11, 0),
    mediaPaths: memoryFixturePath,
    note: memoryNote,
  });

  await page.goto(tripUrl);
  await createAlbum(page, {
    mediaMemoryNotes: [memoryNote],
    title: buildUniqueText('Album orphan album', 'E2E-TRIP-ALBUM-ORPHAN'),
  });

  // Narrow the window so the album photo's memory date now falls before the new start.
  await page.getByLabel('Start date').fill(createOffsetDateInput(1));
  await page.getByLabel('End date').fill(createOffsetDateInput(3));
  await page.getByRole('button', { name: 'Update trip' }).click();

  await expect(
    page.getByText(
      'Remove album photos whose memory date falls outside the new date range before updating this trip.',
    ),
  ).toBeVisible();
});
