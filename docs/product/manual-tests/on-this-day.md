# On This Day Manual Tests

## Feature Summary
- Covers the same-calendar-day memory recap surface.

## Routes Covered
- `/on-this-day`

## Preconditions
- User is authenticated in a ready couple context.
- At least one memory exists on the same month/day as today in the couple timezone.
- Use debug token format `DBG-OTD-<YYYYMMDD>-<INITIALS>-<NN>` in the supporting memory note.

## Required Test Data
- One memory that should match today’s calendar day in the current couple timezone.

## Core Smoke Cases
### MAN-OTD-001 Matching memory appears on the recap page
1. Create or identify a memory whose local calendar day matches today.
2. Open `/on-this-day`.
3. Confirm the memory note containing the debug token is visible.
4. Open the memory from the recap page and confirm the detail route resolves.

Expected result:
- The recap page surfaces the matching memory and links to its real detail page.

Failure triage:
- Route: `/on-this-day`
- Action: none directly
- Read helper: `getOnThisDayData(...)`
- RPC: `memories_on_this_day(...)`

## Automated Coverage
- `E2E-OTD-001`
