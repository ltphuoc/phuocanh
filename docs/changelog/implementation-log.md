# Implementation Log

## 2026-06-02 - Security and Quality Remediation

### Delivered

- **Least-privilege hardening for couple-scoped tables:**
  - Scoped `couple_memberships` UPDATE policy to the caller's own row; members can no longer edit their partner's membership.
  - Added `albums` DELETE policy to enable orphaned-album cleanup.
  - Protected `couples.timezone` with a `BEFORE UPDATE` trigger that rejects direct writes from app roles; timezone changes now exclusively flow through the `update_couple_timezone()` RPC to preserve calendar dates in countdowns and future notes.
- **Reminder invocation security:**
  - `invoke_reminder_processor()` now requires and sends `x-reminder-invoke-secret` header (read from Vault `reminder_invoke_secret` or private fallback).
  - Edge Function `reminder-processor` validates the secret and returns 401 before any database work if it's missing or mismatched.
  - New required secret: `reminder_invoke_secret` in Vault and `REMINDER_INVOKE_SECRET` Edge Function env var; both must match.
- **Atomic memory update transaction:**
  - New RPC `update_memory_media()` atomically updates memory row, removes specified media, inserts new media, and enforces the content invariant (note OR ≥1 media) inside one transaction with row locking.
  - Serializes concurrent edits of the same memory to prevent race conditions where both could succeed despite emptying the memory.
  - Returns removed storage paths and affected album IDs for post-commit cleanup.
  - `updateMemoryAction` now calls this RPC instead of separate non-atomic statements.
- **Auth hardening:**
  - `sendMagicLinkAction` now derives `emailRedirectTo` from server-trusted `getSiteUrl()` only; client-sent origin is ignored.
  - `NEXT_PUBLIC_SITE_URL` is required in production (no localhost fallback); `getSiteUrl()` ignores forwarded headers in production and trusts them only in preview/dev (via Vercel `VERCEL_ENV` discriminator).
  - Proxy now preserves rotated session cookies across redirects (fixes intermittent forced logout).
- **Vault production requirement:**
  - Production Vault must hold both `future_note_encryption_key` and `reminder_invoke_secret`; `private.secret_fallbacks` is a dev/local fallback only.

### Verification

- All migrations applied locally and verified with clean db rebuild: `supabase db reset --local`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-04-29 - Phase 3 Gameplay Freshness Hardening

### Delivered

- Added conditional polling to `/games/daily-question` only while the viewer has submitted and answers remain hidden.
- Added the same conditional polling to `/games/guess-date` and `/games/trivia`.
- Stopped polling automatically once answers reveal.
- Invalidated the current browser context’s `games` app-data query cache after live gameplay reveal, plus `stats` after daily-question reveal.
- Updated focused gameplay E2E coverage so partner A remains on the waiting page and sees reveal state after partner B submits without a manual reload.
- Synced product, engineering, README, agent, and manual-test docs to mark cross-session reveal hardening complete for all three live gameplay modes.

### Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `./scripts/e2e/run.sh tests/e2e/gameplay.spec.ts`: `6 passed (34.2s)`

## 2026-04-28 - Phase 3 Slice 3: Live Trivia

### Delivered

- Added SQL migrations for `trivia`, protected `game_round_trivia_targets`, stable memory-location answer options, and RPC-only trivia gameplay:
  - `ensure_trivia_round(target_round_date date)`
  - `submit_trivia_answer(target_round_id uuid, selected_answer text)`
  - `get_trivia_round_state(target_round_date date)`
- Updated generated Supabase types and schema inventory after applying the SQL locally.
- Added server read/app-data/query wiring for `/games/trivia` and extended `/games` with live `daily_question`, `guess_date`, and `trivia` status.
- Added trivia Server Actions, client forms, and the live `/games/trivia` page flow.
- Added English and Vietnamese copy for trivia statuses, forms, no-memory state, pending state, reveal state, and action messages.
- Extended gameplay E2E coverage with the memory-location trivia partner reveal flow and kept `/stats` daily-question-only.
- Synced product and engineering docs to mark `trivia` live and document the hidden-until-reveal rule, trivia target table, and RPC contract.

### Verification

- `supabase db reset --local`
- `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
- `pnpm i18n:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Focused E2E coverage passed with `E2E_ENABLE_EMAIL_OTP_HELPER=true OPENAI_DAILY_QUESTION_STUB_RESPONSE="What small thing made you feel especially cared for recently?" pnpm exec playwright test tests/e2e/gameplay.spec.ts`: `5 passed (29.6s)`.

## 2026-04-28 - Phase 3 Slice 2: Live Guess Date

### Delivered

- Added SQL migrations for `guess_date`, memory-sourced prompts, `game_round_memory_targets`, and RPC-only guess-date gameplay:
  - `ensure_guess_date_round(target_round_date date)`
  - `submit_guess_date_answer(target_round_id uuid, guessed_date date)`
  - `get_guess_date_round_state(target_round_date date)`
