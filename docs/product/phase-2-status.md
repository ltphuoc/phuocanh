# Phase 2 Status

This file tracks the active Phase 2 delivery sequence against the current repository state.

Status values:
- `done`
- `partial`
- `missing`
- `needs rework`

## Current Status (2026-03-29)
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
- All planned user-facing Phase 2 routes are now implemented.

## Checklist
| Item | Status | Notes |
|---|---|---|
| Countdowns | `done` | Real schema, RLS, typed Supabase surface, server reads, Server Action, and live route UI are implemented. |
| Future notes | `done` | Real schema, secure split body table, unlock-gated reads, Server Action rollback path, and live route UI are implemented. |
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

## Implementation Order After Slice 4
1. Start the Phase 3 track with chat backend/realtime scope.
2. Continue with games/stats backend work.
3. Revisit reminder jobs only if asynchronous delivery becomes a near-term product priority.

## Risks And Deferred Items
- Reminder automation is still deferred; countdowns do not schedule jobs yet.
- Future note bodies are policy-gated, but encryption-at-rest is not implemented.
- There is still only one shared timezone per couple; no per-user timezone override exists.
- Albums currently allow one album per trip only; captions, reordering, removal, and multi-album-per-trip remain deferred.
- The atlas is provider-free; coordinates, route polylines, and provider-backed geographic tiles remain deferred.

## Phase 3 Carry-Forward
- `/chat` remains mock-only and is no longer tracked as remaining Phase 2 scope.
- Chat backend, message persistence, presence, and attachment contracts belong to the Phase 3 track.
- `/games`, `/games/[mode]`, and `/stats` remain shell-only and also belong to the Phase 3 backend track.
