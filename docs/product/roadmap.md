# Product Roadmap

Use this file for phase-level direction. Use [active-plan.md](active-plan.md) for the current
planning queue and [../route-capability-matrix.md](../route-capability-matrix.md)
for current route status.

## Implemented Phases

| Phase   | Status                | Delivered scope                                                                                             |
| ------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Phase 1 | implemented           | Auth, couple bootstrap/invite, memories, media, home, on-this-day, lists, checklist, relationship-day UX    |
| Phase 2 | implemented           | Countdowns, future notes, reminders, trips, trip albums, visited places, provider-free map, shared timezone |
| Phase 3 | partially implemented | Daily question, guess date, trivia, daily-question stats, cross-session reveal freshness                    |

## Current Direction

- Choose the next explicit gameplay mode or hardening slice before expanding gameplay backend.
- Keep `/stats` scoped to daily-question gameplay aggregates until a new analytics contract is
  planned.
- Keep travel-map depth deferred until gameplay and stats direction is stable.
- Keep write paths behind Server Actions and SQL RPCs.

## Planned / Deferred

- Phase 4: AI retrieval memory search with embeddings.
- Remaining gameplay modes and polish.
- Gameplay scoring, winners, leaderboards, sharing, similarity matching, and answer management.
- Provider-backed map features such as coordinates, geocoding, tiles, and route polylines.

## Notes For Agents

- This roadmap is not an implementation contract.
- Do not infer live backend support from planned items.
- Record user/product choices in [user-decisions.md](user-decisions.md), engineering tradeoffs in
  [../tech-decisions.md](../tech-decisions.md), and shipped outcomes in
  [../changelog/implementation-log.md](../changelog/implementation-log.md).
