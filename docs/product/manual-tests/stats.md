# Stats Manual Tests

## Feature Summary
- Covers gameplay streak and recent-history visibility after a completed daily-question round.

## Routes Covered
- `/stats`

## Preconditions
- User is authenticated in a ready couple context.
- At least one daily-question round is completed today.
- Use debug token format `DBG-STAT-<YYYYMMDD>-<INITIALS>-<NN>` in the related daily-question answers.

## Required Test Data
- One completed daily-question round whose answers contain the debug token.

## Core Smoke Cases
### MAN-STAT-001 Stats reflects the completed daily-question round
1. Complete one daily-question round for both partners.
2. Open `/stats`.
3. Confirm the current streak, completed status, and recent-history section update.
4. Refresh the page and confirm the same values remain.

Expected result:
- Stats reflects the completed round and uses the couple-local day boundary.

Failure triage:
- Route: `/stats`
- Action: none directly
- Read helper: `getGameplayStatsPageData(...)`
- RPC: `get_daily_question_stats(...)`

## Automated Coverage
- `E2E-STAT-001`
