import { expect, test } from '@playwright/test';

import { E2E_BASE_URL, onboardingTimeZone, partnerBStorageStatePath } from './support/runtime';
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createTodayDateInput,
} from './support/test-data';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('E2E-GAME-000 shell-only game mode stays non-live', async ({ page }) => {
  await page.goto('/en/games/compatibility');
  await expect(page.getByRole('heading', { name: 'Compatibility' })).toBeVisible();
  await expect(
    page.getByText(
      'This route is a structured shell for the selected game mode. Prompt generation, answer capture, and streak updates will connect here in a later phase.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to games' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate today’s question' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open today’s memory clue' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open today’s trivia clue' })).toHaveCount(0);
});

test('E2E-GAME-000-PREQ / E2E-GD-000 / E2E-TRIVIA-000 gameplay prerequisites block memory-backed rounds before seed data exists', async ({
  page,
}) => {
  await page.goto('/en/games/guess-date');
  await page.getByRole('button', { name: 'Open today’s memory clue' }).click();
  await expect(
    page.getByText('Add at least one memory before starting guess the date.'),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Lock date guess' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Actual memory date' })).toHaveCount(0);

  await page.goto('/en/games/trivia');
  await page.getByRole('button', { name: 'Open today’s trivia clue' }).click();
  await expect(
    page.getByText('Add memories with at least two distinct locations before starting trivia.'),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Lock trivia answer' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Correct location' })).toHaveCount(0);

  await page.goto('/en/games');
  await expect(page.getByText(/^Not started$/)).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Start today’s date guess' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start today’s trivia' })).toBeVisible();
});

