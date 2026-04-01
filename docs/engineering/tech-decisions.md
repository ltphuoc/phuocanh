# Technical Decisions

## 2026-03-27 (Phase 1)
- Chosen auth flow: Supabase magic link + invite token for second user onboarding.
- Chosen authorization scope: couple-scoped ACL via RLS helper function `is_couple_member`.
- Chosen storage model: private bucket `memory-media` with path contract `couples/{coupleId}/memories/{memoryId}/...`.
- Chosen UI base: Tailwind + shadcn-style component source files with `components.json` in repo.
- Chosen server mutation model: Server Actions for app writes.

## 2026-03-27 (Stage A Hardening)
- Chosen invite acceptance path: single `accept_couple_invite` security-definer RPC to enforce token validity, expiration, role assignment, and invite completion atomically.
- Chosen first-space bootstrap path: `bootstrap_first_couple` security-definer RPC with advisory lock + singleton index to prevent concurrent duplicate couple creation.
- Chosen redirect policy: strict internal path normalization for auth callback `next` parameter, fallback to `/home` on malformed values.
- Chosen write-consistency strategy for memory uploads: validate constraints pre-insert and use compensating rollback for partial failures.
- Chosen on-this-day query model: SQL day-of-year filtering (`memories_on_this_day`) instead of capped in-memory filtering.

## 2026-03-27 (Local Auth Config)
- Chosen local auth URL policy: `site_url` defaults to `http://localhost:3000` with explicit allow-list entries for both `localhost` and `127.0.0.1` callback URLs.

## Constraints / Deferred
- Historical note: Drizzle package installation was blocked in an earlier sandbox session. Do not treat that as a current repository invariant.
- Current rule: Phase 1 schema remains SQL-first, and Drizzle baseline files are inventory only until a dedicated adoption task is scoped.

## 2026-03-28 (Runtime Stabilization + Gate)
- Chosen upload reliability tradeoff: set Next.js `experimental.serverActions.bodySizeLimit` to `26mb` to align with existing 25MB media contract.
- Chosen missing-schema handling: detect schema-cache table-miss errors in auth gate reads and surface actionable setup guidance in UI.
- Chosen Drizzle gate posture: add compile-safe baseline mapping artifacts first, then switch to real Drizzle schema definitions only after package access is restored.

## 2026-03-28 (UI Redesign) — DEPRECATED / SUPERSEDED BY 2026-03-29 (Editorial Redesign)
- Historical direction: mobile bottom navigation + tablet/desktop sidebar navigation from one shared navigation model.
- Historical direction: pastel pink light-mode-only system with soft premium surfaces.
- Historical direction: retain Geist fonts to avoid new network/font dependency risk.
- Current UI architecture and typography are defined by the 2026-03-29 sections and `docs/engineering/frontend-architecture.md`.

## 2026-03-29 (UI Architecture Finalization)
- Chosen light-mode policy: enforce light mode only and remove dark-mode token branching in global styles.
- Chosen navigation IA: `Primary + More` grouping with one source-of-truth navigation model.
- Chosen icon model: typed `lucide-react` icon components for navigation and shared shell cards.
- Chosen feature-page strategy: add presentational shell routes for planned sections while keeping backend/business contracts untouched.

## 2026-03-29 (Editorial Redesign)
- Chosen visual direction: editorial-romance shell that feels like a private keepsake journal rather than a boxed dashboard.
- Chosen home hierarchy: relationship milestone and featured-memory storytelling surfaces lead, utility content follows.
- Chosen typography strategy: move from Geist to `Fraunces` for display moments and `Manrope` for UI/body copy via `next/font/google`.
- Chosen motion layer: adopt `motion` for shared-layout transitions, dock state animation, and gentle reveal choreography.
- Chosen responsive shell pattern: floating mobile dock with centered memory action orb, plus slim desktop rail with expandable grouped drawer.
- Chosen `/chat` cleanup posture: leave the presentational conversation shell only as a temporary deprecated artifact until navigation/route cleanup lands.
- Confirmed trip-rooted album v1: one album per trip, reusing existing `memory_media` rather than a second upload pipeline.

## 2026-03-29 (Visited-Place Atlas Foundation)
- Chosen visited-place contract: add manual trip-linked `visited_places` rows rather than auto-deriving stops from `memories.location_name`.
- Chosen map delivery strategy: ship a provider-free atlas UI first, grouped by trip, without introducing Mapbox, coordinates, or new environment requirements.
- Chosen travel hierarchy rule: keep visited places rooted in `trips` alongside albums rather than inventing a parallel place hierarchy.

## 2026-03-30 (Onboarding Safety Hardening)
- Chosen first-user entry path: replace implicit auth-gate bootstrap with explicit `/onboarding` flow before any bootstrap write.
- Chosen write-safety model: persist first-user bootstrap data only after explicit summary confirmation in the onboarding form.
- Chosen bootstrap transaction shape: extend `bootstrap_first_couple(...)` to accept `target_timezone` so name, started date, timezone, and first membership commit atomically in one RPC.

## 2026-03-31 (Phase 2 Closeout)
- Chosen future-note storage model: move plaintext note bodies out of direct app table reads/writes and store encrypted `body_encrypted` payloads behind SQL helper functions.
- Chosen future-note mutation path: replace app-side two-step insert + rollback with `create_future_note_with_body(...)` so metadata and encrypted body commit atomically.
- Chosen unlocked-read path: use `get_unlocked_future_note_contents(...)` RPC instead of member-facing `future_note_contents` select policies.
- Chosen reminder durability model: persist reminder work in `reminder_deliveries` with idempotent uniqueness on `(kind, source_id, recipient_user_id)`.
- Chosen reminder execution model: enqueue due reminder rows in Postgres, then deliver them from a Supabase Edge Function using service-role access and Resend.
- Chosen cron invocation auth: use `project_url` + `anon_key` for `pg_net` calls into the reminder Edge Function, with Vault as the hosted secret backend and a private fallback store for local/CI replay.
