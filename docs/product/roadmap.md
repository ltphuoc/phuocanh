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

## Phase 2 (Enhancements) - Status: partial
- Implemented in Slice 1:
  - Countdowns
  - Future notes (metadata + locked body model)
- Implemented in Slice 2:
  - Trips foundation (`trips` schema + live `/trips` and `/trips/[tripId]`)
- Implemented in Slice 3:
  - Trip albums foundation (`albums`, `album_items`, live `/albums`, live `/albums/[albumId]`)
- Still deferred in Phase 2:
  - Map visited places
  - Reminder automation, encryption-at-rest, and timezone-aware scheduling jobs
- Current route posture:
  - `/countdowns`, `/future-notes`, `/trips`, `/trips/[tripId]`, `/albums`, and `/albums/[albumId]` are backend-backed implemented routes.
  - `/map` remains shell-only.
- Current schema posture: SQL migrations remain authoritative, and the Drizzle baseline artifacts are inventory only until a dedicated adoption task is scoped.
- Next documented slice: `Visited-place map foundation`
  - add trip-linked visited-place entities and read helpers
  - implement `/map` on top of the existing trip + album contract
  - keep chat and games/stats out of the remaining Phase 2 travel scope
- Downstream implementation order after the map slice:
  - finish any deferred travel hardening (jobs/timezone refinements if still needed)
  - start Phase 3 with chat backend/realtime, then games/stats backend work
- See `docs/product/phase-2-status.md` for the living status tracker.

## Phase 3 (Advanced) - Status: shell-only and mock-only scaffolding exists
- Chat backend/realtime model (`/chat` remains mock-only until this phase is scoped)
- Game kernel + daily question
- Scores / streak
- Fun stats
- `/chat` is mock-only; `/games`, `/games/[mode]`, and `/stats` are shell-only with no live gameplay, messaging, or analytics backend.

## Phase 4 (Advanced+) - Status: planned
- AI retrieval search with embeddings
- Remaining game modes and polish
