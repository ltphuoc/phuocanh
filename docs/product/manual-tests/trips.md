# Trips Manual Tests

## Feature Summary

- Covers trip creation and trip detail rendering.

## Routes Covered

- `/trips`
- `/trips/[tripId]`

## Preconditions

- User is authenticated in a ready couple context.
- Use debug token format `DBG-TRIP-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data

- One trip title and optional note containing the debug token.

## Core Smoke Cases

### MAN-TRIP-001 Create a trip and open its detail route

1. Open `/trips`.
2. Create a trip using the debug token in the title or note.
3. Confirm the trip appears in the list.
4. Open the trip detail route.

Expected result:

- The trip persists and the real UUID-backed detail route resolves.

Failure triage:

- Route: `/trips`, `/trips/[tripId]`
- Action: `createTripAction`
- Read helper: `getTripsPageData(...)`, `getTripDetailData(...)`
- RPC: none

## Automated Coverage

- `E2E-TRIP-001`
