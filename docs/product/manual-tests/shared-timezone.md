# Shared Timezone Manual Tests

## Feature Summary
- Covers the shared couple timezone setting and date-preservation behavior.

## Routes Covered
- `/settings`
- `/countdowns`
- `/future-notes`

## Preconditions
- User is authenticated in a ready couple context.
- At least one countdown and one future note already exist.
- Use debug token format `DBG-TZ-<YYYYMMDD>-<INITIALS>-<NN>` in any supporting titles.

## Required Test Data
- One saved countdown and one saved future note whose displayed dates can be compared before and after the timezone change.

## Core Smoke Cases
### MAN-TZ-001 Changing the timezone preserves visible calendar dates
1. Record the displayed date labels for one countdown and one future note.
2. Open `/settings`.
3. Change the couple timezone to a very different timezone.
4. Return to `/countdowns` and `/future-notes`.
5. Confirm the displayed calendar dates remain unchanged.

Expected result:
- The saved timezone changes, but existing countdown/future-note calendar dates remain visually stable.

Failure triage:
- Route: `/settings`, `/countdowns`, `/future-notes`
- Action: `updateCoupleTimezoneAction`
- Read helper: `getCountdownsPageData(...)`, `getFutureNotesPageData(...)`
- RPC: `update_couple_timezone(...)`

## Automated Coverage
- `E2E-TZ-001`
