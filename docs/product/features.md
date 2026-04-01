# Features

Status values: `implemented`, `shell-only`, `mock-only`, `planned`.

Use `docs/engineering/route-capability-matrix.md` as the canonical route-by-route current-state reference. This file tracks product features, not just routes.

| # | Feature | Phase | Status |
|---|---|---|---|
| 1 | Timeline kỷ niệm | 1 | implemented |
| 2 | Upload ảnh/video/ngắn note | 1 | implemented |
| 3 | On this day | 1 | implemented |
| 4 | Counter yêu nhau bao lâu | 1 | implemented |
| 5 | Danh sách nơi muốn đi / món muốn ăn / phim muốn xem | 1 | implemented |
| 6 | Checklist hoàn thành | 1 | implemented |
| 7 | Map các nơi đã đi cùng nhau | 2 | implemented |
| 8 | Album theo từng chuyến đi | 2 | implemented |
| 9 | Countdown sinh nhật / anniversary / chuyến đi | 2 | implemented |
| 10 | Quiz ai nhớ rõ hơn | 3 | shell-only |
| 11 | Guess the date/place | 3-4 | shell-only |
| 12 | This or that | 4 | planned |
| 13 | Memory cards từ ảnh thật | 4 | planned |
| 14 | Daily question | 3 | shell-only |
| 15 | Điểm số / streak | 3 | shell-only |
| 16 | Future notes mở vào ngày định sẵn | 2 | implemented |
| 17 | Couple AI Memory Search | 4 | planned |
| 18 | Các stats vui | 3 | shell-only |
| 19 | Trips foundation | 2 | implemented |
| 20 | Shared couple timezone + date boundaries | 2 | implemented |

## Phase 1 Notes
- Implemented authentication with magic-link + invite acceptance flow.
- Implemented explicit first-user onboarding with confirmation-backed couple bootstrap, plus invite flow for second user.
- Implemented core memories flow with optional image/video upload to private storage.

## Phase 1 Hardening (Stage A)
- `implemented`: invite acceptance is now atomic via `accept_couple_invite` RPC (no direct client-side invite row reads/writes).
- `implemented`: first-space bootstrap is now atomic via `bootstrap_first_couple` RPC with advisory lock and singleton enforcement.
- `implemented`: auth callback redirect now normalizes and rejects protocol-relative or malformed `next` paths.
- `implemented`: memory create flow now validates file constraints before insert and rolls back DB/storage on upload metadata failures.
- `implemented`: on-this-day now queries by calendar day in SQL, removing capped in-app filtering.

## Runtime Stabilization (2026-03-28)
- `implemented`: missing-schema runtime failures now surface actionable local setup recovery steps in UI.
- `implemented`: memory upload transport limit is aligned with feature contract (25MB) via Next.js server action body-size config.

## Editorial UI Redesign (2026-03-29)
- `implemented`: the app now uses a story-first editorial shell instead of a generic dashboard composition.
- `implemented`: home begins with an anniversary/relationship-day spotlight and a memory-first feed.
- `implemented`: typography now uses `Fraunces` for editorial display moments and `Manrope` for body and controls.
- `implemented`: the light-only token system now includes semantic surfaces, gradients, radii, and layered shadows for premium depth.
- `implemented`: mobile navigation is now a floating dock with a centered memory action orb and a separate `More` sheet.
- `implemented`: tablet/desktop navigation is now a slim rail with an expandable secondary drawer instead of the older grouped sidebar.
- `implemented`: timeline cards were replaced with collectible “memory object” surfaces and a story ribbon presentation.
- `mock-only`: `/chat` now exists as a styled route with sample conversation content, but it is a deprecated mock artifact rather than a planned product slice.
- `shell-only`: `/games`, `/games/[mode]`, and `/stats` are still presentational route shells only.

