# Future Notes Manual Tests

## Feature Summary

- Covers locked and unlocked future-note creation plus unlock-state rendering.

## Routes Covered

- `/future-notes`

## Preconditions

- User is authenticated in a ready couple context.
- Use debug token format `DBG-FNOTE-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data

- One locked future note and one unlocked future note, each with the debug token in the title and body.

## Core Smoke Cases

### MAN-FNOTE-001 Locked note hides the body

1. Open `/future-notes`.
2. Create a note with a future unlock date and the debug token.
3. Confirm the title is visible.
4. Confirm the body is not visible on the list surface.

Expected result:

- Locked note metadata renders, but the body stays hidden.

Failure triage:

- Route: `/future-notes`
- Action: `createFutureNoteAction`
- Read helper: `getFutureNotesPageData(...)`
- RPC: `create_future_note_with_body(...)`, `get_unlocked_future_note_contents(...)`

### MAN-FNOTE-002 Unlocked note shows the body

1. Create a note with today as the unlock date and the debug token.
2. Refresh `/future-notes`.
3. Confirm the note title and body are both visible.

Expected result:

- Unlocked note body is readable only after it qualifies as unlocked.

Failure triage:

- Route: `/future-notes`
- Action: `createFutureNoteAction`
- Read helper: `getFutureNotesPageData(...)`
- RPC: `create_future_note_with_body(...)`, `get_unlocked_future_note_contents(...)`

## Automated Coverage

- `E2E-FNOTE-001`
