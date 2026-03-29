# Implementation Log

## 2026-03-29 - Phase 2 Slice 3: Trip Albums Foundation

### Delivered
- Added Phase 2 Slice 3 migration `20260329170000_phase2_slice3_trip_albums_foundation.sql` with:
  - `albums`
  - `album_items`
  - trip-rooted one-album-per-trip constraint
  - couple-scoped RLS policies for album reads/writes
  - deferred album integrity trigger preventing empty albums from committing
  - transactional SQL RPCs `create_album_with_items(...)` and `add_album_items(...)`
- Regenerated `src/lib/supabase/database.types.ts` and updated schema inventory in `src/lib/db/schema.ts`.
- Added Phase 2 server read helpers:
  - `getAlbumsPageData(...)`
  - `getAlbumDetailData(...)`
  - extended `getTripDetailData(...)` with linked album summary and remaining eligible album media
- Added Phase 2 Server Actions:
  - `createAlbumAction`
  - `addAlbumItemsAction`
- Added shared signed media helper:
  - `signMemoryMediaStorageItems(...)`
  - reused by home, memory detail, and album reads
- Replaced `/albums` shell navigation target with a live albums index route.
- Replaced `/albums/[albumId]` shell with:
  - real album lookup
  - linked trip summary
  - signed image/video grid
  - real empty state
- Replaced the trip-detail album placeholder with:
  - live create-album form when eligible media exists
  - live add-more-media form when an album already exists
  - real empty state when no eligible media exists
- Synced product and engineering docs to mark albums implemented and moved the next slice to map foundation.

### Verification
- `supabase db reset --local`
- `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm i18n:check`
- `pnpm i18n:audit-hardcoded`

### Notes
- Slice 3 intentionally keeps one album per trip as the v1 contract.
- Album grouping reuses existing `memory_media`; no second upload/storage path was introduced.

## 2026-03-29 - Phase 2 Slice 1: Real Countdowns + Secure Future Notes

### Delivered
- Added Phase 2 schema migration `20260329110000_phase2_slice1_countdowns_future_notes.sql` with:
- `countdown_kind` enum
- `countdowns`
- `future_notes`
- `future_note_contents`
- RLS policies for member-scoped reads/writes and unlock-gated future-note body reads
- Regenerated `src/lib/supabase/database.types.ts` and updated schema inventory in `src/lib/db/schema.ts`.
- Added Phase 2 server read helpers:
- `getCountdownsPageData(...)`
- `getFutureNotesPageData(...)`
- Added Phase 2 Server Actions:
- `createCountdownAction`
- `createFutureNoteAction`
- future-note metadata rollback on body insert failure
- Replaced `/countdowns` shell with:
- live create form
- upcoming/past sections
- empty states
- date-backed countdown rendering via `CountdownWidgetTemplate`
- Replaced `/future-notes` shell with:
- live create form
- locked/unlocked sections
- secure unlocked body rendering via `FutureNoteCard`
- empty states
- Landed shared consistency/accessibility fixes needed during the slice:
- `/lists` wish-category badge localization parity with `/home`
- chat composer icon button labels
- mobile `More` toggle expanded-state semantics
- atlas stop selected-state semantics
- Synced product and engineering docs to mark `/countdowns` and `/future-notes` as implemented Phase 2 routes.

