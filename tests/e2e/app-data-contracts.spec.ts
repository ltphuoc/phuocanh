import { expect, test } from "@playwright/test";
import {
  E2E_BASE_URL,
  onboardingTimeZone,
  partnerAStorageStatePath,
} from "./support/runtime";

test("E2E-APPDATA-001 app-data routes enforce auth and no-store JSON contracts", async ({
  browser,
}) => {
  const guestContext = await browser.newContext({
    locale: "en-US",
    storageState: {
      cookies: [],
      origins: [],
    },
    timezoneId: onboardingTimeZone,
  });
  const guestHomeResponse = await guestContext.request.get(`${E2E_BASE_URL}/api/app-data/home`);

  expect(guestHomeResponse.status()).toBe(401);
  expect(guestHomeResponse.headers()["cache-control"]).toBe("no-store");
  await expect(guestHomeResponse.json()).resolves.toEqual({
    error: "unauthenticated",
  });
  await guestContext.close();

  const partnerAContext = await browser.newContext({
    locale: "en-US",
    storageState: partnerAStorageStatePath,
    timezoneId: onboardingTimeZone,
  });
  const settingsResponse = await partnerAContext.request.get(
    `${E2E_BASE_URL}/api/app-data/settings`,
  );

  expect(settingsResponse.status()).toBe(200);
  expect(settingsResponse.headers()["cache-control"]).toBe("no-store");
  await expect(settingsResponse.json()).resolves.toMatchObject({
    context: {
      timeZone: onboardingTimeZone,
    },
    currentTimeZone: onboardingTimeZone,
  });

  const notFoundPaths = [
    "/api/app-data/games/unknown",
    "/api/app-data/memories/not-a-uuid",
    "/api/app-data/trips/not-a-uuid",
    "/api/app-data/albums/not-a-uuid",
  ] as const;

  for (const path of notFoundPaths) {
    const response = await partnerAContext.request.get(`${E2E_BASE_URL}${path}`);

    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "not_found",
    });
  }

  await partnerAContext.close();
});
