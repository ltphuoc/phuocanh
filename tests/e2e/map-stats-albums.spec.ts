import type { Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import {
  addVisitedPlace,
  createAlbum,
  createMemory,
  createTrip,
} from './support/journeys/seed-journeys';
import { memoryFixturePath } from './support/runtime';
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createTodayDateInput,
} from './support/test-data';

const stubGeoSearch = async (page: Page): Promise<void> => {
  await page.route('**/api/geo/search**', async (route) => {
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
};

// Stats reads couple-global gameplay state seeded once in first-run (streak/rounds), so it asserts
// the stat-card surface without creating data. Map and albums reads create their own tokenized trip,
// place, memory, and album and assert only on those tokens.

test('E2E-STATS-CONTENT stats surfaces streak, rounds, completed, and participation cards', async ({
  page,
}) => {
  await page.goto('/en/stats');
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
  await expect(page.getByText('Current streak')).toBeVisible();
  await expect(page.getByText('1 day')).toBeVisible();
  await expect(page.getByText('Rounds created')).toBeVisible();
  await expect(page.getByText('Completed rounds')).toBeVisible();
  await expect(page.getByText('Your participation rate')).toBeVisible();
  await expect(page.getByText(/^Completed$/).first()).toBeVisible();
});

test('E2E-MAP-READ / E2E-ALBUMS-READ a tokenized place appears on the map and a tokenized album on the index', async ({
  page,
}) => {
  test.slow();
  await stubGeoSearch(page);

  const tripTitle = buildUniqueText('Atlas trip', 'E2E-MAP-READ');
  const placeTitle = buildUniqueText('Atlas place', 'E2E-MAP-READ');
  const tripMemoryNote = buildUniqueText('Atlas trip memory', 'E2E-ALBUMS-READ');
  const albumTitle = buildUniqueText('Atlas album', 'E2E-ALBUMS-READ');

  const tripUrl = await createTrip(page, {
    endDate: createOffsetDateInput(3),
    startDate: createOffsetDateInput(-3),
    title: tripTitle,
  });

  await addVisitedPlace(page, {
    geoResultButtonName: 'Hoi An Hoi An, Quang Nam, Vietnam',
    mappedPlace: 'Hoi An',
    title: placeTitle,
    visitedOn: createTodayDateInput(),
  });

  await page.goto('/en/map');
  await expect(page.getByRole('heading', { name: 'Places map' })).toBeVisible();
  await expect(page.getByRole('button', { exact: true, name: placeTitle })).toBeVisible();

  await createMemory(page, {
    happenedAt: createOffsetDateTimeLocalInput(0, 11, 0),
    location: tripTitle,
    mediaPaths: memoryFixturePath,
    note: tripMemoryNote,
  });

  await page.goto(tripUrl);
  await createAlbum(page, {
    mediaMemoryNotes: [tripMemoryNote],
    title: albumTitle,
  });

  await page.goto('/en/albums');
  await expect(page.getByRole('heading', { name: 'Albums' })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(albumTitle) })).toBeVisible();
});
