import { expect, test } from '@playwright/test';

import { E2E_BASE_URL, onboardingTimeZone, partnerAStorageStatePath } from './support/runtime';

const implementedAppDataPaths = [
  '/api/app-data/home',
  '/api/app-data/lists',
  '/api/app-data/on-this-day',
  '/api/app-data/countdowns',
  '/api/app-data/future-notes',
  '/api/app-data/trips',
  '/api/app-data/albums',
  '/api/app-data/map',
  '/api/app-data/games',
  '/api/app-data/games/daily-question',
  '/api/app-data/games/guess-date',
  '/api/app-data/games/trivia',
  '/api/app-data/stats',
  '/api/app-data/settings',
] as const;

test('E2E-APPDATA-001 app-data routes enforce auth and no-store JSON contracts', async ({
  browser,
}) => {
  const guestContext = await browser.newContext({
    locale: 'en-US',
    storageState: {
      cookies: [],
      origins: [],
    },
    timezoneId: onboardingTimeZone,
  });
  const guestHomeResponse = await guestContext.request.get(`${E2E_BASE_URL}/api/app-data/home`);

  expect(guestHomeResponse.status()).toBe(401);
  expect(guestHomeResponse.headers()['cache-control']).toBe('no-store');
  await expect(guestHomeResponse.json()).resolves.toEqual({
    error: 'unauthenticated',
  });
  await guestContext.close();

  const partnerAContext = await browser.newContext({
    locale: 'en-US',
    storageState: partnerAStorageStatePath,
    timezoneId: onboardingTimeZone,
  });

  for (const path of implementedAppDataPaths) {
    const response = await partnerAContext.request.get(`${E2E_BASE_URL}${path}`);

    expect(response.status(), path).toBe(200);
    expect(response.headers()['cache-control'], path).toBe('no-store');

    const body = await response.json();
    expect(body, path).toMatchObject({
      context: {
        timeZone: onboardingTimeZone,
      },
    });

    if (path === '/api/app-data/settings') {
      expect(body).toMatchObject({
        currentTimeZone: onboardingTimeZone,
      });
    }
  }

  const notFoundPaths = [
    '/api/app-data/games/unknown',
    '/api/app-data/memories/not-a-uuid',
    '/api/app-data/trips/not-a-uuid',
    '/api/app-data/albums/not-a-uuid',
  ] as const;

  for (const path of notFoundPaths) {
    const response = await partnerAContext.request.get(`${E2E_BASE_URL}${path}`);

    expect(response.status()).toBe(404);
    expect(response.headers()['cache-control']).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'not_found',
    });
  }

  // Home and on-this-day memory previews must expose the object key ONLY inside a
  // short-lived, member-scoped signed URL (Supabase embeds the object path in the
  // signed link and gates access with a token). The raw `storagePath`/`storage_path`
  // field and any bare, un-signed object key must never leave the server.
  const objectKeyPattern = /couples\/[0-9a-f-]+\/memories\//i;
  const signedMediaUrlPattern = /https?:\/\/[^"\\]*\/storage\/v1\/object\/sign\/[^"\\]*/gi;
  for (const path of ['/api/app-data/home', '/api/app-data/on-this-day'] as const) {
    const response = await partnerAContext.request.get(`${E2E_BASE_URL}${path}`);
    const rawBody = await response.text();

    expect(rawBody, path).not.toContain('storagePath');
    expect(rawBody, path).not.toContain('storage_path');
    // Strip the sanctioned signed URLs, then assert no bare object key remains.
    const bodyWithoutSignedUrls = rawBody.replace(signedMediaUrlPattern, '');
    expect(objectKeyPattern.test(bodyWithoutSignedUrls), path).toBe(false);
  }

  await partnerAContext.close();
});
