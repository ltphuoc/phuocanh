# Wishlists Manual Tests

## Feature Summary

- Covers pending wish item creation and visibility on home and lists.

## Routes Covered

- `/home`
- `/lists`

## Preconditions

- User is authenticated in a ready couple context.
- Use debug token format `DBG-WISH-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data

- One wish item title and optional note containing the debug token.

## Core Smoke Cases

### MAN-WISH-001 Add a wish item and confirm it appears on both list surfaces

1. Open `/home`.
2. Create one wish item using the debug token in the title and note.
3. Confirm it appears on `/home`.
4. Open `/lists` and confirm the same item appears there too.

Expected result:

- The wish item is created once and remains visible on both route surfaces.

Failure triage:

- Route: `/home`, `/lists`
- Action: `addWishItemAction`
- Read helper: `getHomePageData(...)`
- RPC: none

## Automated Coverage

- `E2E-WISH-001`
