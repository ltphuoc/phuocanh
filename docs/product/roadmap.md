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
- Phase 2 closeout added encrypted future-note body storage, RPC-backed future-note create/read paths, `reminder_deliveries`, reminder enqueueing, claim/retry RPCs, the reminder Edge Function, and cron-driven processing jobs.
- Post-closeout reminder validation note:
  - hosted environments use Vault-backed secrets for reminder invocation
  - local and CI replay now falls back to a private secret store when Vault is unavailable
- Latest documented slice: `Phase 3 Slice 3: Live Trivia`
  - `/games` is now a backend-backed hub with live status and entry links for `daily-question`, `guess-date`, and `trivia`
  - `/games/[mode]` is backend-backed for `/games/daily-question`, `/games/guess-date`, and `/games/trivia`; other game slugs remain shell-only
  - `/stats` remains the daily-question-only gameplay read model with participation/streak aggregates
  - write paths stay on Server Actions or SQL RPCs; no client-owned gameplay write layer was introduced
  - this slice still does not include scoring, winners, leaderboards, sharing, answer edits/deletes, stats expansion, or deeper travel-map work
- Downstream implementation order after `Phase 3 Slice 3`:
  - choose the next gameplay hardening slice or another explicit live Phase 3 gameplay candidate
  - revisit travel-map depth after the gameplay and stats contract is stable
- Latest hardening wave after `Phase 3 Slice 1`:
  - production-flow Playwright coverage for implemented backend-backed routes
  - real auth bootstrap through Mailpit-backed magic-link OTP flows
  - serial production-mode browser validation harness for local Supabase on a dedicated configurable `E2E_BASE_URL` that defaults to `http://127.0.0.1:3100`
  - docs alignment for E2E prerequisites, exclusions, loopback-only OTP-helper gating, and test-only OpenAI prompt stubbing
  - auth-gate fallback hardening so existing-couple detection stays correct without requiring `SUPABASE_SERVICE_ROLE_KEY`
  - historical local validation from that hardening wave: `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:functions`, `pnpm build`, `pnpm test:e2e`, and `git diff --check` all passed; Playwright finished `7 passed (2.8m)`
- Still deferred after the Phase 2 closeout:
  - coordinates and route polylines
  - provider-backed geographic tiles
- See `docs/product/phase-2-status.md` for the living status tracker.

## Phase 3 (Advanced) - Status: first three slices implemented

- Implemented in Slice 1:
  - game kernel for `daily_question`
  - live daily-question route with prompt generation, locked answers, and reveal
  - real gameplay streak and stats read model
- Implemented in Slice 2:
  - live `guess_date` mode backed by memory clues
  - `/games/guess-date` with one locked date guess per active partner
  - reveal only after both active partners submit
- Implemented in Slice 3:
  - live `trivia` mode backed by saved memory locations
  - `/games/trivia` with one locked selected option per active partner
  - correctness reveal only after both active partners submit
- Next Phase 3 target:
  - choose a hardening slice or another explicit live gameplay candidate
- `/chat` is not part of the Phase 3 feature roadmap; the deprecated mock route has been removed as maintenance.

## Next Move

- Primary: choose the next gameplay hardening slice or another explicit live gameplay candidate from this now-green production-flow browser baseline.
- Secondary maintenance: deprecated `/chat` mock route removal is complete.
- Current planning source: use `docs/product/active-plan.md` for the latest operating plan; this roadmap remains the phase-level history and direction.

## Phase 4 (Advanced+) - Status: planned

- AI retrieval search with embeddings
- Remaining game modes and polish
