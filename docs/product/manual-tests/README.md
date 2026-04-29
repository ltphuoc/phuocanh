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

- [auth.md](./auth.md)
- [home.md](./home.md)
- [memories.md](./memories.md)
- [on-this-day.md](./on-this-day.md)
- [wishlists.md](./wishlists.md)
- [checklists.md](./checklists.md)
- [countdowns.md](./countdowns.md)
- [future-notes.md](./future-notes.md)
- [shared-timezone.md](./shared-timezone.md)
- [trips.md](./trips.md)
- [map.md](./map.md)
- [albums.md](./albums.md)
- [games.md](./games.md)
- [daily-question.md](./daily-question.md)
- [stats.md](./stats.md)
