# Map Manual Tests

## Feature Summary
- Covers trip-linked visited places on the provider-free atlas.

## Routes Covered
- `/trips/[tripId]`
- `/map`

## Preconditions
- User is authenticated in a ready couple context.
- One trip already exists.
- Use debug token format `DBG-PLACE-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data
- One visited-place title and note containing the debug token.

## Core Smoke Cases
### MAN-MAP-001 Add a visited place from trip detail and confirm it appears on the atlas
1. Open a real trip detail page.
2. Create a visited place using the debug token.
3. Confirm it appears on the trip detail page.
4. Open `/map` and confirm the same place is visible there.

Expected result:
- The place is saved once and rendered on both the trip detail route and the atlas.

Failure triage:
- Route: `/trips/[tripId]`, `/map`
- Action: `createVisitedPlaceAction`
- Read helper: `getTripDetailData(...)`, `getMapPageData(...)`
- RPC: none

## Automated Coverage
- `E2E-PLACE-001`
