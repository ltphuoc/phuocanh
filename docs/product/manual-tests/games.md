# Games Manual Tests

## Feature Summary
- Covers the games hub status card and link state for the live daily-question mode.

## Routes Covered
- `/games`

## Preconditions
- User is authenticated in a ready couple context.
- Use debug token format `DBG-GAME-<YYYYMMDD>-<INITIALS>-<NN>` in any related daily-question answers.

## Required Test Data
- None initially. The hub state should change as the daily-question flow progresses.

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

## Automated Coverage
- `E2E-GAME-001`
