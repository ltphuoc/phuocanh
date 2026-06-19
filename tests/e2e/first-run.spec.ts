import { expect, test } from '@playwright/test';

import {
  playDailyQuestionBothPartners,
  playGuessDateBothPartners,
  playTriviaBothPartners,
} from './support/journeys/gameplay-journeys';
import { createMemory } from './support/journeys/seed-journeys';
import {
  buildUniqueText,
  createOffsetDateInput,
  createOffsetDateTimeLocalInput,
  createTodayDateInput,
} from './support/test-data';

// The first-run project runs ONCE, ordered, right after onboarding and before any baseline data
// exists. It is the only window where empty-state and couple-global counts (gameplay "Completed"
// counts, stats streak) are deterministic, because nothing else has touched the shared couple yet.
// Tests below MUST stay in this order: empty state → prerequisites → gameplay (which seeds the first
// memories). Tagged @first-run for selective runs.

test(
  'E2E-FIRSTRUN-EMPTY home and on-this-day show empty states before any couple data exists',
  { tag: '@first-run' },
  async ({ page }) => {
    await page.goto('/en/home');
    await expect(page.getByRole('heading', { name: 'Latest chapters' })).toBeVisible();
    await expect(page.getByText('No memories yet')).toBeVisible();

    await page.goto('/en/on-this-day');
    await expect(page.getByRole('heading', { name: 'On this day' })).toBeVisible();
    await expect(page.getByText('No memories for today yet')).toBeVisible();
  },
);

test(
  'E2E-GAME-000-PREQ / E2E-GD-000 / E2E-TRIVIA-000 gameplay prerequisites block memory-backed rounds before seed data exists',
  { tag: '@first-run' },
  async ({ page }) => {
    await page.goto('/en/games/guess-date');
    await page.getByRole('button', { name: 'Open today’s memory clue' }).click();
    await expect(
      page.getByText('Add at least one memory before starting guess the date.'),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Lock date guess' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Actual memory date' })).toBeHidden();

    await page.goto('/en/games/trivia');
    await page.getByRole('button', { name: 'Open today’s trivia clue' }).click();
    await expect(
      page.getByText('Add memories with at least two distinct locations before starting trivia.'),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Lock trivia answer' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Correct location' })).toBeHidden();

    await page.goto('/en/games');
    await expect(page.getByText(/^Not started$/)).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Start today’s date guess' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start today’s trivia' })).toBeVisible();
  },
);

test(
  'E2E-GAME-001 / E2E-DQ-001 / E2E-STAT-001 daily question runs end to end for both partners and updates the hub and stats',
  { tag: '@first-run' },
  async ({ browser, page }) => {
    test.slow();

    const promptText = 'What small thing made you feel especially cared for recently?';
    const partnerAAnswer = buildUniqueText('Partner A answer', 'E2E-DQ-001');
    const partnerBAnswer = buildUniqueText('Partner B answer', 'E2E-DQ-001');

    await page.goto('/en/games');
    await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();

    await playDailyQuestionBothPartners(page, browser, {
      partnerAAnswer,
      partnerBAnswer,
      promptText,
    });

    await page.goto('/en/games');
    await expect(page.getByText(/^Completed$/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open today’s round' })).toBeVisible();

    await page.goto('/en/stats');
    await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
    await expect(page.getByText('Current streak')).toBeVisible();
    await expect(page.getByText('1 day')).toBeVisible();
    await expect(page.getByText(/^Completed$/).first()).toBeVisible();
  },
);

test(
  'E2E-GAME-002 / E2E-GD-001 guess date runs end to end for both partners and updates the hub',
  { tag: '@first-run' },
  async ({ browser, page }) => {
    test.slow();

    const memoryLocation = buildUniqueText('Guess date place', 'E2E-GD-001');
    const memoryNote = buildUniqueText('Guess date memory', 'E2E-GD-001');
    const actualDateInput = createOffsetDateInput(-30);

    await createMemory(page, {
      happenedAt: createOffsetDateTimeLocalInput(-30, 9, 15),
      location: memoryLocation,
      note: memoryNote,
    });

    await playGuessDateBothPartners(page, browser, {
      memoryNote,
      partnerAGuess: createTodayDateInput(),
      partnerBGuess: actualDateInput,
    });

    await page.goto('/en/games');
    await expect(page.getByText(/^Completed$/)).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'Open today’s date guess' })).toBeVisible();
  },
);

test(
  'E2E-GAME-003 / E2E-TRIVIA-001 trivia runs end to end for both partners without expanding stats',
  { tag: '@first-run' },
  async ({ browser, page }) => {
    test.slow();

    const targetLocation = buildUniqueText('Trivia correct place', 'E2E-TRIVIA-001');
    const distractorLocation = buildUniqueText('Trivia distractor place', 'E2E-TRIVIA-001');
    const targetNote = buildUniqueText('Trivia target memory', 'E2E-TRIVIA-001');
    const distractorNote = buildUniqueText('Trivia distractor memory', 'E2E-TRIVIA-001');

    await createMemory(page, {
      happenedAt: createOffsetDateTimeLocalInput(-80, 9, 15),
      location: targetLocation,
      note: targetNote,
    });
    await createMemory(page, {
      happenedAt: createOffsetDateTimeLocalInput(-79, 10, 30),
      location: distractorLocation,
      note: distractorNote,
    });

    await playTriviaBothPartners(page, browser, {
      distractorLocation,
      distractorNote,
      targetLocation,
      targetNote,
    });

    await page.goto('/en/games');
    await expect(page.getByText(/^Completed$/)).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Open today’s trivia' })).toBeVisible();

    await page.goto('/en/stats');
    await expect(page.getByRole('heading', { name: 'Stats' })).toBeVisible();
    await expect(page.getByText('Current streak')).toBeVisible();
    await expect(page.getByText('1 day')).toBeVisible();
    await expect(page.getByText(/^Completed$/).first()).toBeVisible();
  },
);
