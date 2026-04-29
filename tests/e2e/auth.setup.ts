import type { Page } from '@playwright/test';

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { expect, test } from '@playwright/test';

import { waitForMagicLinkCode } from './support/mailpit';
import {
  E2E_BASE_URL,
  onboardingTimeZone,
  partnerAStorageStatePath,
  partnerBStorageStatePath,
} from './support/runtime';
import { buildUniqueText, createOffsetDateInput, createPartnerIdentity } from './support/test-data';

interface VerifyEmailOtpResponse {
  readonly bodyText: string;
  readonly ok: boolean;
  readonly status: number;
}

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

test('E2E-AUTH-SETUP-000 bootstrap partner auth states with real magic links', async ({
  browser,
  page,
}) => {
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
  await page.getByLabel('Email').fill(partnerA.email);
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await expect(page.getByText('Check your email for the magic link.')).toBeVisible();

  const partnerAOtpCode = await waitForMagicLinkCode(partnerA.email);
  await verifyEmailOtpThroughAppRoute(page, partnerA.email, partnerAOtpCode);
  await page.goto('/en');
  await expect(page).toHaveURL(/\/en\/onboarding$/);

  await page.getByLabel('Couple name').fill(coupleName);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Couple timezone').fill(onboardingTimeZone);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Started date').fill(startedDate);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Explicit confirmation').check();
  await page.getByRole('button', { name: 'Confirm and create space' }).click();
  await expect(page).toHaveURL(/\/en\/home$/);

  await page.getByRole('button', { name: 'Generate partner invite' }).click();
  const inviteUrlButton = page.getByRole('button').filter({
    hasText: /accept-invite\?token=/,
  });
  await expect(inviteUrlButton).toBeVisible();
  const inviteUrl = await inviteUrlButton.textContent();
  if (!inviteUrl) {
    throw new Error('Invite URL button did not contain an invite URL.');
  }

  await page.context().storageState({
    path: partnerAStorageStatePath,
  });

  const partnerBContext = await browser.newContext({
    locale: 'en-US',
    timezoneId: onboardingTimeZone,
  });
  const partnerBPage = await partnerBContext.newPage();

  await partnerBPage.goto(`${E2E_BASE_URL}/en/login`);
  await partnerBPage.getByLabel('Email').fill(partnerB.email);
  await partnerBPage.getByRole('button', { name: 'Send magic link' }).click();
  await expect(partnerBPage.getByText('Check your email for the magic link.')).toBeVisible();

  const partnerBOtpCode = await waitForMagicLinkCode(partnerB.email);
  await verifyEmailOtpThroughAppRoute(partnerBPage, partnerB.email, partnerBOtpCode);
  await partnerBPage.goto(inviteUrl.trim());
  await expect(partnerBPage).toHaveURL(/\/en\/accept-invite\?token=/);
  await partnerBPage.getByRole('button', { name: 'Join couple space' }).click();
  await expect(partnerBPage).toHaveURL(/\/en\/home$/);

  await partnerBContext.storageState({
    path: partnerBStorageStatePath,
  });
  await partnerBContext.close();
});
