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
- Remaining Phase 2 work is now concentrated in the visited-place/map slice only.

## Checklist
| Item | Status | Notes |
|---|---|---|
| Countdowns | `done` | Real schema, RLS, typed Supabase surface, server reads, Server Action, and live route UI are implemented. |
| Future notes | `done` | Real schema, secure split body table, unlock-gated reads, Server Action rollback path, and live route UI are implemented. |
| Trips | `done` | Real schema, RLS, typed Supabase surface, server reads, Server Action, and live route UI are implemented. |
| Albums | `done` | Real trip-rooted schema, RPC-backed mutations, signed media reads, `/albums` index, `/albums/[albumId]` detail, and trip-detail album flows are implemented. |
| Map visited places | `partial` | `/map` and `TravelAtlasShell` exist, but there is no visited-place schema, no pin model, and no Mapbox wiring. |

## Foundational Cleanup Landed In Earlier Slices
| Item | Status | Notes |
|---|---|---|
| Phase 2 route docs sync | `done` | Canonical route, roadmap, product, and engineering docs now reflect the delivered runtime. |
| Shell accessibility | `done` | Icon-only composer buttons expose labels, mobile `More` toggle exposes expanded state, and atlas stop selection state is exposed. |
| Lists localization consistency | `done` | `/lists` renders translated wish-category labels like `/home`. |
| New-form validation UX | `done` | New Phase 2 forms add inline field errors in addition to the shared toast contract. |

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

## Next Slice
Objective:
- Establish visited-place/map foundation on top of the existing trip + album contract and move `/map` from shell-only to implemented.

Decision-Complete Deliverables:
- Add trip-linked visited-place table(s) and regenerate the typed Supabase surface.
- Add server read helpers for `/map` and any trip-linked map summary UI needed.
- Define the first real map contract on top of trips rather than inventing a parallel place model.
- Replace the shell-only route content on `/map` with real data-backed UI.
- Keep chat and games/stats explicitly out of the remaining Phase 2 travel scope.

Non-Goals For That Slice:
- No chat backend or realtime work.
- No gameplay or stats backend work.
- No broad travel refactor beyond the map foundation needed for current routes.

Success Criteria:
- `/map` becomes implemented with a real read model.
- The visited-place contract is explicitly linked to `trips` rather than inventing a separate hierarchy.
- `docs/product` and `docs/engineering` remain aligned in the same change set.

## Implementation Order After Slice 3
1. Add visited-place/map schema and rendering on top of the trip + album model.
2. Start the Phase 3 track with chat backend/realtime scope.
3. Continue with games/stats backend work.

## Risks And Deferred Items
- Reminder automation is still deferred; countdowns do not schedule jobs yet.
- Future note bodies are policy-gated, but encryption-at-rest is not implemented.
- Trip status is currently derived against the UTC calendar day until a couple-level timezone model exists.
- Albums currently allow one album per trip only; captions, reordering, removal, and multi-album-per-trip remain deferred.
- Map surfaces still need a coherent visited-place model on top of the now-live trip + album contract.

## Phase 3 Carry-Forward
- `/chat` remains mock-only and is no longer tracked as remaining Phase 2 scope.
- Chat backend, message persistence, presence, and attachment contracts belong to the Phase 3 track.
- `/games`, `/games/[mode]`, and `/stats` remain shell-only and also belong to the Phase 3 backend track.
