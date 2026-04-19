# Daily Question Manual Tests

## Feature Summary
- Covers prompt generation, one-answer lock, and two-answer reveal for the live gameplay mode.

## Routes Covered
- `/games/daily-question`

## Preconditions
- User is authenticated in a ready couple context.
- Two partner sessions are available.
- Use debug token format `DBG-DQ-<YYYYMMDD>-<INITIALS>-<NN>` in both answer bodies.

## Required Test Data
- Two answer texts containing the same debug token.

## Core Smoke Cases
### MAN-DQ-001 Generate today’s question and lock the first answer
1. Open `/games/daily-question`.
2. Generate today’s question if needed.
3. Submit the first partner answer with the debug token.
4. Confirm the page switches to the waiting state.

Expected result:
- Today’s prompt becomes visible and the first answer cannot be re-submitted after lock.

Failure triage:
- Route: `/games/daily-question`
- Action: `ensureDailyQuestionRoundAction`, `submitDailyQuestionAnswerAction`
- Read helper: `getDailyQuestionPageData(...)`
- RPC: `ensure_daily_question_round(...)`, `submit_daily_question_answer(...)`, `get_daily_question_round_state(...)`

### MAN-DQ-002 Second answer reveals both sides
1. Open the same round from the second partner session.
2. Submit the second answer with the debug token.
3. Confirm the page reveals both answers.
4. Confirm the first partner session also reveals both answers after refresh.

Expected result:
- Both answers are shown only after both partners submit.

Failure triage:
- Route: `/games/daily-question`
- Action: `submitDailyQuestionAnswerAction`
- Read helper: `getDailyQuestionPageData(...)`
- RPC: `submit_daily_question_answer(...)`, `get_daily_question_round_state(...)`

## Automated Coverage
- `E2E-DQ-001`