test('E2E-GAME-001 / E2E-DQ-001 / E2E-STAT-001 daily question runs end to end for both partners and updates the hub and stats', async ({
  browser,
  page,
}) => {
  test.slow();

  const promptText = 'What small thing made you feel especially cared for recently?';
  const partnerAAnswer = buildUniqueText('Partner A answer', 'E2E-DQ-001');
  const partnerBAnswer = buildUniqueText('Partner B answer', 'E2E-DQ-001');

  await page.goto('/en/games');
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
  await page.goto('/en/games/daily-question');
  await page.getByRole('button', { name: 'Generate today’s question' }).click();
  await expect(page.getByText(promptText)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel('Your answer').fill(partnerAAnswer);
  await page.getByRole('button', { name: 'Lock answer' }).click();
  await expect(page.getByRole('heading', { name: 'Waiting for the second answer' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel('Your answer')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Today’s answers' })).toHaveCount(0);

  const partnerBContext = await browser.newContext({
    locale: 'en-US',
    storageState: partnerBStorageStatePath,
    timezoneId: onboardingTimeZone,
  });
  const partnerBPage = await partnerBContext.newPage();

  await partnerBPage.goto(`${E2E_BASE_URL}/en/games`);
  await expect(partnerBPage.getByRole('link', { name: 'Open today’s round' })).toBeVisible();
  await partnerBPage.goto(`${E2E_BASE_URL}/en/games/daily-question`);
  await expect(partnerBPage.getByText(promptText)).toBeVisible();
  await partnerBPage.getByLabel('Your answer').fill(partnerBAnswer);
  await partnerBPage.getByRole('button', { name: 'Lock answer' }).click();
  await expect(partnerBPage.getByRole('heading', { name: 'Today’s answers' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(partnerBPage.getByText(partnerAAnswer)).toBeVisible();
  await expect(partnerBPage.getByText(partnerBAnswer)).toBeVisible();
  await partnerBContext.close();

  await expect(page.getByRole('heading', { name: 'Today’s answers' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(partnerAAnswer)).toBeVisible();
  await expect(page.getByText(partnerBAnswer)).toBeVisible();

  await page.goto('/en/games');
  await expect(page.getByText(/^Completed$/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open today’s round' })).toBeVisible();

  await page.goto('/en/stats');
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
  await expect(page.getByText('Current streak')).toBeVisible();
  await expect(page.getByText('1 day')).toBeVisible();
  await expect(page.getByText(/^Completed$/).first()).toBeVisible();
});

test('E2E-GAME-002 / E2E-GD-001 guess date runs end to end for both partners and updates the hub', async ({
  browser,
  page,
}) => {
  test.slow();

  const memoryLocation = buildUniqueText('Guess date place', 'E2E-GD-001');
  const memoryNote = buildUniqueText('Guess date memory', 'E2E-GD-001');
  const actualDateInput = createOffsetDateInput(-30);
  const partnerAAnswer = createTodayDateInput();
  const partnerBAnswer = actualDateInput;

  await page.goto('/en/memories/new');
  await page.getByLabel('Happened at').fill(createOffsetDateTimeLocalInput(-30, 9, 15));
  await page.getByLabel('Location').fill(memoryLocation);
  await page.getByLabel('Note').fill(memoryNote);
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto('/en/games/guess-date');
  await page.getByRole('button', { name: 'Open today’s memory clue' }).click();
  await expect(page.getByText(memoryNote)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel('Your date guess').fill(partnerAAnswer);
  await page.getByRole('button', { name: 'Lock date guess' }).click();
  await expect(page.getByRole('heading', { name: 'Waiting for the second guess' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel('Your date guess')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Actual memory date' })).toHaveCount(0);

  const partnerBContext = await browser.newContext({
    locale: 'en-US',
    storageState: partnerBStorageStatePath,
    timezoneId: onboardingTimeZone,
  });
  const partnerBPage = await partnerBContext.newPage();

  await partnerBPage.goto(`${E2E_BASE_URL}/en/games`);
  await expect(partnerBPage.getByRole('link', { name: 'Open today’s date guess' })).toBeVisible();
  await partnerBPage.goto(`${E2E_BASE_URL}/en/games/guess-date`);
  await expect(partnerBPage.getByText(memoryNote)).toBeVisible();
  await partnerBPage.getByLabel('Your date guess').fill(partnerBAnswer);
  await partnerBPage.getByRole('button', { name: 'Lock date guess' }).click();
  await expect(partnerBPage.getByRole('heading', { name: 'Actual memory date' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(partnerBPage.getByText('Guessed date')).toHaveCount(2);
  await expect(partnerBPage.getByText('You', { exact: true })).toBeVisible();
  await expect(partnerBPage.getByText('Partner', { exact: true })).toBeVisible();
  await partnerBContext.close();

  await expect(page.getByRole('heading', { name: 'Actual memory date' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Guessed date')).toHaveCount(2);

  await page.goto('/en/games');
  await expect(page.getByText(/^Completed$/)).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Open today’s date guess' })).toBeVisible();
});

test('E2E-GAME-003 / E2E-TRIVIA-001 trivia runs end to end for both partners without expanding stats', async ({
  browser,
  page,
}) => {
  test.slow();

  const targetLocation = buildUniqueText('Trivia correct place', 'E2E-TRIVIA-001');
  const distractorLocation = buildUniqueText('Trivia distractor place', 'E2E-TRIVIA-001');
  const targetNote = buildUniqueText('Trivia target memory', 'E2E-TRIVIA-001');
  const distractorNote = buildUniqueText('Trivia distractor memory', 'E2E-TRIVIA-001');

  await page.goto('/en/memories/new');
  await page.getByLabel('Happened at').fill(createOffsetDateTimeLocalInput(-80, 9, 15));
  await page.getByLabel('Location').fill(targetLocation);
  await page.getByLabel('Note').fill(targetNote);
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto('/en/memories/new');
  await page.getByLabel('Happened at').fill(createOffsetDateTimeLocalInput(-79, 10, 30));
  await page.getByLabel('Location').fill(distractorLocation);
  await page.getByLabel('Note').fill(distractorNote);
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page).toHaveURL(/\/en\/home$/, {
    timeout: 20_000,
  });

  await page.goto('/en/games/trivia');
  await page.getByRole('button', { name: 'Open today’s trivia clue' }).click();
  await expect(
    page.getByText(new RegExp(`${escapeRegExp(targetNote)}|${escapeRegExp(distractorNote)}`)),
  ).toBeVisible({
    timeout: 15_000,
  });
  const targetMemoryIsClue = await page.getByText(targetNote).isVisible();
  const correctLocation = targetMemoryIsClue ? targetLocation : distractorLocation;
  const incorrectLocation = targetMemoryIsClue ? distractorLocation : targetLocation;
  await page.getByLabel(correctLocation).check();
  await page.getByRole('button', { name: 'Lock trivia answer' }).click();
  await expect(page.getByRole('heading', { name: 'Waiting for the second answer' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Lock trivia answer' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Correct location' })).toHaveCount(0);

  const partnerBContext = await browser.newContext({
    locale: 'en-US',
    storageState: partnerBStorageStatePath,
    timezoneId: onboardingTimeZone,
  });
  const partnerBPage = await partnerBContext.newPage();

  await partnerBPage.goto(`${E2E_BASE_URL}/en/games`);
  await expect(partnerBPage.getByRole('link', { name: 'Open today’s trivia' })).toBeVisible();
  await partnerBPage.goto(`${E2E_BASE_URL}/en/games/trivia`);
  await expect(
    partnerBPage.getByText(targetMemoryIsClue ? targetNote : distractorNote),
  ).toBeVisible();
  await partnerBPage.getByLabel(incorrectLocation).check();
  await partnerBPage.getByRole('button', { name: 'Lock trivia answer' }).click();
  await expect(partnerBPage.getByRole('heading', { name: 'Correct location' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    partnerBPage.getByText(`The matching location was ${correctLocation}.`),
  ).toBeVisible();
  await expect(partnerBPage.getByText('Selected answer')).toHaveCount(2);
  await expect(partnerBPage.getByText('Correct', { exact: true })).toBeVisible();
  await expect(partnerBPage.getByText('Not this time')).toBeVisible();
  await partnerBContext.close();

  await expect(page.getByRole('heading', { name: 'Correct location' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(targetLocation, { exact: true })).toBeVisible();
  await expect(page.getByText(distractorLocation, { exact: true })).toBeVisible();

  await page.goto('/en/games');
  await expect(page.getByText(/^Completed$/)).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Open today’s trivia' })).toBeVisible();

  await page.goto('/en/stats');
  await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
  await expect(page.getByText('Current streak')).toBeVisible();
  await expect(page.getByText('1 day')).toBeVisible();
  await expect(page.getByText(/^Completed$/).first()).toBeVisible();
});