### Verification
- `supabase db reset --local`
- `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
- `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select tablename from pg_tables ..."`
- `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select tablename, policyname from pg_policies ..."`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm i18n:check`
- `pnpm i18n:audit-hardcoded`

### Notes
- Browser smoke for authenticated `/countdowns` and `/future-notes` was not run in this log entry because the local app routes are behind auth and no scripted local auth session was established in this run.

## 2026-03-27 - Phase 1 MVP

### Delivered
- Added Phase 1 schema migration with RLS policies and private storage policy.
- Implemented auth (magic link + callback) and invite acceptance flow.
- Implemented protected app shell with mobile-first navigation.
- Implemented memory capture flow (note + optional image/video upload).
- Implemented timeline and on-this-day views.
- Implemented relationship day counter on home.
- Implemented wish items and checklists with toggle.
- Added required product/engineering documentation set as source of truth.

### Known Gaps
- Drizzle ORM package integration is deferred due offline dependency constraints in this environment.
- Media processing/transcoding and thumbnail generation are not included in Phase 1.
- Automated tests are not yet added (Phase 1 focused on baseline functionality + schema/security).

## 2026-03-27 - Stage A Hardening (Fix-All)

### Delivered
- Added hardening migration `20260327233000_phase1_hardening.sql`.
- Added singleton couple-space index and active-role uniqueness index.
- Added stronger max-two-members enforcement trigger for insert/update paths.
- Tightened RLS policies: blocked direct membership inserts and restricted invite row read/update to members.
- Added `bootstrap_first_couple` RPC and moved bootstrap flow in app to RPC.
- Added `accept_couple_invite` RPC and moved invite acceptance action to RPC.
- Hardened `/auth/callback` redirect target normalization for `next`.
- Added pre-insert file validation and rollback cleanup for partial memory upload failures.
- Replaced capped on-this-day in-app filtering with SQL-side `memories_on_this_day` RPC query.
- Updated docs to reflect hardening decisions and contracts.

### Migration / Operational Notes
- New RPCs are granted to `authenticated` and revoked from `public`.
- `memories_delete` policy is added to support compensating rollback for failed memory uploads.

### Remaining Gaps
- Stage B dependency gate is still required before Phase 2 delivery:
- install `drizzle-orm`, `drizzle-kit`, `mapbox-gl`, and a React Mapbox wrapper with reproducible lockfile/CI install.
- Stage B gate attempt on 2026-03-27 failed due registry DNS/network access (`ENOTFOUND registry.npmjs.org` and no offline metadata for `drizzle-kit`).

## 2026-03-27 - Local Env/Auth Redirect Fix

### Delivered
- Fixed local Supabase auth URL configuration in `supabase/config.toml`:
- `site_url` now uses `http://localhost:3000`.
- `additional_redirect_urls` now explicitly allows both `localhost` and `127.0.0.1` callback URLs over HTTP.
- Updated `.env.example` to provide a working local Supabase API URL default (`http://127.0.0.1:54321`).
- Updated README local environment instructions to avoid host mismatch during auth callback.

## 2026-03-28 - Server Action Runtime Unblock

### Delivered
- Fixed Next.js server-action contract violation by removing non-async export from `auth-actions.ts`.
- Moved invite initial action state to client form module.
- Updated client forms to dispatch `useActionState` actions inside `startTransition` to satisfy React/Next runtime constraints.

### Verification
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- Next.js runtime diagnostics no longer report `invalid-use-server-value` or `useActionState` transition errors on `/login`.

## 2026-03-28 - Login Reachability Hardening

### Delivered
- Added local Supabase URL fallback for magic-link requests (`localhost` ⇄ `127.0.0.1`) in auth action flow.
- Added clearer login error for network reachability failures to replace generic `fetch failed`.
- Added server client factory support for explicit Supabase URL override in server actions.

### Notes
- Login still requires a reachable Supabase Auth endpoint on local port `54321`.

## 2026-03-28 - Magic Link Callback Compatibility Fix

### Delivered
- Updated auth callback handler to support both Supabase magic-link callback shapes:
- PKCE flow via `code` + `exchangeCodeForSession(...)`.
- OTP verify flow via `token_hash` + `type` + `verifyOtp(...)`.
- Preserved existing safe `next` path normalization behavior.

## 2026-03-28 - Runtime Stabilization + Phase 2 Gate Prep

