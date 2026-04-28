import { expect, test } from "@playwright/test";
import {
  E2E_BASE_URL,
  onboardingTimeZone,
  partnerBStorageStatePath,
} from "./support/runtime";
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createTodayDateInput,
} from "./support/test-data";

test("E2E-GAME-000 shell-only game mode stays non-live", async ({ page }) => {
  await page.goto("/en/games/trivia");
  await expect(page.getByRole("heading", { name: "Trivia" })).toBeVisible();
  await expect(
    page.getByText(
      "This route is a structured shell for the selected game mode. Prompt generation, answer capture, and streak updates will connect here in a later phase.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to games" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate today’s question" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open today’s memory clue" })).toHaveCount(0);
});

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

test("E2E-GAME-002 / E2E-GD-001 guess date runs end to end for both partners and updates the hub", async ({
  browser,
  page,
}) => {
  test.slow();

  const memoryLocation = buildUniqueText("Guess date place", "E2E-GD-001");
  const memoryNote = buildUniqueText("Guess date memory", "E2E-GD-001");
  const actualDateInput = createOffsetDateInput(-30);
  const partnerAAnswer = createTodayDateInput();
  const partnerBAnswer = actualDateInput;

  await page.goto("/en/memories/new");
  await page.getByLabel("Happened at").fill(createOffsetDateTimeLocalInput(-30, 9, 15));
  await page.getByLabel("Location").fill(memoryLocation);
  await page.getByLabel("Note").fill(memoryNote);
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto("/en/games/guess-date");
  await page.getByRole("button", { name: "Open today’s memory clue" }).click();
  await expect(page.getByText(memoryNote)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Your date guess").fill(partnerAAnswer);
  await page.getByRole("button", { name: "Lock date guess" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for the second guess" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: "Actual memory date" })).toHaveCount(0);

  const partnerBContext = await browser.newContext({
    locale: "en-US",
    storageState: partnerBStorageStatePath,
    timezoneId: onboardingTimeZone,
  });
  const partnerBPage = await partnerBContext.newPage();

  await partnerBPage.goto(`${E2E_BASE_URL}/en/games`);
  await expect(
    partnerBPage.getByRole("link", { name: "Open today’s date guess" }),
  ).toBeVisible();
  await partnerBPage.goto(`${E2E_BASE_URL}/en/games/guess-date`);
  await expect(partnerBPage.getByText(memoryNote)).toBeVisible();
  await partnerBPage.getByLabel("Your date guess").fill(partnerBAnswer);
  await partnerBPage.getByRole("button", { name: "Lock date guess" }).click();
  await expect(
    partnerBPage.getByRole("heading", { name: "Actual memory date" }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(partnerBPage.getByText("Guessed date")).toHaveCount(2);
  await expect(partnerBPage.getByText("You", { exact: true })).toBeVisible();
  await expect(partnerBPage.getByText("Partner", { exact: true })).toBeVisible();
  await partnerBContext.close();

  await page.goto("/en/games/guess-date");
  await expect(page.getByRole("heading", { name: "Actual memory date" })).toBeVisible();
  await expect(page.getByText("Guessed date")).toHaveCount(2);

  await page.goto("/en/games");
  await expect(page.getByText(/^Completed$/)).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Open today’s date guess" })).toBeVisible();
});
