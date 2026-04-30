# Features

This file is the product feature summary. Use
[docs/engineering/route-capability-matrix.md](../engineering/route-capability-matrix.md) for
route-by-route runtime status.

## Implemented

| Area                 | Current capability                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Auth and membership  | Magic-link login, explicit first-user onboarding, invite acceptance, singleton couple space   |
| Memories             | Create memory, optional image/video upload, signed media reads, memory detail                 |
| Home and recap       | Story-first home, relationship-day spotlight, timeline feed, on-this-day                      |
| Lists                | Wish items, checklists, checklist item add/toggle                                             |
| Planning             | Countdowns and future notes                                                                   |
| Reminders            | Countdown day-of and future-note unlock email queue with retry processing                     |
| Travel               | Trips, trip detail, trip albums, visited places, provider-free map                            |
| Gameplay             | Daily question, guess date, trivia, locked partner answers, reveal after both partners submit |
| Stats                | Daily-question participation and streak history                                               |
| Settings             | Shared couple timezone and date-boundary behavior                                             |
| Internationalization | Locale-prefixed `vi` and `en` routes                                                          |

## Deferred

- Additional game modes beyond `daily_question`, `guess_date`, and `trivia`
- Gameplay scoring, winners, leaderboards, sharing, similarity matching, answer edits, answer deletes,
  and backfill UI
- General analytics beyond daily-question gameplay stats
- AI retrieval memory search
- Route polylines and deeper travel-map behavior
- Per-user timezone overrides
- Album captions, reordering, removal, delete flow, and multi-album-per-trip behavior
- Public sharing, native mobile app, and multi-couple workspaces

## Current Non-Contracts

- Shell polish is not proof of backend support.
- `/games/[mode]` is live only for `daily-question`, `guess-date`, and `trivia`.
- `/map` is an atlas over saved location coordinates; route polylines are not implemented.
- `/stats` is gameplay-only and currently sourced from daily-question history.
- Future-note email reminders are summary-only and must not include decrypted note bodies.
