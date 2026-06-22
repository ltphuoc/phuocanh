import type { Locator, Page } from '@playwright/test';

import { TZDate } from '@date-fns/tz';
import { expect, test } from '@playwright/test';

import { memoryFixturePath, onboardingTimeZone } from './support/runtime';
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createTodayDateInput,
} from './support/test-data';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stubGeoSearch = async (page: Page): Promise<() => number> => {
  let requestCount = 0;

  await page.route('**/api/geo/search**', async (route) => {
    requestCount += 1;
    await route.fulfill({
      contentType: 'application/json',
      json: {
        locations: [
          {
            address: 'Hoi An, Quang Nam, Vietnam',
            latitude: 15.8801,
            longitude: 108.338,
            name: 'Hoi An',
            provider: 'nominatim',
            providerId: 'relation:12345',
          },
        ],
      },
    });
  });

  return () => requestCount;
};

const replaceInputValue = async (input: Locator, value: string): Promise<void> => {
  await input.fill(value);
  await input.press('Tab');
};

const createCalendarDate = (dateInput: string): TZDate => {
  const [year, month, day] = dateInput.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date input: ${dateInput}`);
  }

  return new TZDate(year, month - 1, day, onboardingTimeZone);
};

const formatCalendarDateLabel = (dateInput: string): string =>
  new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: onboardingTimeZone,
    year: 'numeric',
  }).format(createCalendarDate(dateInput));

const getSectionByHeading = (page: Page, heading: string | RegExp): Locator =>
  page
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: heading }),
    })
    .last();

const getSectionByText = (page: Page, text: string | RegExp): Locator =>
  page
    .locator('section')
    .filter({
      hasText: text,
    })
    .last();

test('E2E-COUNT-001 / E2E-FNOTE-001 / E2E-TZ-001 countdowns, future notes, and timezone updates preserve selected calendar dates', async ({
  page,
}) => {
  test.slow();
  await stubGeoSearch(page);

  const countdownTitle = buildUniqueText(
    'Countdown with a very long milestone title that should wrap on mobile',
    'E2E-COUNT-001',
  );
  const countdownNote = buildUniqueText('Countdown note', 'E2E-COUNT-001');
  const lockedFutureNoteTitle = buildUniqueText('Locked note', 'E2E-FNOTE-001');
  const lockedFutureNoteBody = buildUniqueText('Locked note body', 'E2E-FNOTE-001');
  const unlockedFutureNoteTitle = buildUniqueText('Unlocked note', 'E2E-FNOTE-001');
  const unlockedFutureNoteBody = buildUniqueText('Unlocked note body', 'E2E-FNOTE-001');
  const countdownTargetDate = createOffsetDateInput(30);
  const countdownDateLabel = `On ${formatCalendarDateLabel(countdownTargetDate)}`;
  const lockedFutureNoteUnlockDate = createOffsetDateInput(45);
  const lockedUnlockDateLabel = `Unlocks ${formatCalendarDateLabel(lockedFutureNoteUnlockDate)}`;
  const unlockedFutureNoteUnlockDate = createTodayDateInput();
  const unlockedUnlockDateLabel = `Unlocks ${formatCalendarDateLabel(unlockedFutureNoteUnlockDate)}`;

  await page.goto('/en/settings');
  await replaceInputValue(page.getByLabel('Couple timezone'), 'Not/A_Real_Zone');
  await page.getByRole('button', { name: 'Save timezone' }).click();
  await expect(page.getByText('Enter a valid IANA timezone.')).toBeVisible();
  await expect(page.getByText(`Current timezone: ${onboardingTimeZone}`)).toBeVisible();

  await page.goto('/en/countdowns');
  await page.getByLabel('Title').fill(countdownTitle);
  await page.getByLabel('Type').selectOption('plan');
  await page.getByLabel('Target date').fill(countdownTargetDate);
  await page.getByLabel('Note (optional)').fill(countdownNote);
  await page.getByRole('button', { name: 'Save countdown' }).click();
  await expect(page.getByText(countdownTitle)).toBeVisible({
    timeout: 15_000,
  });

  const countdownCard = getSectionByText(page, countdownTitle);
  await expect(countdownCard.getByText(countdownNote)).toBeVisible();
  await expect(countdownCard.getByText(countdownDateLabel)).toBeVisible();
  await page.setViewportSize({ height: 900, width: 390 });
  const countdownCardBox = await countdownCard.boundingBox();
  expect(countdownCardBox?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect((countdownCardBox?.x ?? 0) + (countdownCardBox?.width ?? 0)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ height: 900, width: 1280 });

  await page.goto('/en/future-notes');
  await page.getByLabel('Title').fill(lockedFutureNoteTitle);
  await page.getByLabel('Unlock date').fill(lockedFutureNoteUnlockDate);
  await page.getByLabel('Note body').fill(lockedFutureNoteBody);
  await page.getByRole('button', { name: 'Seal future note' }).click();
  await expect(page.getByText(lockedFutureNoteTitle)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel('Title').fill(unlockedFutureNoteTitle);
  await page.getByLabel('Unlock date').fill(unlockedFutureNoteUnlockDate);
  await page.getByLabel('Note body').fill(unlockedFutureNoteBody);
  await page.getByRole('button', { name: 'Seal future note' }).click();
  await expect(page.getByText(unlockedFutureNoteTitle)).toBeVisible({
    timeout: 15_000,
  });

  const lockedFutureNoteCard = getSectionByHeading(page, lockedFutureNoteTitle);
  const unlockedFutureNoteCard = getSectionByHeading(page, unlockedFutureNoteTitle);

  await expect(lockedFutureNoteCard.getByText(lockedFutureNoteBody)).toBeHidden();
  await expect(lockedFutureNoteCard.getByText(lockedUnlockDateLabel)).toBeVisible();
  await expect(unlockedFutureNoteCard.getByText(unlockedUnlockDateLabel)).toBeVisible();
  await expect(unlockedFutureNoteCard.getByText(unlockedFutureNoteBody)).toBeVisible();

  await page.goto('/en/settings');
  await replaceInputValue(page.getByLabel('Couple timezone'), 'America/New_York');
  await page.getByRole('button', { name: 'Save timezone' }).click();
  // A changed zone now requires explicit confirmation before the destructive reconcile.
  await page.getByRole('button', { name: 'Yes, change timezone' }).click();
  await expect(page.getByText('Current timezone: America/New_York')).toBeVisible({
    timeout: 15_000,
  });

  await page.goto('/en/countdowns');
  await expect(getSectionByText(page, countdownTitle).getByText(countdownDateLabel)).toBeVisible();

  await page.goto('/en/future-notes');
  await expect(
    getSectionByHeading(page, lockedFutureNoteTitle).getByText(lockedUnlockDateLabel),
  ).toBeVisible();
  await expect(
    getSectionByHeading(page, unlockedFutureNoteTitle).getByText(unlockedUnlockDateLabel),
  ).toBeVisible();
  await expect(
    getSectionByHeading(page, unlockedFutureNoteTitle).getByText(unlockedFutureNoteBody),
  ).toBeVisible();

  await page.goto('/en/settings');
  await replaceInputValue(page.getByLabel('Couple timezone'), onboardingTimeZone);
  await page.getByRole('button', { name: 'Save timezone' }).click();
  await page.getByRole('button', { name: 'Yes, change timezone' }).click();
  await expect(page.getByText(`Current timezone: ${onboardingTimeZone}`)).toBeVisible({
    timeout: 15_000,
  });
});

test('E2E-TZ-002 a timezone change requires confirmation and cancel is non-destructive', async ({
  page,
}) => {
  // Picks a zone no other test saves, so asserting it is never applied is order-independent.
  const abandonedZone = 'Europe/Paris';

  await page.goto('/en/settings');
  await replaceInputValue(page.getByLabel('Couple timezone'), abandonedZone);
  await page.getByRole('button', { name: 'Save timezone' }).click();

  const confirmWarning = page.getByText(
    "Changing your timezone may clear today's not-yet-revealed game rounds",
    { exact: false },
  );
  await expect(confirmWarning).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirmWarning).toBeHidden();
  // Cancel saved nothing: the current-zone label never shows the abandoned target.
  await expect(page.getByText(`Current timezone: ${abandonedZone}`)).toBeHidden();
});

test('E2E-TRIP-001 / E2E-PLACE-001 / E2E-ALBUM-001 trips, visited places, albums, and invalid detail routes behave correctly', async ({
  page,
}) => {
  test.slow();
  const getGeoSearchCount = await stubGeoSearch(page);

  const tripTitle = buildUniqueText('Trip', 'E2E-TRIP-001');
  const tripNote = buildUniqueText('Trip note', 'E2E-TRIP-001');
  const visitedPlaceTitle = buildUniqueText('Visited place', 'E2E-PLACE-001');
  const visitedPlaceNote = buildUniqueText('Visited place note', 'E2E-PLACE-001');
  const firstTripMemoryNote = buildUniqueText('Trip memory one', 'E2E-ALBUM-001');
  const secondTripMemoryNote = buildUniqueText('Trip memory two', 'E2E-ALBUM-001');
  const albumTitle = buildUniqueText('Album', 'E2E-ALBUM-001');
  const albumNote = buildUniqueText('Album note', 'E2E-ALBUM-001');

  await page.goto('/en/trips');
  await page.getByLabel('Trip title').fill(buildUniqueText('Invalid trip', 'E2E-TRIP-000'));
  await page.getByLabel('Start date').fill(createOffsetDateInput(2));
  await page.getByLabel('End date').fill(createOffsetDateInput(-2));
  await page.getByRole('button', { name: 'Save trip' }).click();
  await expect(page.getByText('End date must be on or after the start date.')).toBeVisible();

  await page.goto('/en/trips');
  await page.getByLabel('Trip title').fill(tripTitle);
  await page.getByLabel('Trip location').fill('Hoi An');
  await page.waitForTimeout(350);
  expect(getGeoSearchCount()).toBe(0);
  await page.getByLabel('Trip location').press('Enter');
  await page.getByRole('button', { name: 'Hoi An Hoi An, Quang Nam, Vietnam' }).click();
  await page.getByLabel('Start date').fill(createOffsetDateInput(-2));
  await page.getByLabel('End date').fill(createOffsetDateInput(2));
  await page.getByLabel('Trip note (optional)').fill(tripNote);
  await page.getByRole('button', { name: 'Save trip' }).click();
  await expect(page.getByRole('link', { name: new RegExp(tripTitle) })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('link', { name: new RegExp(tripTitle) }).click();
  await expect(page).toHaveURL(/\/en\/trips\/[0-9a-f-]+$/);
  const tripUrl = page.url();

  await page.getByLabel('Place title').fill(buildUniqueText('Invalid place', 'E2E-PLACE-000'));
  await page.getByLabel('Visited on').fill(createOffsetDateInput(10));
  await page.getByRole('button', { name: 'Save visited place' }).click();
  await expect(page.getByText('Choose a date inside this trip window.')).toBeVisible();

  await page.getByLabel('Place title').fill(visitedPlaceTitle);
  await page.getByLabel('Mapped place').fill('Hoi An');
  await page.getByLabel('Mapped place').press('Enter');
  await page.getByRole('button', { name: 'Hoi An Hoi An, Quang Nam, Vietnam' }).click();
  await page.getByLabel('Visited on').fill(createTodayDateInput());
  await page.getByLabel('Place note (optional)').fill(visitedPlaceNote);
  await page.getByRole('button', { name: 'Save visited place' }).click();
  await expect(page.getByText(visitedPlaceTitle)).toBeVisible({
    timeout: 15_000,
  });

  await page.goto('/en/map');
  await expect(page.getByRole('heading', { name: 'Places map' })).toBeVisible();
  await expect(page.getByRole('button', { exact: true, name: visitedPlaceTitle })).toBeVisible();

  await page.goto('/en/memories/new');
  await page.getByLabel('Happened at').fill(createOffsetDateTimeLocalInput(-1, 10, 15));
  await page.getByLabel('Location').fill(tripTitle);
  await page.getByLabel('Note').fill(firstTripMemoryNote);
  await page.getByLabel('Media').setInputFiles(memoryFixturePath);
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto('/en/memories/new');
  await page.getByLabel('Happened at').fill(createOffsetDateTimeLocalInput(0, 15, 45));
  await page.getByLabel('Location').fill(tripTitle);
  await page.getByLabel('Note').fill(secondTripMemoryNote);
  await page.getByLabel('Media').setInputFiles(memoryFixturePath);
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto(tripUrl);
  await expect(page.getByText(firstTripMemoryNote)).toBeVisible();
  await expect(page.getByText(secondTripMemoryNote)).toBeVisible();

  const albumComposer = page
    .locator('form')
    .filter({
      has: page.getByLabel('Album title'),
    })
    .first();
  await albumComposer.getByLabel('Album title').fill(albumTitle);
  await albumComposer.getByLabel('Album note (optional)').fill(albumNote);
  await albumComposer.getByRole('button', { name: 'Create album' }).click();
  await expect(albumComposer.getByText('Select at least one memory item.')).toBeVisible();
  const firstAlbumMediaCheckbox = albumComposer.getByRole('checkbox', {
    name: new RegExp(escapeRegExp(firstTripMemoryNote)),
  });
  await albumComposer.getByText(firstTripMemoryNote, { exact: true }).click();
  await expect(firstAlbumMediaCheckbox).toBeChecked();
  await albumComposer.getByRole('button', { name: 'Create album' }).click();
  await expect(page.getByRole('link', { name: new RegExp(albumTitle) })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('heading', { name: 'This trip already has an album' })).toBeVisible();
  await expect(page.getByLabel('Album title')).toBeHidden();

  const addAlbumItemsForm = page
    .locator('form')
    .filter({
      has: page.getByRole('button', { name: 'Add selected media' }),
    })
    .first();
  const secondAlbumMediaCheckbox = addAlbumItemsForm.getByRole('checkbox', {
    name: new RegExp(escapeRegExp(secondTripMemoryNote)),
  });
  await addAlbumItemsForm.getByText(secondTripMemoryNote, { exact: true }).click();
  await expect(secondAlbumMediaCheckbox).toBeChecked();
  await addAlbumItemsForm.getByRole('button', { name: 'Add selected media' }).click();
  await expect(addAlbumItemsForm.getByText(secondTripMemoryNote)).toBeHidden({
    timeout: 15_000,
  });
  const linkedAlbum = page.getByRole('link', { name: new RegExp(albumTitle) }).first();
  await expect(linkedAlbum).toBeVisible();
  await expect(linkedAlbum.getByText('2 items')).toBeVisible({
    timeout: 15_000,
  });

  await linkedAlbum.click();
  await expect(page).toHaveURL(/\/en\/albums\/[0-9a-f-]+$/);
  await expect(page.getByText(firstTripMemoryNote)).toBeVisible();
  await expect(page.getByText(secondTripMemoryNote)).toBeVisible();

  await page.goto('/en/albums');
  await expect(page.getByRole('heading', { name: 'Albums' })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(albumTitle) })).toBeVisible();

  const updatedTripNote = buildUniqueText('Updated trip note', 'E2E-TRIP-EDIT');
  await page.goto(tripUrl);
  await page.getByLabel('Trip note (optional)').last().fill(updatedTripNote);
  await page.getByRole('button', { name: 'Update trip' }).click();
  await expect(page.getByText(updatedTripNote).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel(/I understand this will delete this trip/).check();
  await page.getByRole('button', { name: 'Delete trip' }).click();
  await expect(page).toHaveURL(/\/en\/trips$/, {
    timeout: 15_000,
  });
  await expect(page.getByText(updatedTripNote)).toBeHidden();

  await page.goto('/en/trips/not-a-uuid');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

  await page.goto('/en/albums/not-a-uuid');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
