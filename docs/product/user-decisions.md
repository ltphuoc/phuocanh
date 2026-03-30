# User Decisions

## 2026-03-27
- Confirmed phased delivery workflow: implement Phase 1, stop, report, then ask whether to continue.
- Confirmed private scope: exactly two users in one couple space.
- Confirmed map provider default for roadmap: Mapbox (Phase 2). `SUPERSEDED BY 2026-03-29 (Visited-place atlas foundation shipped provider-free; tile-provider work is deferred.)`
- Confirmed AI direction: retrieval-first semantic memory search (Phase 4).
- Confirmed timezone default: Asia/Ho_Chi_Minh.
- Confirmed security hardening direction: invite acceptance and first-space bootstrap must use atomic DB RPCs, not direct table writes in app actions.
- Confirmed execution gate: Phase 2 implementation starts only after Drizzle + Mapbox dependencies can be installed reproducibly in this environment. `SUPERSEDED BY 2026-03-29 (Phase 2 SQL-first slices shipped without this dependency gate.)`
- Local development auth redirects should support both `localhost` and `127.0.0.1` to avoid callback mismatches.

## Implementation Defaults Applied in Phase 1
- First authenticated user bootstraps couple space automatically. `SUPERSEDED BY 2026-03-30 (First-user onboarding now requires explicit confirmation before persistence.)`
- Second user joins via explicit invite token.
- Auth method: Supabase email magic link.

## 2026-03-30
- Confirmed first-user onboarding policy: collect `coupleName`, `timeZone`, and `startedDate` step by step, then persist only after explicit summary confirmation.
- Confirmed onboarding scope: applies only when no couple exists yet (no forced backfill gate for existing ready couples).

## 2026-03-28
- Runtime stabilization is prioritized before Phase 2 coding.
- Upload reliability decision: configure Next.js Server Action body-size limit to `26mb` now, keep direct signed browser upload as a later hardening step.
- Dependency-gate policy retained: no Phase 2 feature coding starts until Drizzle + Mapbox packages are installable and reproducible. `SUPERSEDED BY 2026-03-29 (Phase 2 countdowns, future notes, and trips shipped SQL-first without that gate.)`
- UI redesign direction selected: pastel pink light-mode-only style language. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)`
- Responsive layout decision selected: sidebar + content for tablet/desktop, bottom navigation retained for mobile. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)`

## 2026-03-29
- Finalized UI mode policy: light mode only across the app.
- Finalized visual direction: pastel pink, soft romantic, premium tone. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)`
- Finalized navigation information architecture: `Main + More` grouping with mobile `More` entry. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)` where dock/rail details are now canonical.
- Confirmed shell-route strategy: planned Phase 2+ screens can ship as styled presentational shells before backend wiring.
- Phase 2 execution now follows a SQL-first path for shipped slices; Drizzle and Mapbox package availability are no longer blockers for countdowns, future notes, trips, or albums.
- Confirmed couple-time policy: one shared timezone per couple for this slice; no per-user override yet.
- Confirmed timezone-change semantics: preserve visible countdown and future-note calendar dates rather than preserving the previous absolute instant.
- Confirmed `/settings` graduates from shell-only to the shared-timezone control surface.

## 2026-03-29 (Editorial Redesign Lock)
- Finalized visual refresh away from the earlier cute dashboard framing and toward an editorial-romance keepsake journal aesthetic.
- Finalized story-first home hierarchy: milestone spotlight first, featured memory second, supporting utilities after.
- Finalized typography stack: `Fraunces` for headings/quotes and `Manrope` for body, navigation, and forms.
- Finalized mobile navigation shell: floating dock above the safe area with a centered memory action orb.
- Finalized desktop navigation shell: slim rail plus expandable grouped drawer instead of a full sidebar.
- Confirmed `/chat` ships as a presentational shell route before live messaging/backend contracts are implemented.
- Confirmed trip-rooted album v1: one album per trip, reusing existing `memory_media` rather than a second upload pipeline.
- Confirmed visited-place atlas v1: ship trip-linked `visited_places` and a provider-free atlas first; coordinates and Mapbox-backed tiles remain deferred.
