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

## Phase 2 (Enhancements) - Status: shell-only scaffolding exists
- Trips + albums + map visited places
- Countdowns
- Future notes (locked until date)
- `/map`, `/trips`, `/trips/[tripId]`, `/albums/[albumId]`, `/countdowns`, and `/future-notes` ship as shell-only routes today.
- `/chat` ships as a mock-only route today.
- Backend/domain wiring for Phase 2 entities is still pending.
- Current schema posture: SQL migrations remain authoritative, and the Drizzle baseline artifacts are inventory only until a dedicated adoption task is scoped.

## Phase 3 (Advanced) - Status: shell-only scaffolding exists
- Game kernel + daily question
- Scores / streak
- Fun stats
- `/games`, `/games/[mode]`, and `/stats` currently exist as shell-only routes with no live gameplay or analytics backend.

## Phase 4 (Advanced+) - Status: planned
- AI retrieval search with embeddings
- Remaining game modes and polish
