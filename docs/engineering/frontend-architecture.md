# Frontend Architecture

This file describes the current frontend operating model. It is the canonical reference for route behavior and UI/runtime boundaries.

## Route Groups

- `src/app/[locale]/(public)`: `/login`, `/onboarding`, and `/accept-invite`
- `src/app/[locale]/(app)`: authenticated routes rendered inside one shared app shell
- `src/app/auth/callback/route.ts`: Supabase auth callback exchange and safe redirect
- `src/app/auth/callback/verify-email-otp/route.ts`: internal local-E2E OTP verification helper
- `src/app/[locale]/page.tsx`: redirect-only route that resolves auth gate state

## Route Categories

- `implemented`: `/`, `/login`, `/onboarding`, `/accept-invite`, `/auth/callback`, `/home`, `/lists`, `/memories/new`, `/memories/[memoryId]`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/trips/[tripId]`, `/albums`, `/albums/[albumId]`, `/map`, `/games`, `/games/daily-question`, `/games/guess-date`, `/games/trivia`, `/stats`, `/settings`
- `shell-only`: game slugs other than `daily-question`, `guess-date`, and `trivia` under `/games/[mode]`

Use `docs/engineering/route-capability-matrix.md` for the full table.

## Server vs Client Boundary

- Public auth/onboarding routes stay server-first with form-local action state.
- Authenticated interactive routes server-prefetch TanStack Query data, then render the hydrated data inside client page components.
- Server Components prefetch by calling helpers in `src/lib/server/*` and `src/lib/server/app-data.ts` directly. They do not fetch internal API routes.
- Client query functions use internal `/api/app-data/...` route handlers only for refetches after invalidation.
- Client components own forms, query cache updates, navigation interaction, motion wrappers, toast feedback, and file input handling.

## Data Read Pattern

- Authenticated pages first resolve couple context through `getAuthGateState()` or `getReadyCoupleContextOrRedirect()`.
- Authenticated page reads flow through app-data wrappers such as `getHomeAppData(...)`, `getListsAppData(...)`, `getMemoryDetailAppData(...)`, `getCountdownsAppData(...)`, `getTripDetailAppData(...)`, `getAlbumDetailAppData(...)`, `getGamesAppData(...)`, `getDailyQuestionAppData(...)`, `getGuessDateAppData(...)`, `getTriviaAppData(...)`, and `getStatsAppData(...)`.
- Query keys live in `src/lib/query/app-query-keys.ts` under one `["app-data", ...]` root. Use exact keys (`home`, `lists`, `trip(id)`, `album(id)`, `dailyQuestion`, `guessDate`, `trivia`, `stats`) instead of broad invalidation.
- Hydration uses `dehydrateAppQuery(...)` with a nonzero stale time so server-prefetched data is not immediately duplicated by a client refetch.
- Signed `memory-media` URLs are created server-side through `signMemoryMediaStorageItems(...)` before render.
- Future-note bodies stay in the server read layer; client components never fetch locked content directly, and unlocked bodies now flow through the decrypted RPC path rather than direct table reads.
- Trip detail reads return `notFound()` for invalid or non-member trip IDs instead of rendering placeholder content.
- Trip detail reads now include ordered `visited_places` rows for the trip.
- Album detail reads return `notFound()` for invalid or non-member album IDs instead of rendering placeholder content.
- `/map` renders a provider-free atlas from real trip-linked `visited_places`; it does not depend on a tile provider.
- `/games` renders live daily-question, guess-date, and trivia hub state on the server through secure gameplay read RPCs.
- `/games/daily-question` renders the current couple-local round, submission state, and reveal state on the server through secure gameplay read RPCs.
- `/games/guess-date` renders the current couple-local memory clue, submission state, and reveal state on the server through secure gameplay read RPCs.
- `/games/trivia` renders the current couple-local memory clue, stable answer options, submission state, and reveal state on the server through secure gameplay read RPCs.
- `/stats` renders gameplay-only aggregates from the server read model through secure gameplay stats RPCs.
- `/settings` resolves real couple context and renders the live shared-timezone control.
- Shared date helpers and date-rendering components receive the couple timezone explicitly instead of relying on environment defaults.

## Mutation Pattern

- Forms use `react-hook-form`, `zodResolver`, TanStack `useMutation`, Server Actions, and Sonner toasts.
- Authenticated app-data mutations keep Server Actions as the write boundary and keep the existing `ActionState` response shape.
- Phase 2 planning forms also use inline field errors via `FormSection` in addition to toast feedback.
- Migrated Server Actions still call `revalidateLocalizedPath(...)` for later server-rendered navigations, but they no longer call `refresh()` for same-session UI sync.
- Same-session freshness comes from targeted `invalidateQueries(...)`, precise `setQueryData(...)`, or optimistic updates.
- Checklist toggles optimistically update `home` and `lists`, with rollback on action failure.
- Create/add mutations invalidate only affected keys because actions do not return created row IDs.
- First-user onboarding confirmation and invite acceptance use SQL RPCs because membership/bootstrap invariants are DB-owned.
- Countdown and future-note forms submit date-only values; server actions derive stored UTC instants from the saved couple timezone.
- Future-note creation now uses a SQL RPC so metadata insert plus encrypted body write stay transactional.
- Album creation/add flows call SQL RPCs from Server Actions so multi-row album writes stay transactional and couple-scoped.
- Daily-question generation calls the OpenAI Responses API on the server, then writes through `ensure_daily_question_round(...)`.
- Daily-question answer submit calls `submit_daily_question_answer(...)` so one-answer-per-user and locked-after-submit behavior stays DB-owned.
- Guess-date round creation calls `ensure_guess_date_round(...)` so memory selection, canonical daily round creation, and source-memory linking stay DB-owned.
- Guess-date answer submit calls `submit_guess_date_answer(...)` so one-date-guess-per-user and locked-after-submit behavior stays DB-owned.
- Trivia round creation calls `ensure_trivia_round(...)` so memory selection, canonical daily round creation, and stable answer options stay DB-owned.
- Trivia answer submit calls `submit_trivia_answer(...)` so one-option-per-user, option validation, and locked-after-submit behavior stay DB-owned.
- Direct browser reads of `game_round_answers` are intentionally not part of the runtime; gameplay reveal state comes from secure server read helpers.
- Direct browser reads of `game_round_memory_targets` are intentionally not part of the runtime; guess-date memory IDs and actual dates stay behind secure read helpers until reveal.
- Direct browser reads of `game_round_trivia_targets` are intentionally not part of the runtime; trivia memory IDs and correct answers stay behind secure read helpers until reveal.
- `/settings` owns the `updateCoupleTimezoneAction` flow for the shared couple timezone.

## Production-Flow E2E Coverage

- Browser coverage is now anchored in Playwright under `tests/e2e/*`.
- The suite runs against `next build` + `next start`, not the dev server.
- `playwright.config.ts` keeps the suite serial (`workers: 1`) because the app is a singleton couple space on one local Supabase stack.
- The harness uses `E2E_BASE_URL`, defaulting to `http://127.0.0.1:3100`, so Playwright does not depend on a pre-existing app server on port `3000`.
- Auth bootstrap is hybrid:
  - real `/login` UI
  - real local auth emails read from Mailpit on `http://127.0.0.1:54333`
  - test-only OTP verification route at `/auth/callback/verify-email-otp`
  - saved partner storage states under `playwright/.auth/`
- `E2E_ENABLE_EMAIL_OTP_HELPER` explicitly gates the OTP helper route and must stay disabled outside local browser E2E runs.
- The OTP helper also rejects non-loopback hosts even when the env flag is enabled.
- Feature data creation stays inside browser flows; the suite does not use SQL seed fixtures for route-level test content.
- Targeted freshness assertions now verify post-action UI updates without helper-driven hard reloads for memories, lists, planning, travel, and same-session gameplay actions.
- The only remaining explicit revisit is the cross-session daily-question reveal check, where a second browser session performs the mutation.
- The current production-flow suite covers only implemented, backend-backed routes:
  - auth gatekeeping and invite join flow
  - memories, wishlists, and checklists
  - countdowns, future notes, shared timezone updates
  - trips, visited places, trip albums, and map
  - `/games/daily-question`, `/games/guess-date`, `/games/trivia`, and `/stats`
- The suite explicitly excludes shell-only game modes other than `daily-question`, `guess-date`, and `trivia`.
- Daily-question generation has a narrow E2E seam through `OPENAI_DAILY_QUESTION_STUB_RESPONSE`; production behavior is unchanged when that env var is unset.
- Historical verified local result from the post-Phase 3 Slice 1 E2E hardening wave: the production-flow suite passed end to end with `7 passed (2.8m)`.

## ActionState Contract

- `ActionState = { status: "idle" | "success" | "error"; message: string }`
- `ActionStateWithData<T>` extends `ActionState` with optional `data`
- Client forms should not invent alternate success/error payload shapes for the current runtime without updating `docs/engineering/api-contracts.md`

## Revalidation Rules

| Mutation                          | Revalidated routes                                                                                | Client query sync                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `sendMagicLinkAction`             | none                                                                                              | not applicable                                                                |
| `completeOnboardingAction`        | `/`, `/home`                                                                                      | not migrated                                                                  |
| `createInviteAction`              | none                                                                                              | not app data                                                                  |
| `acceptInviteAction`              | `/home`                                                                                           | not migrated                                                                  |
| `createMemoryAction`              | `/home`, `/on-this-day`, `/lists`                                                                 | invalidate `home`, `onThisDay`, `lists`, `tripDetails`                        |
| `addWishItemAction`               | `/home`, `/lists`                                                                                 | invalidate `home`, `lists`                                                    |
| `createChecklistAction`           | `/home`, `/lists`                                                                                 | invalidate `home`, `lists`                                                    |
| `addChecklistItemAction`          | `/home`, `/lists`                                                                                 | invalidate `home`, `lists`                                                    |
| `toggleChecklistItemAction`       | `/home`, `/lists`                                                                                 | optimistic update `home`, `lists`; invalidate after settle                    |
| `createCountdownAction`           | `/countdowns`                                                                                     | invalidate `countdowns`                                                       |
| `createFutureNoteAction`          | `/future-notes`                                                                                   | invalidate `futureNotes`                                                      |
| `createTripAction`                | `/trips`                                                                                          | invalidate `trips`                                                            |
| `createVisitedPlaceAction`        | `/map`, `/trips/[tripId]`                                                                         | invalidate `map`, `trip(tripId)`                                              |
| `createAlbumAction`               | `/albums`, `/trips/[tripId]`                                                                      | invalidate `albums`, `trip(tripId)`                                           |
| `addAlbumItemsAction`             | `/albums`, `/albums/[albumId]`, `/trips/[tripId]`                                                 | invalidate `albums`, `album(albumId)`, `trip(tripId)`                         |
| `ensureDailyQuestionRoundAction`  | `/games`, `/games/daily-question`, `/stats`                                                       | invalidate `games`, `dailyQuestion`, `stats`                                  |
| `submitDailyQuestionAnswerAction` | `/games`, `/games/daily-question`, `/stats`                                                       | update safe answered state, then invalidate `games`, `dailyQuestion`, `stats` |
| `ensureGuessDateRoundAction`      | `/games`, `/games/guess-date`                                                                     | invalidate `games`, `guessDate`                                               |
| `submitGuessDateAnswerAction`     | `/games`, `/games/guess-date`                                                                     | update safe answered state, then invalidate `games`, `guessDate`              |
| `ensureTriviaRoundAction`         | `/games`, `/games/trivia`                                                                         | invalidate `games`, `trivia`                                                  |
| `submitTriviaAnswerAction`        | `/games`, `/games/trivia`                                                                         | update safe answered state, then invalidate `games`, `trivia`                 |
| `updateCoupleTimezoneAction`      | `/settings`, `/home`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/albums`, `/map` | update `settings`, invalidate timezone-derived app-data keys                  |

## Shared UI Structure

- App shell: `src/app/(app)/layout.tsx`, `BottomNavigation`, `SideNavigation`, `navigation-model.ts`
- Shared layout primitives: `AuthShell`, `PageContainer`, `PageHeader`, `SectionStack`, `ResponsiveGrid`, `FormSection`, `ShellPage`
- Shared UI/state primitives: `SectionCard`, `EmptyState`, `LoadingState`, `ListRow`, `ComingSoonCard`, `PageReveal`, `CountdownWidgetTemplate`, `FutureNoteCard`, `TripCardTemplate`, `AlbumCard`
- Phase 2/3 forms: `CreateCountdownForm`, `CreateFutureNoteForm`, `CreateTripForm`, `CreateVisitedPlaceForm`, `CreateAlbumForm`, `AddAlbumItemsForm`, `GenerateDailyQuestionForm`, `SubmitDailyQuestionAnswerForm`, `GenerateGuessDateRoundForm`, `SubmitGuessDateAnswerForm`, `GenerateTriviaRoundForm`, `SubmitTriviaAnswerForm`, `UpdateCoupleTimezoneForm`
- Phase 2 travel atlas shell: `TravelAtlasShell`

New routes should compose these primitives rather than invent new layout systems per page.

## Shell-Only Rules

- `shell-only` means the route exists to define layout and navigation, not to prove backend support.
- Do not add server reads, new tables, or background jobs to shell-only routes without updating `docs/product/business-rules.md`, `docs/engineering/api-contracts.md`, and `docs/engineering/route-capability-matrix.md`.

## Architecture Guardrails

- Keep authenticated app-data reads server-prefetched and hydrated through TanStack Query.
- Keep auth gate decisions in `src/lib/server/couple-context.ts`.
- Keep couple/invite invariants in SQL RPCs.
- Keep couple-level day-boundary logic rooted in the saved `couples.timezone` field and shared timezone helpers.
- Keep album grouping rooted in `trips` and existing `memory_media`; do not add a second upload pipeline casually.
- Keep visited places rooted in `trips`; do not derive them implicitly from memory locations without revisiting the product contract.
- Keep gameplay reads server-first and keep prompt generation on the server; do not move OpenAI prompt generation into client code.
- Keep guess-date memory targeting in SQL RPCs; do not expose `game_round_memory_targets` directly to browser clients.
- Keep trivia memory targeting and answer options in SQL RPCs; do not expose `game_round_trivia_targets` directly to browser clients.
- Do not introduce additional client state/query systems such as Zustand or `nuqs` opportunistically into routine changes.
- If a task intentionally migrates data/state architecture, document it first.
