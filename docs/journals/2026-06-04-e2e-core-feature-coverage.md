# E2E Core-Feature Coverage — 5-Phase Composable Suite

**Date**: 2026-06-04
**Severity**: Medium (test infrastructure; zero application `src/` changes)
**Component**: Playwright E2E suite (`tests/e2e/*`, `playwright.config.ts`)
**Status**: Resolved — 41/41 passing on a clean machine

## What Happened

Executed the `plans/260604-1326-e2e-core-feature-coverage` plan via `/ck:cook`. Restructured the
Playwright suite from 6 order-coupled spec files (19 `test()` blocks / 37 case IDs) into an explicit
project graph — `setup → first-run → baseline → chromium → mobile` — with a reusable UI journey
library, then expanded coverage to 41 blocks: per-feature validation strings, trip/place failure
paths, map/stats/standalone-albums reads, games-hub statuses, RLS isolation negatives, and a 390px
mobile pass. All five phases shipped in one session; the suite went green end-to-end.

## The Brutal Truth

The plan's premise — "keep the suite green across the refactor, tests-first" — assumed the baseline
was green. It wasn't. The very first full run died at the bootstrap step: the app bakes
`NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` (from `.env.local`) at build time, and under
`next start` (production runtime) `getSiteUrl` returns that baked value, so the partner invite URL
pointed at `:3000` while the test server listens on `:3100`. The _original_ `auth.setup.ts` navigated
to that raw URL too — meaning phase-01's "record the green baseline" step had never actually been
run. The plan inherited an assumption nobody had verified. Fixing it (`toTestOrigin()`, mirroring the
existing Mailpit magic-link normalization) was the right call, but the lesson stings: a plan that
says "lock current behavior" is only as honest as whether someone ran the suite first.

The second humbling moment was self-inflicted theory. Two tests hung for 270s on a fresh login and I
spent three diagnostic iterations theorizing slow hydration, locale fallbacks, and Mailpit latency —
all wrong. A 12-line diagnostic (`goto`, dump `status/url/bodyText`) revealed the truth in one run:
`browser.newContext()` silently inherits the project's `storageState`, so my "guest" / "non-member"
contexts were authenticated as partner-a and got bounced `/login → /home`. Every existing guest test
already passed `storageState: { cookies: [], origins: [] }` for exactly this reason; I just hadn't
connected the dots. Reading the evidence beat reasoning about the mechanism — again.

Third: flakiness is a liar. A full run showed 3 failures; the _next_ clean run showed 41/41 in 2.4m
(vs 7.1m under load). The user was running a second e2e suite (`modive-app`) concurrently, which both
polluted my log file and starved CPU enough that the timezone-reset display assertions (the tz form
invalidates every date-derived query, and refetch over a data-rich couple lags past 15s) and one
animated visited-place click timed out. I resisted the urge to "harden" working tests against
environmental contention — they're verified green; the flake is external, and band-aiding it would
have masked nothing real.

## Technical Details

**Phase 1 — Journey library + identity.** Extracted `support/journeys/{auth,seed,gameplay}.ts`
(verbatim selectors), re-pointed `auth.setup.ts` (142 → 8 lines) and `gameplay.spec.ts`. Added
`createUniqueEmail`. `generateInvite` reused in `E2E-AUTH-003`. Added `toTestOrigin()` host rewrite.

**Phase 2 — Project graph.** `first-run.spec.ts` holds the only ordered window (empty-state + the
gameplay flows whose couple-global `Completed` counts and streak are deterministic only pre-baseline).
`baseline.setup.ts` seeds rich data once via the UI. `chromium` made order-independent — audit found
the existing feature specs were _already_ tokenized (`buildUniqueText`), so the real work was relocating
gameplay/empty-state, not rewriting assertions. Dropped the planned `fixtures.ts` (zero consumers —
partner-B dedup lives in `gameplay-journeys.newPartnerBContext`).

**Phase 3 — Coverage.** Confirmed every form uses `zodResolver` (client-side) before asserting exact
strings, pulled from `messages/en.json` not research §3 (which was wrong on trip/album `titleRequired`
and claimed future-note body validation was SQL-only and swallowed — it surfaces "Write the note
body."). New: `memories-validation`, `lists-validation`, `countdowns-future-notes-validation`,
`trips-places-validation`, `map-stats-albums`, games-hub statuses.

**Phase 4 — RLS negatives.** Guest → 401 `unauthenticated`; authed non-member → 403
`couple_context_not_ready` + gated to `/accept-invite` (verified the `(app)` layout + page both
redirect `needs_invite`); foreign valid-UUID detail routes → 404.

**Phase 5 — Mobile.** Chromium @ 390px (not the WebKit `iPhone 12` descriptor — avoids a browser
install). Login viewport-fit, memory/checklist/trip/album creates, timezone update. Onboarding is out
of scope under the single-couple invariant.

**Bugs fixed mid-flight:** invite-URL origin (above); guest-context `storageState` inheritance
(above); `expectWithinViewport` measuring before the element rendered; the mobile home's desktop
"Latest chapters" heading being hidden (→ assert "Add memory" with `.first()`).

## What I'd Do Differently

Run `pnpm test:e2e` once at the very start to establish the _actual_ baseline before trusting a
plan's "green" claim. And write the 12-line diagnostic on the first hang, not the third.
