# Manual Smoke Tests

This folder holds the repo-native manual smoke pack for implemented user-facing features.

## Conventions
- Use one run-specific debug token format in any editable text field that accepts free text:
  - `DBG-<FEATURE>-<YYYYMMDD>-<INITIALS>-<NN>`
- Example:
  - `DBG-MEM-20260417-PL-01`
- Reuse the same token across all related steps in one feature run so logs, Mailpit messages, screenshots, traces, and database rows are easy to correlate later.
- Keep smoke execution focused on the listed core cases only. Shell-only, mock-only, and planned features are intentionally excluded from this pack.

## Files
- [auth.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/auth.md)
- [home.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/home.md)
- [memories.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/memories.md)
- [on-this-day.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/on-this-day.md)
- [wishlists.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/wishlists.md)
- [checklists.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/checklists.md)
- [countdowns.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/countdowns.md)
- [future-notes.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/future-notes.md)
- [shared-timezone.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/shared-timezone.md)
- [trips.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/trips.md)
- [map.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/map.md)
- [albums.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/albums.md)
- [games.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/games.md)
- [daily-question.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/daily-question.md)
- [stats.md](/Users/phuocle/Projects/PhuocLe/phuocanh/docs/product/manual-tests/stats.md)