## Phase 2 Slice 1 (2026-03-29)
- `implemented`: `/countdowns` now reads and writes live Phase 2 countdown rows.
- `implemented`: `/future-notes` now reads and writes live metadata plus secure note bodies gated by unlock date.
- `implemented`: shared accessibility and consistency fixes landed alongside the slice (`/lists` label parity, icon-button labels, mobile `More` semantics).

## Phase 2 Slice 2 (2026-03-29)
- `implemented`: `/trips` now reads and writes live trip rows through the `trips` schema and `createTripAction`.
- `implemented`: `/trips/[tripId]` now resolves real couple-scoped trip detail and returns `notFound()` for invalid or foreign IDs.
- `implemented`: trip UI now uses real date-range and duration metadata instead of fake memory/album counts.

## Phase 2 Slice 3 (2026-03-29)
- `implemented`: albums now exist as real trip-rooted entities backed by `albums` and `album_items`.
- `implemented`: `/albums` now lists real albums with linked trip context, cover media, and item counts.
- `implemented`: `/albums/[albumId]` now renders real signed album media and linked trip data.
- `implemented`: `/trips/[tripId]` now supports creating the trip album and adding remaining eligible media later.
- `implemented`: album grouping reuses existing `memory_media`; no second upload pipeline was introduced.

## Phase 2 Slice 4 (2026-03-29)
- `implemented`: visited places now exist as real trip-linked entities backed by `visited_places`.
- `implemented`: `/map` now renders a real provider-free atlas grouped by trip and backed by live visited-place rows.
- `implemented`: `/trips/[tripId]` now supports creating visited places and reading the ordered trip place log.
- `implemented`: the atlas slice keeps the travel contract rooted in trips and does not add Mapbox or coordinate fields yet.
- `deferred`: coordinates, route polylines, and provider-backed geographic tiles remain follow-up travel work rather than part of this slice.

## Couple Timezone Foundation (2026-03-29)
- `implemented`: `/settings` now owns the shared couple timezone instead of acting as a shell-only More hub.
- `implemented`: countdown and future-note forms now submit date-only values and the server derives stored instants from the saved couple timezone.
- `implemented`: relationship-day math, on-this-day, trip status, album media eligibility, album detail dates, trip dates, and map dates now use the saved couple timezone.
- `implemented`: changing the couple timezone preserves visible countdown and future-note calendar dates instead of shifting them unexpectedly.
- `deferred`: per-user timezone overrides remain out of scope.

## Phase 2 Closeout (2026-04-01)
- `implemented`: countdowns now enqueue one day-of reminder email per active partner based on the saved couple timezone.
- `implemented`: future notes now store encrypted bodies at rest and only decrypt through unlock-gated RPC reads.
- `implemented`: future-note creation now runs through a transactional SQL RPC instead of a two-step app write plus rollback.
- `implemented`: unlock reminder emails are summary-only and do not include the future-note body.
- `implemented`: reminder delivery now uses durable queue rows plus claim/retry processing in the reminder Edge Function.
- `implemented`: the product scope for Phase 2 is complete, with Vault-backed reminder secrets in hosted environments and a private fallback secret store for local/CI replay when Vault is unavailable.

## Phase 3 Carry-Forward
- `deprecated`: `/chat` remains in the app only as a mock artifact pending cleanup and is no longer part of the product roadmap.
- `deprecated`: `/chat` route removal is maintenance work and not part of the next gameplay slice.
- `shell-only`: `/games`, `/games/[mode]`, and `/stats` remain presentational scaffolding today.
- `planned`: the next product slice is `Phase 3 Slice 1: Games + Stats foundation`.
- `planned`: `/games` becomes a live hub with backend-backed mode availability and entry links.
- `planned`: `/games/daily-question` is the single first live gameplay mode because it is the narrowest fit for prompt, answer, streak, and stats wiring.
- `planned`: `/stats` becomes a real couple-scoped read model for gameplay history plus score/streak aggregates.
- `planned`: additional game modes, leaderboards, sharing, and travel-map depth remain outside the first Phase 3 slice.
