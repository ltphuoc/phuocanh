# User Decisions

## 2026-03-27
- Confirmed phased delivery workflow: implement Phase 1, stop, report, then ask whether to continue.
- Confirmed private scope: exactly two users in one couple space.
- Confirmed map provider default for roadmap: Mapbox (Phase 2).
- Confirmed AI direction: retrieval-first semantic memory search (Phase 4).
- Confirmed timezone default: Asia/Ho_Chi_Minh.
- Confirmed security hardening direction: invite acceptance and first-space bootstrap must use atomic DB RPCs, not direct table writes in app actions.
- Confirmed execution gate: Phase 2 implementation starts only after Drizzle + Mapbox dependencies can be installed reproducibly in this environment.
- Local development auth redirects should support both `localhost` and `127.0.0.1` to avoid callback mismatches.

## Implementation Defaults Applied in Phase 1
- First authenticated user bootstraps couple space automatically.
- Second user joins via explicit invite token.
- Auth method: Supabase email magic link.

## 2026-03-28
- Runtime stabilization is prioritized before Phase 2 coding.
- Upload reliability decision: configure Next.js Server Action body-size limit to `26mb` now, keep direct signed browser upload as a later hardening step.
- Dependency-gate policy retained: no Phase 2 feature coding starts until Drizzle + Mapbox packages are installable and reproducible.
- UI redesign direction selected: pastel pink light-mode-only style language. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)`
- Responsive layout decision selected: sidebar + content for tablet/desktop, bottom navigation retained for mobile. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)`

## 2026-03-29
- Finalized UI mode policy: light mode only across the app.
- Finalized visual direction: pastel pink, soft romantic, premium tone. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)`
- Finalized navigation information architecture: `Main + More` grouping with mobile `More` entry. `SUPERSEDED BY 2026-03-29 (Editorial Redesign Lock)` where dock/rail details are now canonical.
- Confirmed shell-route strategy: planned Phase 2+ screens can ship as styled presentational shells before backend wiring.

## 2026-03-29 (Editorial Redesign Lock)
- Finalized visual refresh away from the earlier cute dashboard framing and toward an editorial-romance keepsake journal aesthetic.
- Finalized story-first home hierarchy: milestone spotlight first, featured memory second, supporting utilities after.
- Finalized typography stack: `Fraunces` for headings/quotes and `Manrope` for body, navigation, and forms.
- Finalized mobile navigation shell: floating dock above the safe area with a centered memory action orb.
- Finalized desktop navigation shell: slim rail plus expandable grouped drawer instead of a full sidebar.
- Confirmed `/chat` ships as a presentational shell route before live messaging/backend contracts are implemented.