- Updated generated Supabase types and schema inventory after applying the SQL locally.
- Added server read/app-data/query wiring for `/games/guess-date` and extended `/games` with live `daily_question` plus `guess_date` status.
- Added guess-date Server Actions, client forms, and the live `/games/guess-date` page flow.
- Added English and Vietnamese copy for guess-date statuses, forms, and action messages.
- Extended gameplay E2E coverage with the memory-backed guess-date partner reveal flow.
- Synced product and engineering docs to mark `guess_date` live and document the hidden-until-reveal rule, memory target table, and RPC contract.

### Verification

- `supabase db reset --local`
- `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
- `pnpm i18n:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `git diff --check`
- Focused E2E coverage was added and passed with `pnpm exec playwright test tests/e2e/gameplay.spec.ts` after a fresh local Supabase reset: `3 passed (19.7s)`.

## 2026-04-25 - Docs Refresh: Agent And Developer Guidance

### Delivered

- Expanded root `AGENTS.md` outside the Next-managed block with project source-of-truth order, verification expectations, and repo safety boundaries.
- Updated `docs/agent/agent-handbook.md` with Next.js 16.2 agent guidance, MCP/runtime inspection expectations, locale-aware repo paths, and validation rules.
- Added `docs/development-verification.md` as the compact local setup, app startup, E2E, env, and docs-update guide.
- Synced roadmap/status wording for `Phase 3 Slice 1: Live Daily Question + Gameplay Stats`.
- Marked prior E2E suite results as historical instead of fresh current-run verification.
- Replaced machine-specific manual-test index links with repo-relative links.

### Verification

- Route inventory was re-checked against `docs/route-capability-matrix.md` before editing.
- Official Next.js docs checked: v16.2.4 docs for AI agents, local development, version 16 upgrading, and Playwright testing, last updated 2026-04-23.
- Current npm metadata was checked for package latest versions; dependency upgrades were intentionally left out of this docs-only task.
- `pnpm lint`
- `pnpm typecheck`
- `pnpm typecheck:functions`
- `pnpm build`
- `git diff --check`

## 2026-04-02 - Phase 3 Slice 1: Live Daily Question + Gameplay Stats

### Delivered

- Added migration `20260402100000_phase3_slice1_games_stats_foundation.sql` with:
  - `game_mode`
  - `game_rounds`
  - `game_round_answers`
  - couple-scoped RLS policies for gameplay reads and writes
  - SQL RPCs `ensure_daily_question_round(...)` and `submit_daily_question_answer(...)`
- Added follow-up migration `20260402143000_phase3_slice1_gameplay_contract_hardening.sql` with:
  - `SECURITY DEFINER` hardening for gameplay write RPCs
  - secure gameplay read RPCs `get_daily_question_round_state(...)` and `get_daily_question_stats(...)`
  - removal of direct browser reads/writes for `game_round_answers`
  - removal of direct browser inserts for `game_rounds`
- Updated `src/lib/supabase/database.types.ts` and `src/lib/db/schema.ts` for the gameplay tables, enum, and RPCs.
- Added Phase 3 server read helpers:
  - `getGamesHubData(...)`
  - `getDailyQuestionPageData(...)`
  - `getGameplayStatsPageData(...)`
  - gameplay read helpers now resolve through secure SQL RPCs instead of direct answer-table reads
- Added OpenAI-backed daily-question prompt generation on the server:
  - `generateDailyQuestionPrompt(...)`
  - uses the Responses API with structured JSON validation
  - no static fallback is used when OpenAI fails
- Added Phase 3 Server Actions:
  - `ensureDailyQuestionRoundAction`
  - `submitDailyQuestionAnswerAction`
- Added gameplay forms:
  - `GenerateDailyQuestionForm`
  - `SubmitDailyQuestionAnswerForm`
- Replaced `/games` shell content with:
  - live daily-question hub status
  - live entry CTA
  - explicit shell-only messaging for deferred modes
- Replaced `/games/daily-question` shell content with:
  - on-demand round generation
  - one-answer-per-user submission flow
  - locked answer state until both partners submit
  - revealed answers once the round is complete
- Replaced `/stats` placeholder widgets with:
  - current completed streak
  - total rounds
  - total completed rounds
  - viewer participation count/rate
  - recent 14-day gameplay history
- Synced product and engineering docs to mark `/games` and `/stats` implemented and document `/games/[mode]` as live only for `daily-question`.
- Synced `README.md` and `docs/system-architecture.md` with the live OpenAI-backed gameplay runtime and the hardened gameplay contract.

### Verification

- `pnpm typecheck`
- `pnpm i18n:check`
- `pnpm lint`
- `pnpm build`

### Notes

