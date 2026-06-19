import type { Browser, Page } from '@playwright/test';

import { expect } from '@playwright/test';

import { E2E_BASE_URL, onboardingTimeZone, partnerBStorageStatePath } from '../runtime';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface PlayDailyQuestionOptions {
  readonly partnerAAnswer: string;
  readonly partnerBAnswer: string;
  readonly promptText: string;
}

export interface PlayGuessDateOptions {
  readonly memoryNote: string;
  readonly partnerAGuess: string;
  readonly partnerBGuess: string;
}

export interface PlayTriviaOptions {
  readonly distractorLocation: string;
  readonly distractorNote: string;
  readonly targetLocation: string;
  readonly targetNote: string;
}

const newPartnerBContext = (browser: Browser) =>
  browser.newContext({
    locale: 'en-US',
    storageState: partnerBStorageStatePath,
    timezoneId: onboardingTimeZone,
  });

// Plays one daily-question round to completion across both partners (separate BrowserContexts),
// leaving partner A's page showing the revealed answers.
export const playDailyQuestionBothPartners = async (
  page: Page,
  browser: Browser,
  { partnerAAnswer, partnerBAnswer, promptText }: PlayDailyQuestionOptions,
): Promise<void> => {
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
  await expect(page.getByLabel('Your answer')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Today’s answers' })).toBeHidden();

  const partnerBContext = await newPartnerBContext(browser);

  try {
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
  } finally {
    await partnerBContext.close();
  }

  await expect(page.getByRole('heading', { name: 'Today’s answers' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(partnerAAnswer)).toBeVisible();
  await expect(page.getByText(partnerBAnswer)).toBeVisible();
};

// Plays one guess-date round across both partners against a pre-created memory clue.
export const playGuessDateBothPartners = async (
  page: Page,
  browser: Browser,
  { memoryNote, partnerAGuess, partnerBGuess }: PlayGuessDateOptions,
): Promise<void> => {
  await page.goto('/en/games/guess-date');
  await page.getByRole('button', { name: 'Open today’s memory clue' }).click();
  await expect(page.getByText(memoryNote)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel('Your date guess').fill(partnerAGuess);
  await page.getByRole('button', { name: 'Lock date guess' }).click();
  await expect(page.getByRole('heading', { name: 'Waiting for the second guess' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel('Your date guess')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Actual memory date' })).toBeHidden();

  const partnerBContext = await newPartnerBContext(browser);

  try {
    const partnerBPage = await partnerBContext.newPage();

    await partnerBPage.goto(`${E2E_BASE_URL}/en/games`);
    await expect(partnerBPage.getByRole('link', { name: 'Open today’s date guess' })).toBeVisible();
    await partnerBPage.goto(`${E2E_BASE_URL}/en/games/guess-date`);
    await expect(partnerBPage.getByText(memoryNote)).toBeVisible();
    await partnerBPage.getByLabel('Your date guess').fill(partnerBGuess);
    await partnerBPage.getByRole('button', { name: 'Lock date guess' }).click();
    await expect(partnerBPage.getByRole('heading', { name: 'Actual memory date' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(partnerBPage.getByText('Guessed date')).toHaveCount(2);
    await expect(partnerBPage.getByText('You', { exact: true })).toBeVisible();
    await expect(partnerBPage.getByText('Partner', { exact: true })).toBeVisible();
  } finally {
    await partnerBContext.close();
  }

  await expect(page.getByRole('heading', { name: 'Actual memory date' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Guessed date')).toHaveCount(2);
};

// Plays one trivia round across both partners against two pre-created memories with distinct
// locations. Resolves which memory became the clue dynamically before answering.
export const playTriviaBothPartners = async (
  page: Page,
  browser: Browser,
  { distractorLocation, distractorNote, targetLocation, targetNote }: PlayTriviaOptions,
): Promise<void> => {
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
  await expect(page.getByRole('button', { name: 'Lock trivia answer' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Correct location' })).toBeHidden();

  const partnerBContext = await newPartnerBContext(browser);

  try {
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
  } finally {
    await partnerBContext.close();
  }

  await expect(page.getByRole('heading', { name: 'Correct location' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(targetLocation, { exact: true })).toBeVisible();
  await expect(page.getByText(distractorLocation, { exact: true })).toBeVisible();
};
