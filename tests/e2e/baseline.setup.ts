import { test } from '@playwright/test';

import {
  addVisitedPlace,
  createAlbum,
  createCountdown,
  createMemory,
  createTrip,
  sealFutureNote,
} from './support/journeys/seed-journeys';
import { memoryFixturePath } from './support/runtime';
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createTodayDateInput,
  createTodayDateTimeLocalInput,
} from './support/test-data';

// Seeds the single shared couple with rich, realistic data through the real UI, once, after the
// first-run window and before the order-independent `chromium` feature tests. Every row is uniquely
// tokenized; feature tests assert on their OWN tokens, never on this baseline's counts. This project
// writes no auth state — it only populates couple data.

test('E2E-BASELINE-000 seed rich couple data through the real UI', async ({ page }) => {
  test.slow();

  // A memory dated today so /on-this-day and /home have content after the empty first-run window.
  await createMemory(page, {
    happenedAt: createTodayDateTimeLocalInput(8, 30),
    location: buildUniqueText('Baseline today place', 'E2E-BASELINE-000'),
    note: buildUniqueText('Baseline on-this-day memory', 'E2E-BASELINE-000'),
    mediaPaths: memoryFixturePath,
  });

  // A second memory with a distinct location and older date for timeline/map richness.
  await createMemory(page, {
    happenedAt: createOffsetDateTimeLocalInput(-200, 14, 0),
    location: buildUniqueText('Baseline past place', 'E2E-BASELINE-000'),
    note: buildUniqueText('Baseline past memory', 'E2E-BASELINE-000'),
  });

  // Trip + visited place + a trip-linked memory + album.
  const tripTitle = buildUniqueText('Baseline trip', 'E2E-BASELINE-000');
  const tripMemoryNote = buildUniqueText('Baseline trip memory', 'E2E-BASELINE-000');
  const tripUrl = await createTrip(page, {
    endDate: createOffsetDateInput(3),
    note: buildUniqueText('Baseline trip note', 'E2E-BASELINE-000'),
    startDate: createOffsetDateInput(-3),
    title: tripTitle,
  });

  await addVisitedPlace(page, {
    note: buildUniqueText('Baseline visited place note', 'E2E-BASELINE-000'),
    title: buildUniqueText('Baseline visited place', 'E2E-BASELINE-000'),
    visitedOn: createTodayDateInput(),
  });

  await createMemory(page, {
    happenedAt: createOffsetDateTimeLocalInput(0, 11, 0),
    location: tripTitle,
    mediaPaths: memoryFixturePath,
    note: tripMemoryNote,
  });

  await page.goto(tripUrl);
  await createAlbum(page, {
    mediaMemoryNotes: [tripMemoryNote],
    note: buildUniqueText('Baseline album note', 'E2E-BASELINE-000'),
    title: buildUniqueText('Baseline album', 'E2E-BASELINE-000'),
  });

  // A countdown.
  await createCountdown(page, {
    note: buildUniqueText('Baseline countdown note', 'E2E-BASELINE-000'),
    targetDate: createOffsetDateInput(30),
    title: buildUniqueText('Baseline countdown', 'E2E-BASELINE-000'),
  });

  // A locked (future unlock) and an unlocked (today) future note.
  await sealFutureNote(page, {
    body: buildUniqueText('Baseline locked body', 'E2E-BASELINE-000'),
    title: buildUniqueText('Baseline locked note', 'E2E-BASELINE-000'),
    unlockDate: createOffsetDateInput(45),
  });
  await sealFutureNote(page, {
    body: buildUniqueText('Baseline unlocked body', 'E2E-BASELINE-000'),
    title: buildUniqueText('Baseline unlocked note', 'E2E-BASELINE-000'),
    unlockDate: createTodayDateInput(),
  });
});
