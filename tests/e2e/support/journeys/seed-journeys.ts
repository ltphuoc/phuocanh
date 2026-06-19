import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface CreateMemoryOptions {
  readonly happenedAt: string;
  // When set, picks this geo result button after typing `location` and pressing Enter.
  readonly geoResultButtonName?: string;
  readonly location?: string;
  readonly mediaPaths?: string | string[];
  readonly note?: string;
}

export interface CreateCountdownOptions {
  readonly note?: string;
  readonly targetDate: string;
  readonly title: string;
  readonly type?: string;
}

export interface SealFutureNoteOptions {
  readonly body: string;
  readonly title: string;
  readonly unlockDate: string;
}

export interface CreateTripOptions {
  readonly endDate: string;
  readonly geoResultButtonName?: string;
  readonly location?: string;
  readonly note?: string;
  readonly startDate: string;
  readonly title: string;
}

export interface AddVisitedPlaceOptions {
  readonly geoResultButtonName?: string;
  readonly mappedPlace?: string;
  readonly note?: string;
  readonly title: string;
  readonly visitedOn: string;
}

export interface CreateAlbumOptions {
  readonly mediaMemoryNotes: readonly string[];
  readonly note?: string;
  readonly title: string;
}

// Creates a memory through /en/memories/new and waits for the redirect back to home. Location, geo
// pick, note, and media are all optional so callers compose exactly the memory they need.
export const createMemory = async (page: Page, options: CreateMemoryOptions): Promise<void> => {
  await page.goto('/en/memories/new');
  await page.getByLabel('Happened at').fill(options.happenedAt);

  if (options.location !== undefined) {
    await page.getByLabel('Location').fill(options.location);
    if (options.geoResultButtonName) {
      await page.getByLabel('Location').press('Enter');
      await page.getByRole('button', { name: options.geoResultButtonName }).click();
    }
  }

  if (options.note !== undefined) {
    await page.getByLabel('Note').fill(options.note);
  }

  if (options.mediaPaths !== undefined) {
    await page.getByLabel('Media').setInputFiles(options.mediaPaths);
  }

  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });
};

// Creates a countdown on /en/countdowns and waits for it to appear in the list.
export const createCountdown = async (
  page: Page,
  options: CreateCountdownOptions,
): Promise<void> => {
  await page.goto('/en/countdowns');
  await page.getByLabel('Title').fill(options.title);
  await page.getByLabel('Type').selectOption(options.type ?? 'plan');
  await page.getByLabel('Target date').fill(options.targetDate);
  if (options.note !== undefined) {
    await page.getByLabel('Note (optional)').fill(options.note);
  }
  await page.getByRole('button', { name: 'Save countdown' }).click();
  await expect(page.getByText(options.title)).toBeVisible({
    timeout: 15_000,
  });
};

// Seals a future note on /en/future-notes and waits for it to appear in the list.
export const sealFutureNote = async (page: Page, options: SealFutureNoteOptions): Promise<void> => {
  await page.goto('/en/future-notes');
  await page.getByLabel('Title').fill(options.title);
  await page.getByLabel('Unlock date').fill(options.unlockDate);
  await page.getByLabel('Note body').fill(options.body);
  await page.getByRole('button', { name: 'Seal future note' }).click();
  await expect(page.getByText(options.title)).toBeVisible({
    timeout: 15_000,
  });
};

// Creates a trip on /en/trips, opens its detail page, and returns the detail URL. Leaves the page on
// the trip detail so callers can immediately add visited places or albums.
export const createTrip = async (page: Page, options: CreateTripOptions): Promise<string> => {
  await page.goto('/en/trips');
  await page.getByLabel('Trip title').fill(options.title);

  if (options.location !== undefined) {
    await page.getByLabel('Trip location').fill(options.location);
    if (options.geoResultButtonName) {
      await page.getByLabel('Trip location').press('Enter');
      await page.getByRole('button', { name: options.geoResultButtonName }).click();
    }
  }

  await page.getByLabel('Start date').fill(options.startDate);
  await page.getByLabel('End date').fill(options.endDate);
  if (options.note !== undefined) {
    await page.getByLabel('Trip note (optional)').fill(options.note);
  }
  await page.getByRole('button', { name: 'Save trip' }).click();

  const tripLink = page.getByRole('link', {
    name: new RegExp(escapeRegExp(options.title)),
  });
  await expect(tripLink).toBeVisible({
    timeout: 15_000,
  });
  await tripLink.click();
  await expect(page).toHaveURL(/\/en\/trips\/[0-9a-f-]+$/);

  return page.url();
};

// Adds a visited place on the currently-open trip detail page and waits for it to appear.
export const addVisitedPlace = async (
  page: Page,
  options: AddVisitedPlaceOptions,
): Promise<void> => {
  await page.getByLabel('Place title').fill(options.title);
  if (options.mappedPlace !== undefined) {
    await page.getByLabel('Mapped place').fill(options.mappedPlace);
    if (options.geoResultButtonName) {
      await page.getByLabel('Mapped place').press('Enter');
      await page.getByRole('button', { name: options.geoResultButtonName }).click();
    }
  }
  await page.getByLabel('Visited on').fill(options.visitedOn);
  if (options.note !== undefined) {
    await page.getByLabel('Place note (optional)').fill(options.note);
  }
  await page.getByRole('button', { name: 'Save visited place' }).click();
  await expect(page.getByText(options.title)).toBeVisible({
    timeout: 15_000,
  });
};

// Creates an album on the currently-open trip detail page from the given eligible memory notes and
// waits for the album link to appear.
export const createAlbum = async (page: Page, options: CreateAlbumOptions): Promise<void> => {
  const albumComposer = page
    .locator('form')
    .filter({
      has: page.getByLabel('Album title'),
    })
    .first();
  await albumComposer.getByLabel('Album title').fill(options.title);
  if (options.note !== undefined) {
    await albumComposer.getByLabel('Album note (optional)').fill(options.note);
  }
  for (const memoryNote of options.mediaMemoryNotes) {
    await albumComposer.getByText(memoryNote, { exact: true }).click();
  }
  await albumComposer.getByRole('button', { name: 'Create album' }).click();
  await expect(
    page.getByRole('link', {
      name: new RegExp(escapeRegExp(options.title)),
    }),
  ).toBeVisible({
    timeout: 15_000,
  });
};
