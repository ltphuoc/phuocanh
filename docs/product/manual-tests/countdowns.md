# Countdowns Manual Tests

## Feature Summary

- Covers countdown creation and persisted display.

## Routes Covered

- `/countdowns`

## Preconditions

- User is authenticated in a ready couple context.
- Use debug token format `DBG-COUNT-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data

- One countdown title and optional note containing the debug token.

## Core Smoke Cases

### MAN-COUNT-001 Create a countdown and confirm it renders with the saved date

1. Open `/countdowns`.
2. Create a countdown with a future date and the debug token in the title or note.
3. Confirm the saved countdown card appears.
4. Refresh the page and confirm the same card still appears with the same displayed date.

Expected result:

- The countdown persists with the intended date and display label.

Failure triage:

- Route: `/countdowns`
- Action: `createCountdownAction`
- Read helper: `getCountdownsPageData(...)`
- RPC: none

## Automated Coverage

- `E2E-COUNT-001`
