# Product Roadmap

## Phase 1 (MVP) - Status: implemented
- Private auth + couple membership bootstrap/invite
- Memories CRUD (create + view detail) with optional media upload
- Timeline feed and On This Day
- Relationship day counter
- Wishlists and checklists
- Mobile-first navigation shell
- Stage A hardening complete: invite/bootstrap moved to atomic RPCs, callback redirect hardened, memory rollback safeguards added, on-this-day query corrected.
- Runtime stabilization complete: schema-readiness errors are surfaced with actionable setup guidance, and upload request limits now match 25MB memory media contract.
- Responsive editorial redesign complete for Phase 1 routes: story-first home, floating dock + rail shell, Fraunces + Manrope typography, and premium light-only surfaces.

## Phase 2 (Enhancements) - Status: implemented
- Implemented in Slice 1:
  - Countdowns
  - Future notes (metadata + locked body model)
- Implemented in Slice 2:
  - Trips foundation (`trips` schema + live `/trips` and `/trips/[tripId]`)
- Implemented in Slice 3:
  - Trip albums foundation (`albums`, `album_items`, live `/albums`, live `/albums/[albumId]`)
- Implemented in Slice 4:
  - Visited-place atlas foundation (`visited_places`, live `/map`, live trip-level place create/read flow)
- Implemented in follow-up foundation work:
  - Couple timezone model (`couples.timezone`, live `/settings`, and couple-scoped day boundaries)
- Implemented in Phase 2 closeout:
  - Countdown day-of reminder automation
  - Future-note unlock reminder automation
  - Reminder queue/retry pipeline
  - Encryption-at-rest for future-note bodies
- Current route posture:
  - `/countdowns`, `/future-notes`, `/trips`, `/trips/[tripId]`, `/albums`, `/albums/[albumId]`, `/map`, and `/settings` are backend-backed implemented routes.
- Current schema posture: SQL migrations remain authoritative, and the Drizzle baseline artifacts are inventory only until a dedicated adoption task is scoped.
- Latest documented slice: `Phase 2 closeout`
  - adds encrypted future-note body storage and RPC-backed future-note create/read paths
  - adds `reminder_deliveries`, reminder enqueueing, claim/retry RPCs, and the reminder Edge Function
  - schedules cron-driven reminder enqueue and reminder processing jobs
- Post-closeout validation note:
  - hosted environments use Vault-backed secrets for reminder invocation
  - local and CI replay now falls back to a private secret store when Vault is unavailable
- Next implementation step after the Phase 2 closeout:
  - `Phase 3 Slice 1: Games + Stats foundation`
  - `/games` becomes a backend-backed hub with real mode availability and entry links
  - `/games/[mode]` gets one live gameplay runtime in this slice: `/games/daily-question`
  - `/stats` becomes a real couple-scoped gameplay read model with score/streak aggregates
  - write paths stay on Server Actions or SQL RPCs; no client-owned gameplay write layer is introduced
  - this slice does not include `/chat`, additional game modes, or deeper travel-map work
- Downstream implementation order after `Phase 3 Slice 1`:
  - extend gameplay beyond `daily-question` only after the first stats read model is live
  - revisit travel-map depth after the gameplay and stats contract is stable
- Still deferred after the Phase 2 closeout:
  - coordinates and route polylines
  - provider-backed geographic tiles
- See `docs/product/phase-2-status.md` for the living status tracker.

## Phase 3 (Advanced) - Status: shell-only scaffolding exists
- Game kernel + daily question
- Scores / streak
- Fun stats
- Current implementation target: `Phase 3 Slice 1: Games + Stats foundation`
  - ship a real `/games` hub backed by mode availability
  - ship one live mode only: `/games/daily-question`
  - ship a real `/stats` read model sourced from couple-scoped gameplay history
- `/chat` is not part of the Phase 3 feature roadmap; it remains a deprecated mock artifact pending route cleanup.

## Phase 4 (Advanced+) - Status: planned
- AI retrieval search with embeddings
- Remaining game modes and polish
