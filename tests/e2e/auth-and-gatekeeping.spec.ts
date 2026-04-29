import { expect, test } from '@playwright/test';

import { waitForMagicLinkUrl } from './support/mailpit';
import { E2E_BASE_URL, onboardingTimeZone } from './support/runtime';
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
  const guestPage = await guestContext.newPage();

  await guestPage.goto(E2E_BASE_URL);
  await expect(guestPage).toHaveURL(/\/(en|vi)\/login$/);
  await expect(
    guestPage.getByRole('heading', {
      level: 1,
      name: 'Welcome back',
    }),
  ).toBeVisible();

  await guestContext.close();
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
  const guestPage = await guestContext.newPage();

  for (const path of protectedRoutePaths) {
    await guestPage.goto(`${E2E_BASE_URL}${path}`);

    const redirectedUrl = new URL(guestPage.url());
    expect(redirectedUrl.pathname).toBe('/en/login');
  }

  await guestContext.close();
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
    storageState: 'playwright/.auth/partner-a.json',
    timezoneId: onboardingTimeZone,
  });
  const partnerAPage = await partnerAContext.newPage();

  await partnerAPage.goto('/en/home');
  await partnerAPage.getByRole('button', { name: 'Generate partner invite' }).click();

  const inviteUrlButton = partnerAPage.getByRole('button').filter({
    hasText: /accept-invite\?token=/,
  });
  await expect(inviteUrlButton).toBeVisible();
  const inviteUrl = (await inviteUrlButton.textContent())?.trim();
  if (!inviteUrl) {
    throw new Error('Invite URL button did not contain an invite URL.');
  }

  const invitePath = new URL(inviteUrl).pathname + new URL(inviteUrl).search;

  const guestContext = await browser.newContext({
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
  await expect(callbackPage).toHaveURL(/\/en\/home$/);

  await guestContext.close();
  await partnerAContext.close();
});
