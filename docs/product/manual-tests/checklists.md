# Checklists Manual Tests

## Feature Summary
- Covers checklist creation, item add, completion, and undo.

## Routes Covered
- `/home`
- `/lists`

## Preconditions
- User is authenticated in a ready couple context.
- Use debug token format `DBG-CHK-<YYYYMMDD>-<INITIALS>-<NN>`.

## Required Test Data
- One checklist title and one checklist item text containing the debug token.

## Core Smoke Cases
### MAN-CHK-001 Create a checklist and add an item
1. Open `/home` or `/lists`.
2. Create a checklist using the debug token in the title.
3. Add one checklist item using the debug token in the text.
4. Confirm the new checklist and item are visible.

Expected result:
- The checklist and first item persist and render immediately.

Failure triage:
- Route: `/home`, `/lists`
- Action: `createChecklistAction`, `addChecklistItemAction`
- Read helper: `getHomePageData(...)`
- RPC: none

### MAN-CHK-002 Toggle an item done and undo
1. Open the checklist created above.
2. Mark the debug-token item as done.
3. Confirm the item shows the completed state.
4. Undo it and confirm it returns to pending.

Expected result:
- Done and undo both persist correctly on refresh.

Failure triage:
- Route: `/home`, `/lists`
- Action: `toggleChecklistItemAction`
- Read helper: `getHomePageData(...)`
- RPC: none

## Automated Coverage
- `E2E-CHK-001`
