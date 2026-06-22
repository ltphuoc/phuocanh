import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { loginViaOtpHelper } from './support/journeys/auth-journeys';
import { E2E_BASE_URL, onboardingTimeZone } from './support/runtime';
import { createUniqueEmail } from './support/test-data';

// The privacy invariant: couple data is readable only by the couple's two members. Under the
// single-couple invariant the provable shape is guest-vs-couple and authed-non-member-vs-couple
// isolation plus foreign-id 404s (couple-vs-couple is impossible without a DB reset, out of scope).
// app-data is one catch-all route that returns 401 (guest) / 403 (authed, no couple) BEFORE the slug
// switch, so any valid slug exercises the gate.

const probedSlugs = ['home', 'lists', 'trips'] as const;

test('E2E-RLS-GUEST a guest cannot read couple app-data', async ({ browser }) => {
  const guestContext = await browser.newContext({
    locale: 'en-US',
    storageState: {
      cookies: [],
      origins: [],
    },
    timezoneId: onboardingTimeZone,
  });

  try {
    for (const slug of probedSlugs) {
      const response = await guestContext.request.get(`${E2E_BASE_URL}/api/app-data/${slug}`);

      expect(response.status(), slug).toBe(401);
      expect(response.headers()['cache-control'], slug).toBe('no-store');
      await expect(response.json()).resolves.toEqual({
        error: 'unauthenticated',
      });
    }
  } finally {
    await guestContext.close();
  }
});

test('E2E-RLS-NONMEMBER an authenticated non-member is denied couple app-data and gated to accept-invite', async ({
  browser,
}) => {
  test.slow();

  // Force a guest context: browser.newContext() otherwise inherits the project storageState
  // (partner-a), which would land this "non-member" on the authenticated home instead of login.
  const nonMemberContext = await browser.newContext({
    locale: 'en-US',
    storageState: {
      cookies: [],
      origins: [],
    },
    timezoneId: onboardingTimeZone,
  });

  try {
    const nonMemberPage = await nonMemberContext.newPage();
    await loginViaOtpHelper(nonMemberPage, createUniqueEmail('nonmember'));

    for (const slug of probedSlugs) {
      const response = await nonMemberContext.request.get(`${E2E_BASE_URL}/api/app-data/${slug}`);

      expect(response.status(), slug).toBe(403);
      expect(response.headers()['cache-control'], slug).toBe('no-store');
      await expect(response.json()).resolves.toEqual({
        error: 'couple_context_not_ready',
      });
    }

    await nonMemberPage.goto(`${E2E_BASE_URL}/en/home`);
    await expect(nonMemberPage).toHaveURL(/\/en\/accept-invite/);
  } finally {
    await nonMemberContext.close();
  }
});

test('E2E-RLS-FOREIGN-ROUTE foreign (valid but non-couple) detail ids render not found', async ({
  page,
}) => {
  // Valid UUIDs that do not belong to the couple must render the 404 page, NOT a 403 — a 403 would
  // confirm the row exists and leak its presence. RLS scopes the foreign id to zero rows, so the
  // loader calls notFound(). This covers the foreign-but-valid case across memories/trips/albums;
  // malformed ids (not-a-uuid) are covered by E2E-ROUTE-001 in auth-and-gatekeeping.spec.ts.
  for (const path of [
    `/en/memories/${randomUUID()}`,
    `/en/trips/${randomUUID()}`,
    `/en/albums/${randomUUID()}`,
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  }
});
