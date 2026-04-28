# Memories Manual Tests

## Feature Summary
- Covers memory creation with media upload and memory detail rendering.

## Routes Covered
- `/memories/new`
- `/memories/[memoryId]`

## Preconditions
- User is authenticated in a ready couple context.
- Use debug token format `DBG-MEM-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data
- One image or video file allowed by the current upload rules.
- Put the debug token in the memory note and location.

## Core Smoke Cases
### MAN-MEM-001 Create a memory with media and open its detail page
1. Open `/memories/new`.
2. Enter happened-at, location, note, and attach one media file using the debug token.
3. Save the memory.
4. From `/home`, open the new memory detail page.

Expected result:
- The create flow succeeds, the user returns to `/home`, and the detail page shows the note, location, and attached media.

Failure triage:
- Route: `/memories/new`, `/memories/[memoryId]`
- Action: `createMemoryAction`
- Read helper: `getMemoryDetailData(...)`, `signMemoryMediaStorageItems(...)`
- RPC: none

## Automated Coverage
- `E2E-MEM-000`
- `E2E-MEM-000-TYPE`
- `E2E-MEM-001`
