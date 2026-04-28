import { expect, test, type Locator } from "@playwright/test";
import { memoryFixturePath, onboardingTimeZone } from "./support/runtime";
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createTodayDateInput,
} from "./support/test-data";

const replaceInputValue = async (input: Locator, value: string): Promise<void> => {
  await input.click();
  await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await input.press("Backspace");
  await input.pressSequentially(value);
  await input.press("Tab");
};

test("E2E-COUNT-001 / E2E-FNOTE-001 / E2E-TZ-001 countdowns, future notes, and timezone updates preserve selected calendar dates", async ({
  page,
}) => {
  test.slow();

  const countdownTitle = buildUniqueText("Countdown", "E2E-COUNT-001");
  const countdownNote = buildUniqueText("Countdown note", "E2E-COUNT-001");
  const lockedFutureNoteTitle = buildUniqueText("Locked note", "E2E-FNOTE-001");
  const lockedFutureNoteBody = buildUniqueText("Locked note body", "E2E-FNOTE-001");
  const unlockedFutureNoteTitle = buildUniqueText("Unlocked note", "E2E-FNOTE-001");
  const unlockedFutureNoteBody = buildUniqueText("Unlocked note body", "E2E-FNOTE-001");

  await page.goto("/en/settings");
  await replaceInputValue(page.getByLabel("Couple timezone"), "Not/A_Real_Zone");
  await page.getByRole("button", { name: "Save timezone" }).click();
  await expect(page.getByText("Enter a valid IANA timezone.")).toBeVisible();
  await expect(page.getByText(`Current timezone: ${onboardingTimeZone}`)).toBeVisible();

  await page.goto("/en/countdowns");
  await page.getByLabel("Title").fill(countdownTitle);
  await page.getByLabel("Type").selectOption("plan");
  await page.getByLabel("Target date").fill(createOffsetDateInput(30));
  await page.getByLabel("Note (optional)").fill(countdownNote);
  await page.getByRole("button", { name: "Save countdown" }).click();
  await expect(page.getByText(countdownTitle)).toBeVisible({
    timeout: 15_000,
  });

  const countdownCard = page.locator("div").filter({
    hasText: countdownTitle,
  }).first();
  await expect(countdownCard.getByText(countdownNote)).toBeVisible();
  const countdownDateLabel = await countdownCard.getByText(/^On /).first().textContent();
  if (!countdownDateLabel) {
    throw new Error("Countdown card did not render a target date label.");
  }

  await page.goto("/en/future-notes");
  await page.getByLabel("Title").fill(lockedFutureNoteTitle);
  await page.getByLabel("Unlock date").fill(createOffsetDateInput(45));
  await page.getByLabel("Note body").fill(lockedFutureNoteBody);
  await page.getByRole("button", { name: "Seal future note" }).click();
  await expect(page.getByText(lockedFutureNoteTitle)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel("Title").fill(unlockedFutureNoteTitle);
  await page.getByLabel("Unlock date").fill(createTodayDateInput());
  await page.getByLabel("Note body").fill(unlockedFutureNoteBody);
  await page.getByRole("button", { name: "Seal future note" }).click();
  await expect(page.getByText(unlockedFutureNoteTitle)).toBeVisible({
    timeout: 15_000,
  });

  const lockedFutureNoteCard = page.locator("div").filter({
    hasText: lockedFutureNoteTitle,
  }).first();
  const unlockedFutureNoteCard = page.locator("div").filter({
    hasText: unlockedFutureNoteTitle,
  }).first();
  const lockedUnlockDateLabel = await lockedFutureNoteCard
    .getByText(/^Unlocks /)
    .first()
    .textContent();
  const unlockedUnlockDateLabel = await unlockedFutureNoteCard
    .getByText(/^Unlocks /)
    .first()
    .textContent();

  if (!lockedUnlockDateLabel || !unlockedUnlockDateLabel) {
    throw new Error("Future note cards did not render unlock date labels.");
  }

  await expect(lockedFutureNoteCard.getByText(lockedFutureNoteBody)).toHaveCount(0);
  await expect(unlockedFutureNoteCard.getByText(unlockedFutureNoteBody)).toBeVisible();

  await page.goto("/en/settings");
  await replaceInputValue(page.getByLabel("Couple timezone"), "America/New_York");
  await page.getByRole("button", { name: "Save timezone" }).click();
  await expect(page.getByText("Current timezone: America/New_York")).toBeVisible({
    timeout: 15_000,
  });

  await page.goto("/en/countdowns");
  await expect(page.getByText(countdownDateLabel)).toBeVisible();

  await page.goto("/en/future-notes");
  await expect(page.getByText(lockedUnlockDateLabel)).toBeVisible();
  await expect(page.getByText(unlockedUnlockDateLabel)).toBeVisible();
  await expect(page.getByText(unlockedFutureNoteBody)).toBeVisible();

  await page.goto("/en/settings");
  await replaceInputValue(page.getByLabel("Couple timezone"), onboardingTimeZone);
  await page.getByRole("button", { name: "Save timezone" }).click();
  await expect(page.getByText(`Current timezone: ${onboardingTimeZone}`)).toBeVisible({
    timeout: 15_000,
  });
});

test("E2E-TRIP-001 / E2E-PLACE-001 / E2E-ALBUM-001 trips, visited places, albums, and invalid detail routes behave correctly", async ({
  page,
}) => {
  test.slow();

  const tripTitle = buildUniqueText("Trip", "E2E-TRIP-001");
  const tripNote = buildUniqueText("Trip note", "E2E-TRIP-001");
  const visitedPlaceTitle = buildUniqueText("Visited place", "E2E-PLACE-001");
  const visitedPlaceNote = buildUniqueText("Visited place note", "E2E-PLACE-001");
  const firstTripMemoryNote = buildUniqueText("Trip memory one", "E2E-ALBUM-001");
  const secondTripMemoryNote = buildUniqueText("Trip memory two", "E2E-ALBUM-001");
  const albumTitle = buildUniqueText("Album", "E2E-ALBUM-001");
  const albumNote = buildUniqueText("Album note", "E2E-ALBUM-001");

  await page.goto("/en/trips");
  await page.getByLabel("Trip title").fill(buildUniqueText("Invalid trip", "E2E-TRIP-000"));
  await page.getByLabel("Start date").fill(createOffsetDateInput(2));
  await page.getByLabel("End date").fill(createOffsetDateInput(-2));
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(page.getByText("End date must be on or after the start date.")).toBeVisible();

  await page.goto("/en/trips");
  await page.getByLabel("Trip title").fill(tripTitle);
  await page.getByLabel("Start date").fill(createOffsetDateInput(-2));
  await page.getByLabel("End date").fill(createOffsetDateInput(2));
  await page.getByLabel("Trip note (optional)").fill(tripNote);
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(page.getByRole("link", { name: new RegExp(tripTitle) })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("link", { name: new RegExp(tripTitle) }).click();
  await expect(page).toHaveURL(/\/en\/trips\/[0-9a-f-]+$/);
  const tripUrl = page.url();

  await page.getByLabel("Place title").fill(buildUniqueText("Invalid place", "E2E-PLACE-000"));
  await page.getByLabel("Visited on").fill(createOffsetDateInput(10));
  await page.getByRole("button", { name: "Save visited place" }).click();
  await expect(page.getByText("Choose a date inside this trip window.")).toBeVisible();

  await page.getByLabel("Place title").fill(visitedPlaceTitle);
  await page.getByLabel("Visited on").fill(createTodayDateInput());
  await page.getByLabel("Place note (optional)").fill(visitedPlaceNote);
  await page.getByRole("button", { name: "Save visited place" }).click();
  await expect(page.getByText(visitedPlaceTitle)).toBeVisible({
    timeout: 15_000,
  });

  await page.goto("/en/map");
  await expect(page.getByRole("heading", { name: "Places map" })).toBeVisible();
  await expect(page.locator(`button[aria-label="${visitedPlaceTitle}"]`)).toBeVisible();

  await page.goto("/en/memories/new");
  await page.getByLabel("Happened at").fill(createOffsetDateTimeLocalInput(-1, 10, 15));
  await page.getByLabel("Location").fill(tripTitle);
  await page.getByLabel("Note").fill(firstTripMemoryNote);
  await page.getByLabel("Media").setInputFiles(memoryFixturePath);
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto("/en/memories/new");
  await page.getByLabel("Happened at").fill(createOffsetDateTimeLocalInput(0, 15, 45));
  await page.getByLabel("Location").fill(tripTitle);
  await page.getByLabel("Note").fill(secondTripMemoryNote);
  await page.getByLabel("Media").setInputFiles(memoryFixturePath);
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto(tripUrl);
  await expect(page.getByText(firstTripMemoryNote)).toBeVisible();
  await expect(page.getByText(secondTripMemoryNote)).toBeVisible();

  const albumComposer = page.locator("form").filter({
    has: page.getByLabel("Album title"),
  }).first();
  await albumComposer.getByLabel("Album title").fill(albumTitle);
  await albumComposer.getByLabel("Album note (optional)").fill(albumNote);
  await albumComposer.getByRole("button", { name: "Create album" }).click();
  await expect(albumComposer.getByText("Select at least one memory item.")).toBeVisible();
  await albumComposer.locator("label").filter({ hasText: firstTripMemoryNote }).click();
  await albumComposer.getByRole("button", { name: "Create album" }).click();
  await expect(page.getByRole("link", { name: new RegExp(albumTitle) })).toBeVisible({
    timeout: 15_000,
  });

  const addAlbumItemsForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Add selected media" }),
  }).first();
  await addAlbumItemsForm.locator("label").filter({ hasText: secondTripMemoryNote }).click();
  await addAlbumItemsForm.getByRole("button", { name: "Add selected media" }).click();
  await expect(addAlbumItemsForm.getByText(secondTripMemoryNote)).toHaveCount(0, {
    timeout: 15_000,
  });
  const linkedAlbum = page.getByRole("link", { name: new RegExp(albumTitle) }).first();
  await expect(linkedAlbum).toBeVisible();
  await expect(linkedAlbum.getByText("2 items")).toBeVisible({
    timeout: 15_000,
  });

  await linkedAlbum.click();
  await expect(page).toHaveURL(/\/en\/albums\/[0-9a-f-]+$/);
  await expect(page.getByText(firstTripMemoryNote)).toBeVisible();
  await expect(page.getByText(secondTripMemoryNote)).toBeVisible();

  await page.goto("/en/albums");
  await expect(page.getByRole("heading", { name: "Albums" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(albumTitle) })).toBeVisible();

  await page.goto("/en/trips/not-a-uuid");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await page.goto("/en/albums/not-a-uuid");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
