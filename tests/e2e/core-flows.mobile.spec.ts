import type { Locator } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { loginViaOtpHelper } from './support/journeys/auth-journeys';
import { createAlbum, createMemory, createTrip } from './support/journeys/seed-journeys';
import { E2E_BASE_URL, memoryFixturePath, onboardingTimeZone } from './support/runtime';
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createPartnerIdentity,
  createTodayDateTimeLocalInput,
} from './support/test-data';

// Phone-viewport pass (390px). Flows reuse the journey library; assertions are coarse invariants
// (flow succeeds + the key surface stays within the viewport), not pixel-perfect. Mobile onboarding
// is out of scope (single-couple invariant) — these cover login → existing-couple home and the core
// create flows on a phone-width Chromium viewport.

const VIEWPORT_WIDTH = 390;

const expectWithinViewport = async (locator: Locator): Promise<void> => {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
};

test('E2E-MOBILE-LOGIN login lands on the existing-couple home within the phone viewport', async ({
  browser,
}) => {
  test.slow();

  // Force a guest context (browser.newContext() inherits the project's partner-a storageState),
  // otherwise the login page redirects straight to the authenticated home.
  const context = await browser.newContext({
    locale: 'en-US',
    storageState: {
      cookies: [],
      origins: [],
    },
    timezoneId: onboardingTimeZone,
    viewport: {
      height: 844,
      width: VIEWPORT_WIDTH,
    },
  });

  try {
    const page = await context.newPage();
    await page.goto(`${E2E_BASE_URL}/en/login`);
    // Wait for the form to hydrate past its loading skeleton before measuring it.
    await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 30_000 });
    await expectWithinViewport(page.getByLabel('Email'));
    await expectWithinViewport(page.getByRole('button', { name: 'Send magic link' }));

    await loginViaOtpHelper(page, createPartnerIdentity('partner-a').email);
    await page.goto(`${E2E_BASE_URL}/en/home`);
    await expect(page).toHaveURL(/\/en\/home$/);
    // The 390px layout renders the mobile home shell (the desktop "Latest chapters" heading is
    // hidden), so assert a mobile-visible affordance instead.
    await expect(page.getByRole('link', { name: 'Add memory' }).first()).toBeVisible();
  } finally {
    await context.close();
  }
});

test('E2E-MOBILE-MEMORY create a memory on a phone viewport', async ({ page }) => {
  test.slow();

  const note = buildUniqueText('Mobile memory', 'E2E-MOBILE-MEMORY');
  await createMemory(page, {
    happenedAt: createTodayDateTimeLocalInput(9, 0),
    note,
  });

  const noteOnHome = page.getByText(note).first();
  await expect(noteOnHome).toBeVisible();
  await expectWithinViewport(noteOnHome);
});

test('E2E-MOBILE-CHECKLIST add and toggle a checklist item on a phone viewport', async ({
  page,
}) => {
  test.slow();

  const checklistTitle = buildUniqueText('Mobile checklist', 'E2E-MOBILE-CHECKLIST');
  const itemText = buildUniqueText('Mobile item', 'E2E-MOBILE-CHECKLIST');

  await page.goto('/en/home');
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
  await checklistCard.getByPlaceholder('Add item').fill(itemText);
  await checklistCard.getByRole('button', { exact: true, name: 'Add' }).click();
  await expect(checklistCard.getByText(itemText)).toBeVisible({
    timeout: 15_000,
  });
  await expectWithinViewport(checklistCard);

  await checklistCard.getByRole('button', { name: 'Done' }).click();
  await expect(checklistCard.getByText('Completed')).toBeVisible({
    timeout: 15_000,
  });
});

test('E2E-MOBILE-TRIP create a trip on a phone viewport', async ({ page }) => {
  test.slow();

  const tripTitle = buildUniqueText('Mobile trip', 'E2E-MOBILE-TRIP');
  await createTrip(page, {
    endDate: createOffsetDateInput(3),
    startDate: createOffsetDateInput(-3),
    title: tripTitle,
  });

  const tripTitleOnDetail = page.getByText(tripTitle).first();
  await expect(tripTitleOnDetail).toBeVisible();
  await expectWithinViewport(tripTitleOnDetail);
});

test('E2E-MOBILE-ALBUM select media and create an album on a phone viewport', async ({ page }) => {
  test.slow();

  const tripTitle = buildUniqueText('Mobile album trip', 'E2E-MOBILE-ALBUM');
  const memoryNote = buildUniqueText('Mobile album memory', 'E2E-MOBILE-ALBUM');
  const albumTitle = buildUniqueText('Mobile album', 'E2E-MOBILE-ALBUM');

  const tripUrl = await createTrip(page, {
    endDate: createOffsetDateInput(3),
    startDate: createOffsetDateInput(-3),
    title: tripTitle,
  });
  await createMemory(page, {
    happenedAt: createOffsetDateTimeLocalInput(0, 11, 0),
    location: tripTitle,
    mediaPaths: memoryFixturePath,
    note: memoryNote,
  });

  await page.goto(tripUrl);
  await createAlbum(page, {
    mediaMemoryNotes: [memoryNote],
    title: albumTitle,
  });

  const albumLink = page.getByRole('link', { name: new RegExp(albumTitle) }).first();
  await expect(albumLink).toBeVisible();
  await expectWithinViewport(albumLink);
});

test('E2E-MOBILE-TIMEZONE update the couple timezone on a phone viewport', async ({ page }) => {
  test.slow();

  // Serial-only: this writes the couple-global timezone (then restores it). Safe under workers:1;
  // would become order-sensitive against the global streak/hub reads if workers > 1 is enabled.
  await page.goto('/en/settings');
  const timezoneInput = page.getByLabel('Couple timezone');
  await expectWithinViewport(timezoneInput);

  try {
    await timezoneInput.fill('America/New_York');
    await timezoneInput.press('Tab');
    await page.getByRole('button', { name: 'Save timezone' }).click();
    // A changed zone now requires explicit confirmation before the destructive reconcile.
    await page.getByRole('button', { name: 'Yes, change timezone' }).click();
    await expect(page.getByText('Current timezone: America/New_York')).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    // Restore the onboarding-default timezone in `finally` so it runs even when the assertion above
    // times out (the save can lag past 15s under load). Otherwise a failed assertion would leave the
    // shared couple on America/New_York and cascade into every later tz-sensitive test under workers:1.
    await timezoneInput.fill(onboardingTimeZone);
    await timezoneInput.press('Tab');
    await page.getByRole('button', { name: 'Save timezone' }).click();
    await page.getByRole('button', { name: 'Yes, change timezone' }).click();
    await expect(page.getByText(`Current timezone: ${onboardingTimeZone}`)).toBeVisible({
      timeout: 15_000,
    });
  }
});
