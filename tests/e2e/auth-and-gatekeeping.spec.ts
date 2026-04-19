import { expect, test } from "@playwright/test";
import { E2E_BASE_URL, onboardingTimeZone } from "./support/runtime";

test("E2E-AUTH-001 root redirects guests to the localized login page", async ({ browser }) => {
  const guestContext = await browser.newContext({
    locale: "en-US",
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
    guestPage.getByRole("heading", {
      level: 1,
      name: "Welcome back",
    }),
  ).toBeVisible();

  await guestContext.close();
});

test("E2E-AUTH-002 partner auth state redirects root to home", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en\/home$/);
  await expect(page.getByRole("heading", { name: "Latest chapters" })).toBeVisible();
});