- This slice intentionally ships only one live gameplay mode: `daily_question`.
- Non-`daily-question` slugs under `/games/[mode]` remain presentational shells.
- The current stats model is participation-only and does not add winners, similarity scoring, or edit/delete flows.

## 2026-03-30 - Safe First-User Onboarding With Explicit Confirmation

### Delivered

- Replaced implicit first-user bootstrap in auth-gate reads with a new `needs_onboarding` auth state.
- Added `/onboarding` route with a four-step form:
  - couple name
  - timezone
  - started date
  - final confirmation summary + explicit confirmation checkbox
- Added `completeOnboardingAction` with server-side validation and explicit confirmation requirement.
- Added migration `20260330001000_onboarding_bootstrap_timezone.sql` to extend `bootstrap_first_couple(...)` with `target_timezone`, keeping couple + membership + timezone persistence atomic in one RPC transaction.
- Updated route redirects so:
  - first authenticated user without a couple is routed to `/onboarding`
  - existing non-member users are still routed to `/accept-invite`
  - ready users continue to `/home`
- Synced API/data/frontend/system/product docs to reflect the onboarding contract.

### Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm i18n:check`
- `pnpm build`

### Verification Notes

- `pnpm build` passes in a network-enabled environment. The earlier failure mode was sandbox-specific because `next/font/google` could not fetch `Fraunces` and `Manrope` when outbound access was blocked.

## 2026-03-29 - Review Fix: Anniversary Since-Date Timezone Safety

### Delivered

- Fixed `AnniversarySpotlight` date rendering to parse `coupleStartedAt` as a date token in the saved couple timezone instead of `new Date(...)`.
- Prevented off-by-one rendering in negative-offset timezones when formatting the "since" label on `/home`.

### Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 2026-03-29 - Couple Timezone Foundation

### Delivered

- Added migration `20260329223000_couple_timezone_foundation.sql` with:
  - `couples.timezone`
  - SQL validation against `pg_timezone_names`
  - updated `bootstrap_first_couple(...)` return shape including `timezone`
  - `update_couple_timezone(...)` RPC for shared timezone updates
  - album policy/RPC updates so trip-window media eligibility uses the saved couple timezone
- Regenerated `src/lib/supabase/database.types.ts` and updated schema inventory in `src/lib/db/schema.ts`.
- Added shared timezone utilities in `src/lib/utils/couple-timezone.ts`.
- Extended couple context and live read helpers so couple time is authoritative for:
  - relationship-day math
  - on-this-day
  - countdown labels
  - future-note unlock labels
  - trip status
  - album/trip/map date rendering
  - album media eligibility windows
- Updated countdown and future-note mutations so forms submit date-only values and the server derives stored instants from the saved couple timezone.
- Added `updateCoupleTimezoneAction`.
- Replaced `/settings` shell content with:
  - live shared-timezone settings form
  - current timezone display
  - retained secondary-navigation links
- Synced product and engineering docs to mark `/settings` implemented and document the couple-time contract.

### Verification

- `supabase db reset --local`
- `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
- `pnpm i18n:check`
- `pnpm i18n:audit-hardcoded`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

### Notes

- This slice intentionally keeps one shared timezone per couple; per-user timezone preferences are still deferred.
- Timezone changes preserve visible countdown and future-note calendar dates, not the previous absolute instant.
- Memories remain true instants and are not rewritten when the couple timezone changes.

## 2026-03-29 - Phase 2 Slice 4: Visited-Place Atlas Foundation

### Delivered

- Added Phase 2 Slice 4 migration `20260329193000_phase2_slice4_visited_places_atlas_foundation.sql` with:
  - `visited_places`
  - trip-linked date-window enforcement through RLS
  - couple-scoped read/write policies for visited places
- Regenerated `src/lib/supabase/database.types.ts` and updated schema inventory in `src/lib/db/schema.ts`.
- Added Phase 2 server read helpers:
  - `getMapPageData(...)`
  - extended `getTripDetailData(...)` with ordered trip visited places
- Added Phase 2 Server Action:
  - `createVisitedPlaceAction`
- Added Phase 2 visited-place form:
  - `CreateVisitedPlaceForm`
- Replaced `/map` shell content with:
  - live provider-free atlas grouped by trip
  - selected-place detail
  - real empty state
- Replaced the trip-detail places placeholder with:
  - live visited-place create flow
  - ordered visited-place list
  - real empty state
- Synced product and engineering docs to mark `/map` implemented and document the provider-free atlas contract.

### Verification

- `supabase db reset --local`
- `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
- `pnpm i18n:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

### Notes

- Slice 4 intentionally keeps `/map` provider-free; no Mapbox dependency or environment variable was added.
- Coordinates, route polylines, and provider-backed geographic tiles remain deferred follow-up work.

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
- responsive guidance that has since been folded into `docs/frontend-architecture.md` and `docs/design-system.md`

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
