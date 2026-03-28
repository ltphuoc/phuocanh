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
| 7 | Map các nơi đã đi cùng nhau | 2 | shell-only |
| 8 | Album theo từng chuyến đi | 2 | shell-only |
| 9 | Countdown sinh nhật / anniversary / chuyến đi | 2 | shell-only |
| 10 | Private couple chat | 2 | mock-only |
| 11 | Quiz ai nhớ rõ hơn | 3 | shell-only |
| 12 | Guess the date/place | 3-4 | shell-only |
| 13 | This or that | 4 | planned |
| 14 | Memory cards từ ảnh thật | 4 | planned |
| 15 | Daily question | 3 | shell-only |
| 16 | Điểm số / streak | 3 | shell-only |
| 17 | Future notes mở vào ngày định sẵn | 2 | shell-only |
| 18 | Couple AI Memory Search | 4 | planned |
| 19 | Các stats vui | 3 | shell-only |

## Phase 1 Notes
- Implemented authentication with magic-link + invite acceptance flow.
- Implemented couple membership bootstrap for first user and invite flow for second user.
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
- `mock-only`: `/chat` now exists as a styled route with sample conversation content, but no live messaging backend exists.
- `shell-only`: `/map`, `/trips`, `/trips/[tripId]`, `/albums/[albumId]`, `/countdowns`, `/future-notes`, `/games`, `/games/[mode]`, `/stats`, and `/settings` are presentational route shells only.
