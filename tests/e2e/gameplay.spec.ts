import { expect, test } from "@playwright/test";
import {
  E2E_BASE_URL,
  onboardingTimeZone,
  partnerBStorageStatePath,
} from "./support/runtime";
import { buildUniqueText } from "./support/test-data";

test("E2E-GAME-001 / E2E-DQ-001 / E2E-STAT-001 daily question runs end to end for both partners and updates the hub and stats", async ({
  browser,
  page,
}) => {
  test.slow();

  const promptText = "What small thing made you feel especially cared for recently?";
  const partnerAAnswer = buildUniqueText("Partner A answer", "E2E-DQ-001");
  const partnerBAnswer = buildUniqueText("Partner B answer", "E2E-DQ-001");

  await page.goto("/en/games");
  await expect(page.getByRole("heading", { name: "Games" })).toBeVisible();
  await page.goto("/en/games/daily-question");
  await page.getByRole("button", { name: "Generate today’s question" }).click();
  await expect(page.getByText(promptText)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Your answer").fill(partnerAAnswer);
  await page.getByRole("button", { name: "Lock answer" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for the second answer" })).toBeVisible({
    timeout: 15_000,
  });

  const partnerBContext = await browser.newContext({
    locale: "en-US",
    storageState: partnerBStorageStatePath,
    timezoneId: onboardingTimeZone,
  });
  const partnerBPage = await partnerBContext.newPage();

  await partnerBPage.goto(`${E2E_BASE_URL}/en/games`);
  await expect(
    partnerBPage.getByRole("link", { name: "Open today’s round" }),
  ).toBeVisible();
  await partnerBPage.goto(`${E2E_BASE_URL}/en/games/daily-question`);
  await expect(partnerBPage.getByText(promptText)).toBeVisible();
  await partnerBPage.getByLabel("Your answer").fill(partnerBAnswer);
  await partnerBPage.getByRole("button", { name: "Lock answer" }).click();
  await expect(
    partnerBPage.getByRole("heading", { name: "Today’s answers" }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(partnerBPage.getByText(partnerAAnswer)).toBeVisible();
  await expect(partnerBPage.getByText(partnerBAnswer)).toBeVisible();
  await partnerBContext.close();

  await page.goto("/en/games/daily-question");
  await expect(page.getByRole("heading", { name: "Today’s answers" })).toBeVisible();
  await expect(page.getByText(partnerAAnswer)).toBeVisible();
  await expect(page.getByText(partnerBAnswer)).toBeVisible();

  await page.goto("/en/games");
  await expect(page.getByText(/^Completed$/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open today’s round" })).toBeVisible();

  await page.goto("/en/stats");
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
  await expect(page.getByText("Current streak")).toBeVisible();
  await expect(page.getByText("1 day")).toBeVisible();
  await expect(page.getByText(/^Completed$/).first()).toBeVisible();
});
