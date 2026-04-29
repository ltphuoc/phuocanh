# Home Manual Tests

## Feature Summary

- Covers the home spotlight, relationship counter, and latest memory chapter visibility.

## Routes Covered

- `/home`

## Preconditions

- User is authenticated in a ready couple context.
- At least one memory already exists.
- Use debug token format `DBG-HOME-<YYYYMMDD>-<INITIALS>-<NN>` in any supporting memory note.

## Required Test Data

- One recent memory created with the debug token in the note.

## Core Smoke Cases

### MAN-HOME-001 Home shows the relationship spotlight and latest chapter

1. Open `/home`.
2. Confirm the spotlight shows a `Day <count>` relationship counter.
3. Confirm the latest memory note containing the debug token is visible on the page.
4. Open the latest chapter CTA and confirm it resolves to the memory detail route.

Expected result:

- The relationship counter renders and the newest chapter appears on the home surface.

Failure triage:

- Route: `/home`
- Action: none directly
- Read helper: `getHomePageData(...)`, `signMemoryMediaStorageItems(...)`
- RPC: none

## Automated Coverage

- `E2E-HOME-001`
