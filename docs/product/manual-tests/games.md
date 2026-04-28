# Games Manual Tests

## Feature Summary
- Covers the games hub status cards and link states for the live daily-question, guess-date, and trivia modes.

## Routes Covered
- `/games`

## Preconditions
- User is authenticated in a ready couple context.
- Use debug token format `DBG-GAME-<YYYYMMDD>-<INITIALS>-<NN>` in any related daily-question answers, guess-date memory notes, or trivia memory notes.

## Required Test Data
- None initially. The hub state should change as the daily-question, guess-date, and trivia flows progress.

## Core Smoke Cases
### MAN-GAME-001 Games hub reflects daily-question status transitions
1. Open `/games` before starting today’s round and note the status badge.
2. Start today’s daily question from the hub.
3. After the first answer is locked, return to `/games`.
4. After the second partner completes the round, return to `/games` again.

Expected result:
- The hub transitions through the expected daily-question state and keeps the open CTA available.

Failure triage:
- Route: `/games`
- Action: `ensureDailyQuestionRoundAction`, `submitDailyQuestionAnswerAction`
- Read helper: `getGamesHubData(...)`
- RPC: `get_daily_question_round_state(...)`, `ensure_daily_question_round(...)`, `submit_daily_question_answer(...)`

### MAN-GAME-002 Games hub reflects guess-date status transitions
1. Create at least one memory from `/memories/new`.
2. Open `/games/guess-date` from the hub and start today’s memory clue.
3. Submit one partner’s date guess, then return to `/games`.
4. After the second partner completes the round, return to `/games` again.

Expected result:
- The hub transitions through the expected guess-date state and keeps the open CTA available.

Failure triage:
- Route: `/games`, `/games/guess-date`
- Action: `ensureGuessDateRoundAction`, `submitGuessDateAnswerAction`
- Read helper: `getGamesHubData(...)`, `getGuessDatePageData(...)`
- RPC: `get_guess_date_round_state(...)`, `ensure_guess_date_round(...)`, `submit_guess_date_answer(...)`

### MAN-GAME-003 Games hub reflects trivia status transitions
1. Create at least two memories from `/memories/new` with distinct location values.
2. Open `/games/trivia` from the hub and start today’s trivia clue.
3. Submit one partner’s location answer, then return to `/games`.
4. After the second partner completes the round, return to `/games` again.

Expected result:
- The hub transitions through the expected trivia state and keeps the open CTA available.
- `/stats` remains scoped to daily-question metrics.

Failure triage:
- Route: `/games`, `/games/trivia`
- Action: `ensureTriviaRoundAction`, `submitTriviaAnswerAction`
- Read helper: `getGamesHubData(...)`, `getTriviaPageData(...)`
- RPC: `get_trivia_round_state(...)`, `ensure_trivia_round(...)`, `submit_trivia_answer(...)`

## Automated Coverage
- `E2E-GAME-001`
- `E2E-GAME-002`
- `E2E-GAME-003`
