import type { Browser, Page } from '@playwright/test';

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { expect } from '@playwright/test';

import { waitForMagicLinkCode } from '../mailpit';
import {
  E2E_BASE_URL,
  onboardingTimeZone,
  partnerAStorageStatePath,
  partnerBStorageStatePath,
} from '../runtime';
import { buildUniqueText, createOffsetDateInput, createPartnerIdentity } from '../test-data';

interface VerifyEmailOtpResponse {
  readonly bodyText: string;
  readonly ok: boolean;
  readonly status: number;
}

export interface OnboardCoupleOptions {
  readonly coupleName: string;
  readonly startedDate: string;
  readonly timeZone: string;
}

// Verifies a Supabase email OTP through the app's test-only callback route. The fetch runs inside the
// page so the resulting session cookie is written to the page's browser context.
const verifyEmailOtpThroughAppRoute = async (
  page: Page,
  email: string,
  otpCode: string,
): Promise<void> => {
  const response = await page.evaluate<
    VerifyEmailOtpResponse,
    {
      readonly email: string;
      readonly otpCode: string;
    }
  >(
    async ({ email: requestEmail, otpCode: requestOtpCode }) => {
      const result = await fetch('/auth/callback/verify-email-otp', {
        body: JSON.stringify({
          email: requestEmail,
          otpCode: requestOtpCode,
        }),
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      return {
        bodyText: await result.text(),
        ok: result.ok,
        status: result.status,
      };
    },
    {
      email,
      otpCode,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to verify OTP for ${email}. Status ${response.status}. Response: ${response.bodyText}`,
    );
  }
};

// Logs the given page's context in as `email` via the magic-link OTP helper. Uses an absolute URL so
// it works for manually-created BrowserContexts (which do not inherit the project `baseURL`).
export const loginViaOtpHelper = async (page: Page, email: string): Promise<void> => {
  await page.goto(`${E2E_BASE_URL}/en/login`);
  // The login form hydrates after an initial loading skeleton; wait for it before interacting so a
  // cold BrowserContext does not stall on the not-yet-rendered email field.
  const emailField = page.getByLabel('Email');
  await emailField.waitFor({ state: 'visible', timeout: 30_000 });
  await emailField.fill(email);
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByText('Check your email for the magic link.')).toBeVisible();

  const otpCode = await waitForMagicLinkCode(email);
  await verifyEmailOtpThroughAppRoute(page, email, otpCode);
};

// Walks the first-couple onboarding wizard to completion, landing on /en/home.
export const onboardCouple = async (
  page: Page,
  { coupleName, startedDate, timeZone }: OnboardCoupleOptions,
): Promise<void> => {
  await page.goto('/en');
  await expect(page).toHaveURL(/\/en\/onboarding$/);

  await page.getByLabel('Couple name').fill(coupleName);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Couple timezone').fill(timeZone);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Started date').fill(startedDate);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Explicit confirmation').check();
  await page.getByRole('button', { name: 'Confirm and create space' }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
};

// Rewrites an app-generated URL onto the e2e server origin. Under `next start` (production runtime)
// the app builds invite links from the baked NEXT_PUBLIC_SITE_URL, which differs from the e2e
// server port — mirrors how the Mailpit helper normalizes magic-link callbacks.
const toTestOrigin = (rawUrl: string): string => {
  const url = new URL(rawUrl);
  const base = new URL(E2E_BASE_URL);
  url.host = base.host;
  url.protocol = base.protocol;

  return url.toString();
};

// Generates a partner invite from the home page and returns the invite URL on the e2e origin.
export const generateInvite = async (page: Page): Promise<string> => {
  await page.getByRole('button', { name: 'Generate partner invite' }).click();
  const inviteUrlButton = page.getByRole('button').filter({
    hasText: /accept-invite\?token=/,
  });
  await expect(inviteUrlButton).toBeVisible();
  const inviteUrl = await inviteUrlButton.textContent();
  if (!inviteUrl) {
    throw new Error('Invite URL button did not contain an invite URL.');
  }

  return toTestOrigin(inviteUrl.trim());
};

// Accepts a partner invite from an already-authenticated page, landing on /en/home.
export const acceptInvite = async (page: Page, inviteUrl: string): Promise<void> => {
  await page.goto(inviteUrl);
  await expect(page).toHaveURL(/\/en\/accept-invite\?token=/);
  await page.getByRole('button', { name: 'Join couple space' }).click();
  await expect(page).toHaveURL(/\/en\/home$/);
};

// Bootstraps the single couple end to end through the real UI: partner-A login + onboarding +
// invite, partner-B login + accept. Writes both partner storage states for later projects.
export const bootstrapCouple = async ({
  browser,
  page,
}: {
  readonly browser: Browser;
  readonly page: Page;
}): Promise<void> => {
  const partnerA = createPartnerIdentity('partner-a');
  const partnerB = createPartnerIdentity('partner-b');
  const coupleName = buildUniqueText('E2E Couple', 'E2E-AUTH-SETUP-000');
  const startedDate = createOffsetDateInput(-365);

  await mkdir(dirname(partnerAStorageStatePath), {
    recursive: true,
  });

  await page.goto('/');
  await expect(page).toHaveURL(/\/(en|vi)\/login$/);

  await page.goto('/en/login');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Welcome back',
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();

  await loginViaOtpHelper(page, partnerA.email);
  await onboardCouple(page, {
    coupleName,
    startedDate,
    timeZone: onboardingTimeZone,
  });

  const inviteUrl = await generateInvite(page);

  await page.context().storageState({
    path: partnerAStorageStatePath,
  });

  const partnerBContext = await browser.newContext({
    locale: 'en-US',
    timezoneId: onboardingTimeZone,
  });
  const partnerBPage = await partnerBContext.newPage();

  await loginViaOtpHelper(partnerBPage, partnerB.email);
  await acceptInvite(partnerBPage, inviteUrl);

  await partnerBContext.storageState({
    path: partnerBStorageStatePath,
  });
  await partnerBContext.close();
};