### Delivered
- Added typed schema-readiness error detection for core auth-gate table reads (`public.couple_memberships`, `public.couples`).
- Added actionable setup rendering in global error boundary for missing-schema local environments.
- Updated Next.js config with `experimental.serverActions.bodySizeLimit = "26mb"` to match 25MB media contract.
- Updated callback contract docs to explicitly cover both PKCE (`code`) and OTP (`token_hash` + `type`) callback forms.
- Updated onboarding instructions to explicit local Supabase Docker flow (`supabase start`, `supabase db reset --local`, `pnpm dev`).
- Added Drizzle baseline artifact paths (`drizzle.config.ts`, `src/lib/db/schema.ts`) and parity/gate notes in engineering docs.

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm install --frozen-lockfile`
- `pnpm add drizzle-orm mapbox-gl react-map-gl` (blocked: `ENOTFOUND registry.npmjs.org`)
- `pnpm add -D drizzle-kit` (blocked: `ENOTFOUND registry.npmjs.org`)

### Operational Notes
- Full live DB parity verification for Drizzle still requires running local Supabase CLI commands outside this sandbox.
- Phase 2 dependency gate remains blocked until package registry access is restored.

## 2026-03-28 - Desktop/Tablet Pink UI Redesign

### Delivered
- Redesigned global visual tokens to a pink-first palette for light mode with coordinated rose-toned dark mode.
- Added responsive authenticated shell with desktop/tablet side navigation and retained mobile bottom navigation.
- Introduced shared app navigation model consumed by both navigation surfaces.
- Refreshed core primitives (`SectionCard`, `Button`, `Input`, `Select`, `Textarea`, `Badge`) for consistent cute style treatment.
- Updated key Phase 1 routes for tablet/desktop polish: login, accept-invite, home, lists, on-this-day, memory detail, and new memory form.
- Updated product and engineering docs to reflect responsive/UI architecture decisions.

### Verification
- `pnpm lint`
- `pnpm typecheck`

## 2026-03-28 - Next.js 16 Cookie Mutation Compatibility Hardening

### Delivered
- Hardened Supabase server client cookie writer to be render-safe in Server Components.
- `setAll` now performs best-effort cookie writes and safely ignores mutation failures outside Server Actions/Route Handlers.
- Preserved middleware as canonical cookie refresh write path; no auth flow contract changes.

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-28 - Full UI System Refactor (Pink Responsive)

### Delivered
- Expanded global design tokens and utility classes for pink light + rose dark surfaces, elevation, and focus ring consistency.
- Refactored navigation and authenticated shell spacing for cohesive tablet/desktop sidebar + mobile bottom navigation behavior.
- Added reusable layout primitives and standardized all implemented Phase 1 routes onto those primitives:
- public auth pages (`/login`, `/accept-invite`)
- app pages (`/home`, `/lists`, `/on-this-day`, `/memories/new`, `/memories/[memoryId]`)
- global states (`loading`, `error`, `not-found`)
- Added shared UI components for consistency:
- `LoadingState`, `ListRow`, `MemoryCard`, improved `EmptyState`
- future template components (`TripCardTemplate`, `GameCardTemplate`, `CountdownWidgetTemplate`, `StatCardTemplate`)
- Refactored form composition with `FormSection` for consistent label/field hierarchy and responsive rhythm.
- Added required UI specification docs:
- `docs/design-system.md`
- `docs/responsive-guidelines.md`

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-28 - Full UI Restructure (Light-Only Pastel)

### Delivered
- Removed dark-mode token branching and standardized the app on a single pastel pink light-mode design system.
- Upgraded navigation architecture:
- replaced emoji navigation with typed `lucide-react` icons.
- introduced grouped nav model (`Main` + `More`) for sidebar.
- introduced mobile `primary + More` bottom navigation and mobile context strip.
- Added reusable UI architecture primitives for shell pages:
- `ShellPage` and `ComingSoonCard`.
- Added presentational shell routes (no backend logic changes):
- `/trips`, `/trips/[tripId]`
- `/albums/[albumId]`
- `/map`
- `/countdowns`
- `/future-notes`
- `/games`, `/games/[mode]`
- `/stats`
- `/settings`
- Updated docs for design system, responsive rules, UI architecture, and feature status.

### Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-29 - Phase 2 Slice 2 Trips Foundation

### Delivered
- Added the `trips` table with date-range constraints, `updated_at` trigger, and couple-scoped RLS.
- Regenerated the checked-in Supabase types and updated the baseline schema inventory.
- Added `createTripAction` to the existing Phase 2 planning action surface.
- Added `getTripsPageData(...)` and `getTripDetailData(...)` server helpers with grouped list reads and safe detail lookup.
- Replaced `/trips` with a live create flow plus `active`, `planned`, and `completed` trip sections.
- Replaced `/trips/[tripId]` with a real detail route that resolves trip UUIDs and returns `notFound()` for invalid or foreign IDs.
- Reworked trip UI copy and card metadata to use real date ranges and durations instead of shell-only placeholder counts.
- Updated product and engineering docs to mark trips implemented and moved the next documented slice to album/media grouping on top of trips.

### Verification
- `supabase db reset --local`
- `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
- `pnpm typecheck`
