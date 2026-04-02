# Phase 2 Status

This file tracks the active Phase 2 delivery sequence against the current repository state.

Status values:
- `done`
- `partial`
- `missing`
- `needs rework`

## Current Status (2026-04-02)
- Phase 1 runtime remains stable.
- Phase 2 Slice 1 is implemented for:
  - `/countdowns`
  - `/future-notes`
- Phase 2 Slice 2 is implemented for:
  - `/trips`
  - `/trips/[tripId]`
- Phase 2 Slice 3 is implemented for:
  - `/albums`
  - `/albums/[albumId]`
- Phase 2 Slice 4 is implemented for:
  - `/map`
  - trip-linked visited-place create/read flow on `/trips/[tripId]`
- Couple timezone foundation is implemented for:
  - `/settings`
  - shared day-boundary logic across countdowns, future notes, trips, albums, map, on-this-day, and relationship-day math
- Phase 2 closeout is implemented for:
  - countdown day-of reminder automation
  - future-note unlock reminder automation
  - reminder delivery queue + retry pipeline
  - encrypted-at-rest future-note bodies
- All planned Phase 2 routes and closeout infrastructure are now implemented.
- Phase 3 Slice 1 is implemented for:
  - `/games`
  - `/games/daily-question`
  - `/stats`
  - gameplay schema, gameplay RPCs, and gameplay read model helpers
- Post-closeout engineering follow-up:
  - hosted reminder invocation uses Vault-backed secrets
  - local and CI replay now uses a private fallback secret store when Vault is unavailable

## Checklist
| Item | Status | Notes |
|---|---|---|
| Countdowns | `done` | Real schema, RLS, typed Supabase surface, server reads, Server Action, live route UI, and day-of reminder email enqueueing are implemented. |
| Future notes | `done` | Real schema, encrypted body storage, RPC-backed create/read path, unlock-gated reads, unlock reminder enqueueing, and live route UI are implemented. |
| Trips | `done` | Real schema, RLS, typed Supabase surface, server reads, Server Action, and live route UI are implemented. |
| Albums | `done` | Real trip-rooted schema, RPC-backed mutations, signed media reads, `/albums` index, `/albums/[albumId]` detail, and trip-detail album flows are implemented. |
| Map visited places | `done` | `visited_places`, `getMapPageData(...)`, provider-free atlas UI, and trip-level visited-place create/read flow are implemented. |
| Couple timezone foundation | `done` | `couples.timezone`, `update_couple_timezone(...)`, `updateCoupleTimezoneAction`, live `/settings`, and couple-time day-boundary/date rendering are implemented. |

## Foundational Cleanup Landed In Earlier Slices
| Item | Status | Notes |
|---|---|---|
| Phase 2 route docs sync | `done` | Canonical route, roadmap, product, and engineering docs now reflect the delivered runtime. |
| Shell accessibility | `done` | Icon-only composer buttons expose labels, mobile `More` toggle exposes expanded state, and atlas stop selection state is exposed. |
| Lists localization consistency | `done` | `/lists` renders translated wish-category labels like `/home`. |
| New-form validation UX | `done` | New Phase 2 forms add inline field errors in addition to the shared toast contract. |
| Couple-time semantics | `done` | Countdowns/future notes now store selected local dates through the shared timezone, and trip/album/on-this-day reads no longer depend on UTC day boundaries. |

## Slice 1 Delivered
1. Added `countdowns`, `future_notes`, and `future_note_contents` schema with RLS.
2. Regenerated Supabase types and updated schema inventory docs/code.
3. Added `getCountdownsPageData(...)` and `getFutureNotesPageData(...)` server helpers.
4. Added `createCountdownAction` and `createFutureNoteAction` with narrow revalidation.
5. Replaced `/countdowns` and `/future-notes` shells with live forms, empty states, and rendered data.
6. Synced docs/specs to the delivered runtime and fixed small shared accessibility drift.

## Slice 2 Delivered
1. Added the `trips` schema with date-range constraints and couple-scoped RLS.
2. Regenerated Supabase types and updated schema inventory docs/code.
3. Added `getTripsPageData(...)` and `getTripDetailData(...)` server helpers.
4. Added `createTripAction` with narrow `/trips` revalidation.
5. Replaced `/trips` and `/trips/[tripId]` shells with live forms, grouped trip sections, `notFound()` handling, and rendered data.
6. Synced docs/specs to the delivered runtime and moved the next slice to album/media grouping.

