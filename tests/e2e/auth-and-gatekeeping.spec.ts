import { expect, test } from '@playwright/test';

import { generateInvite } from './support/journeys/auth-journeys';
import { waitForMagicLinkUrl } from './support/mailpit';
import { E2E_BASE_URL, onboardingTimeZone, partnerAStorageStatePath } from './support/runtime';
import { createPartnerIdentity } from './support/test-data';

const protectedRoutePaths = ['/en/home', '/en/memories/new', '/en/games/daily-question'] as const;

test('E2E-AUTH-001 root redirects guests to the localized login page', async ({ browser }) => {
  const guestContext = await browser.newContext({
    locale: 'en-US',
    storageState: {
      cookies: [],
      origins: [],
    },
    timezoneId: onboardingTimeZone,
  });

  try {
    const guestPage = await guestContext.newPage();

    await guestPage.goto(E2E_BASE_URL);
    await expect(guestPage).toHaveURL(/\/(en|vi)\/login$/);
    await expect(
      guestPage.getByRole('heading', {
        level: 1,
        name: 'Welcome back',
      }),
    ).toBeVisible();
  } finally {
    await guestContext.close();
  }
});

test('E2E-AUTH-005 OTP helper rejects invalid payloads without setting a session', async ({
  request,
}) => {
  const response = await request.post('/auth/callback/verify-email-otp', {
    data: {
      email: 'not-an-email-address',
      otpCode: 'not-a-code',
    },
  });

  expect(response.status()).toBe(400);
  expect(response.headers()['set-cookie']).toBeUndefined();
  await expect(response.json()).resolves.toEqual({
    error: 'Invalid OTP verification request.',
  });
});

test('E2E-AUTH-004 protected app routes redirect guests to localized login', async ({
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

  try {
    const guestPage = await guestContext.newPage();

    for (const path of protectedRoutePaths) {
      await guestPage.goto(`${E2E_BASE_URL}${path}`);

      const redirectedUrl = new URL(guestPage.url());
      expect(redirectedUrl.pathname).toBe('/en/login');
    }
  } finally {
    await guestContext.close();
  }
});

test('E2E-AUTH-002 partner auth state redirects root to home', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en\/home$/);
  await expect(page.getByRole('heading', { name: 'Latest chapters' })).toBeVisible();
});

test('E2E-ROUTE-001 invalid detail routes render not found', async ({ page }) => {
  for (const path of ['/en/memories/not-a-uuid', '/en/trips/not-a-uuid', '/en/albums/not-a-uuid']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  }
});

test('E2E-AUTH-003 invite login preserves token through the Mailpit magic link', async ({
  browser,
}) => {
  const partnerB = createPartnerIdentity('partner-b');
  const partnerAContext = await browser.newContext({
    locale: 'en-US',
    storageState: partnerAStorageStatePath,
    timezoneId: onboardingTimeZone,
  });
  let guestContext: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    const partnerAPage = await partnerAContext.newPage();

    await partnerAPage.goto('/en/home');
    const inviteUrl = await generateInvite(partnerAPage, partnerB.email);

    const invitePath = new URL(inviteUrl).pathname + new URL(inviteUrl).search;

    guestContext = await browser.newContext({
      locale: 'en-US',
      storageState: {
        cookies: [],
        origins: [],
      },
      timezoneId: onboardingTimeZone,
    });
    const guestPage = await guestContext.newPage();

    await guestPage.goto(inviteUrl);
    await expect(guestPage).toHaveURL(
      new RegExp(`/en/login\\?next=${encodeURIComponent(invitePath)}`),
    );
    await guestPage.getByLabel('Email').fill(partnerB.email);
    await guestPage.getByRole('button', { name: 'Send magic link' }).click();
    await expect(guestPage.getByText('Check your email for the magic link.')).toBeVisible();

    const magicLinkUrl = await waitForMagicLinkUrl(partnerB.email);
    const callbackPage = await guestContext.newPage();
    await callbackPage.goto(magicLinkUrl);
    await expect(callbackPage).toHaveURL(
      new RegExp(`${invitePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    );
    await callbackPage.getByRole('button', { name: 'Join couple space' }).click();
    // partner-b already joined the couple during setup, so re-accepting an unused
    // invite no longer burns the token or redirects: accept_couple_invite raises
    // INVITE_ALREADY_MEMBER, which the app surfaces as a friendly notice while
    // leaving the caller on the accept-invite page (token stays usable).
    await expect(callbackPage.getByText(/already in this couple space/i)).toBeVisible();
    await expect(callbackPage).toHaveURL(
      new RegExp(`${invitePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    );
  } finally {
    await guestContext?.close();
    await partnerAContext.close();
  }
});
