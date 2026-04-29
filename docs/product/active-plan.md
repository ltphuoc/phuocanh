# Active Product Plan

This is the compact current-intent file for roadmap and feature-planning work. It is not a historical log. When this file conflicts with current runtime status, trust `docs/engineering/route-capability-matrix.md`.

## Current Direction

- Primary priority: choose the next Phase 3 gameplay mode or hardening slice after completed cross-session reveal freshness for `daily_question`, `guess_date`, and `trivia`.
- Work should build from the green production-flow browser baseline for implemented routes.
- Keep write paths behind Server Actions and SQL RPCs; do not add client-owned gameplay writes.
- Keep `/stats` scoped to daily-question gameplay aggregates unless a new analytics contract is explicitly planned.
- Latest shipped hardening: `/games/daily-question`, `/games/guess-date`, and `/games/trivia` now refresh waiting first-partner sessions after the second partner submits, without requiring a manual reload.

## Secondary Maintenance

- Deprecated `/chat` mock route cleanup is complete.
- Do not reintroduce `/chat` as a live backend feature without a new product plan.

## Deferred

- AI retrieval memory search remains Phase 4 work.
- Mapbox, coordinates, provider-backed tiles, route polylines, and deeper travel-map behavior remain deferred.
- Additional gameplay modes beyond the currently implemented `daily_question`, `guess_date`, and `trivia` modes remain deferred.
- Leaderboards, sharing, scoring, similarity matching, answer edits, answer deletes, and gameplay backfill UI remain out of scope until separately decided.

## Decision Queue

- Choose the next live gameplay mode or another hardening slice before implementing more gameplay backend.
- Decide whether travel-map depth should stay deferred until after the next gameplay expansion.
- Decide when Phase 4 AI retrieval search should move from roadmap item to planned implementation slice.

## Agent Instructions

- For roadmap, feature-planning, or "what should we build next" tasks, read this file after `docs/agent/agent-handbook.md`.
- Before changing route behavior, re-check `docs/engineering/route-capability-matrix.md`.
- Before adding schema, RPCs, or storage behavior, re-check `docs/product/business-rules.md` and `docs/engineering/migration-playbook.md`.
- Record user/product choices in `docs/product/user-decisions.md`, engineering tradeoffs in `docs/engineering/tech-decisions.md`, and shipped outcomes in `docs/changelog/implementation-log.md`.