## Slice 3 Delivered
1. Added `albums` and `album_items` schema with trip-rooted constraints and couple-scoped RLS.
2. Added transactional album RPCs `create_album_with_items(...)` and `add_album_items(...)` for multi-row album writes.
3. Regenerated Supabase types and updated schema inventory docs/code.
4. Added `getAlbumsPageData(...)`, `getAlbumDetailData(...)`, and extended `getTripDetailData(...)` with linked album + eligible media state.
5. Added `createAlbumAction` and `addAlbumItemsAction` with narrow route revalidation.
6. Added shared server signed-URL helper reuse for `memory-media`.
7. Replaced `/albums` and `/albums/[albumId]` shells with live data-backed routes.
8. Replaced the trip-detail album placeholder with real album create/add flows and empty states.
9. Synced docs/specs to the delivered runtime and moved the next slice to map foundation.

## Slice 4 Delivered
1. Added the `visited_places` schema with trip-linked date-window enforcement and couple-scoped RLS.
2. Regenerated Supabase types and updated schema inventory docs/code.
3. Added `getMapPageData(...)` and extended `getTripDetailData(...)` with ordered trip visited places.
4. Added `createVisitedPlaceAction` with narrow `/map` and `/trips/[tripId]` revalidation.
5. Replaced the `/map` shell with a live provider-free atlas grouped by trip.
6. Replaced the trip-detail places placeholder with a real create form, ordered place log, and empty state.
7. Synced docs/specs to the delivered runtime and closed the user-facing Phase 2 travel slice.

## Phase 2 Closeout Delivered
1. Added encrypted-at-rest future-note body storage behind SQL-owned encrypt/decrypt helpers and RPCs.
2. Added `reminder_deliveries`, due-reminder enqueueing, claim/retry infrastructure, and cron-driven processing hooks.
3. Added the `reminder-processor` Edge Function with Resend delivery, summary-only templates, and retry/backoff handling.
4. Switched future-note creation and unlocked reads onto RPCs so plaintext no longer lives in application table access paths.
5. Synced runtime copy and docs so reminder automation and encryption are no longer described as deferred.

## Phase 3 Slice 1 Delivered
1. Added `game_mode`, `game_rounds`, and `game_round_answers` with couple-scoped RLS.
2. Added gameplay RPCs `ensure_daily_question_round(...)` and `submit_daily_question_answer(...)`.
3. Updated schema inventory and typed Supabase surfaces for the gameplay tables and RPCs.
4. Added `getGamesHubData(...)`, `getDailyQuestionPageData(...)`, and `getGameplayStatsPageData(...)`.
5. Added `ensureDailyQuestionRoundAction` and `submitDailyQuestionAnswerAction`.
6. Added OpenAI-backed server prompt generation through the Responses API with structured validation.
7. Replaced `/games` and `/stats` shells with live backend-backed routes.
8. Replaced `/games/daily-question` with a live mode flow while keeping other `/games/[mode]` slugs shell-only.
9. Synced docs/specs to the delivered runtime and moved Phase 3 forward to additional gameplay modes rather than the first foundation slice.

## Recommended Next Order
1. Extend gameplay beyond `daily-question` only after the first stats read model is stable.
2. Revisit travel-map depth only after the gameplay and analytics contract is stable.
3. Remove deprecated `/chat` scaffolding as maintenance work.

## Risks And Deferred Items
- There is still only one shared timezone per couple; no per-user timezone override exists.
- Albums currently allow one album per trip only; captions, reordering, removal, and multi-album-per-trip remain deferred.
- The atlas is provider-free; coordinates, route polylines, and provider-backed geographic tiles remain deferred.

## Phase 3 Carry-Forward
- `/chat` remains a deprecated mock artifact in the app and is scheduled for cleanup rather than backend expansion.
- `/chat` cleanup is maintenance work, not part of `Phase 3 Slice 1`.
- `/games/[mode]` remains shell-only for non-`daily-question` slugs.
- Additional gameplay modes, leaderboards, sharing, and similarity scoring remain deferred follow-up work.
