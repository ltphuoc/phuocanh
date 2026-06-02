# Frontend Architecture

This is the canonical frontend operating model for route behavior, rendering boundaries, app-data
flow, UI composition, and responsive shell rules.

## Routes

- `src/app/[locale]/(public)` contains `/login`, `/onboarding`, and `/accept-invite`.
- `src/app/[locale]/(app)` contains authenticated routes rendered inside one shared app shell.
- `src/app/[locale]/page.tsx` is redirect-only and resolves auth gate state.
- `src/app/auth/callback/route.ts` owns Supabase auth callback exchange.
- `src/app/auth/callback/verify-email-otp/route.ts` is a loopback-only local E2E helper.

Use [route-capability-matrix.md](route-capability-matrix.md) for the full current route map. Game
slugs other than `daily-question`, `guess-date`, and `trivia` under `/games/[mode]` are shell-only.

## Server And Client Boundaries

- Public auth/onboarding routes stay server-first with form-local action state.
- Authenticated pages resolve couple context through `getAuthGateState()` or
  `getReadyCoupleContextOrRedirect()`.
- Server Components prefetch app data by calling helpers in `src/lib/server/*` and
  `src/lib/server/app-data.ts` directly; they do not fetch internal API routes.
- Authenticated interactive routes hydrate TanStack Query data into client page components.
- Client query functions use `/api/app-data/...` only for refetches after invalidation.
- Client components own forms, query cache updates, navigation interaction, motion wrappers, toast
  feedback, and file input handling.

## App-Data Read Pattern

- App-data wrappers include `getHomeAppData(...)`, `getListsAppData(...)`,
  `getMemoryDetailAppData(...)`, `getCountdownsAppData(...)`, `getTripDetailAppData(...)`,
  `getAlbumDetailAppData(...)`, `getGamesAppData(...)`, `getDailyQuestionAppData(...)`,
  `getGuessDateAppData(...)`, `getTriviaAppData(...)`, and `getStatsAppData(...)`.
- Query keys live in `src/lib/query/app-query-keys.ts` under one `["app-data", ...]` root. Use
  exact keys instead of broad invalidation.
- Hydration uses `dehydrateAppQuery(...)` with nonzero stale time so server-prefetched data is not
  immediately duplicated by a client refetch.
- Signed `memory-media` URLs are created server-side before render.
- Future-note bodies stay in the server read layer and unlocked bodies flow through the decrypted
  RPC path.
- Detail reads for memories, trips, and albums must not render placeholder content for invalid or
  cross-couple IDs.
- Gameplay reads that depend on hidden answer state use secure SQL RPCs; do not read hidden target
  or answer tables directly in browser-facing code.
- Shared date helpers and date-rendering components receive the saved couple timezone explicitly.

## Mutation Pattern

- Forms use React Hook Form, Zod, TanStack `useMutation`, Server Actions, and Sonner toasts.
- Server Actions keep the shared `ActionState` / `ActionStateWithData<T>` response shape.
- Same-session freshness is owned by targeted `invalidateQueries(...)`, precise `setQueryData(...)`,
  or optimistic updates.
- Server Actions still call `revalidateLocalizedPath(...)` for later server-rendered navigations.
- First-user onboarding, invite acceptance, future-note body writes, album writes, gameplay round
  creation, gameplay answer submission, and timezone updates rely on SQL RPCs for invariants.
- OpenAI prompt generation stays on the server.

## Revalidation And Query Sync

| Mutation                     | Revalidated routes                                                                                | Client query sync                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `completeOnboardingAction`   | `/`, `/home`                                                                                      | not migrated                                                             |
| `acceptInviteAction`         | `/home`                                                                                           | not migrated                                                             |
| Memory actions               | `/home`, `/on-this-day`, `/lists`, `/memories/[memoryId]`, `/albums`, `/map`                      | invalidate `home`, `onThisDay`, `lists`, memory/trip/album/map keys      |
| List/checklist actions       | `/home`, `/lists`                                                                                 | invalidate or optimistically update `home`, `lists`                      |
| `createCountdownAction`      | `/countdowns`                                                                                     | invalidate `countdowns`                                                  |
| `createFutureNoteAction`     | `/future-notes`                                                                                   | invalidate `futureNotes`                                                 |
| Trip actions                 | `/trips`, `/trips/[tripId]`, `/albums`, `/map`                                                    | invalidate `trips`, affected trip, `albums`, `map`                       |
| `createVisitedPlaceAction`   | `/map`, `/trips/[tripId]`                                                                         | invalidate `map`, `trip(tripId)`                                         |
| Album actions                | `/albums`, `/albums/[albumId]`, `/trips/[tripId]`                                                 | invalidate affected album/trip keys                                      |
| Daily-question actions       | `/games`, `/games/daily-question`, `/stats`                                                       | update safe answered state, invalidate `games`, `dailyQuestion`, `stats` |
| Guess-date actions           | `/games`, `/games/guess-date`                                                                     | update safe answered state, invalidate `games`, `guessDate`              |
| Trivia actions               | `/games`, `/games/trivia`                                                                         | update safe answered state, invalidate `games`, `trivia`                 |
| `updateCoupleTimezoneAction` | `/settings`, `/home`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/albums`, `/map` | update `settings`, invalidate timezone-derived keys                      |

## App Shell And Navigation

- Mobile uses a floating keepsake dock above the safe area, a centered memory action, and a `More`
  sheet for secondary destinations.
- Tablet/desktop uses a slim rail for primary destinations and an expandable drawer for grouped
  secondary destinations.
- `src/components/app/navigation-model.ts` is the navigation source of truth.
- Auth pages use `AuthShell`; authenticated pages are wrapped by
  `src/app/[locale]/(app)/layout.tsx`.
- New pages should compose existing shared primitives instead of defining route-local layout
  systems.

### Landmarks and Keyboard Navigation

- Every route exposes exactly one `<main id="main-content" tabIndex={-1}>` element as the page
  landmark. The `(app)` layout wraps its content in `<main>`; `(public)` pages and root special
  files (`loading.tsx`, `error.tsx`, `not-found.tsx`) each carry their own.
- A skip-to-content link (`nav.skipToContent` i18n key) is the first focusable element in
  `src/app/[locale]/layout.tsx`, hidden until `:focus`, and links to `#main-content`.
- `SideNavigation` toggle button announces its expanded/collapsed state via `aria-expanded` and
  closes the panel on Escape.
- `MoreNavigationSheet` (mobile overflow menu) traps Tab focus while open, restores focus to its
  trigger button on close, and closes on Escape.

## Shared UI Primitives

### Layout

- `PageContainer`, `PageHeader`, `SectionStack`, `ResponsiveGrid`, `FormSection`, `AuthShell`,
  `ShellPage`, `InsetPanel`

### Controls

- `Button` — renders `aria-busy` when `isBusy` is true; displays an inline spinner while busy;
  reduced-motion users see no animation.
- `Input`, `Textarea`, `Select`, `Badge`, `SectionCard`

### State/Display

- `EmptyState` — renders its title as a semantic heading (`<h2>` by default, or `<h3>` via
  optional `titleAs` prop); use `titleAs="h3"` when the empty state sits inside a card that
  already owns an `<h2>`.
- `FormSection` — always renders a real `<label>` associated to the control via `htmlFor`;
  accepts optional `required?: boolean` to render a visual asterisk marker (only when `htmlFor`
  is set); surfaces validation errors via `role="alert"` so they announce on submit.
- `LoadingState` — centered spinner for indeterminate loading states; use `QueryLoadingState`
  with a `variant` for layout-matched skeletons instead.
- `QueryLoadingState` — layout-aware loading state; pass `variant` ('spinner' | 'timeline' |
  'card-grid' | 'stat-grid' | 'detail') matching the content being loaded; defaults to 'spinner'
  for backward compatibility.
- `Skeleton` — base placeholder block; composed into `TimelineSkeleton`, `CardGridSkeleton`,
  `StatGridSkeleton`, `DetailSkeleton` to mirror final layouts; respects `prefers-reduced-motion`.
- `ListRow`, `MemoryCard`, `ComingSoonCard`, `PageReveal`

### Story/Travel/Game Surfaces

- `AnniversarySpotlight`, `TimelineRibbon`, `TravelAtlasShell`, `CountdownWidgetTemplate`,
  `FutureNoteCard`, `TripCardTemplate`, `AlbumCard`, `GameCardTemplate`, `StatCardTemplate` —
  numeric displays render with `font-variant-numeric: tabular-nums` for stable figure alignment.

## Responsive Rules

- Breakpoints follow Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536.
- Use `PageContainer` for public pages and global states.
- Use `SectionStack` for vertical rhythm and `ResponsiveGrid` for repeated collections.
- `ResponsiveGrid` with one column fits narrative/detail pages; two columns fits primary
  dashboards/lists; three columns is only for dense scanning.
- Forms stack on mobile and may use two columns from `md` when fields are parallel.
- Preserve safe-area clearance for the floating mobile dock.
- Keep desktop spacing intentionally roomier than mobile spacing.
- Full-height layouts use `min-h-[100svh]` (smallest viewport unit, matches `globals.css`
  `body`) to avoid content jump when mobile browser chrome appears; do not use `100vh` or `100dvh`.

## Production-Flow E2E Coverage

- Browser coverage lives in Playwright under `tests/e2e/*`.
- The suite runs against `next build` plus `next start`, not the dev server.
- `playwright.config.ts` keeps the suite serial because the app is a singleton couple space on one
  local Supabase stack.
- The harness uses `E2E_BASE_URL`, default `http://127.0.0.1:3100`.
- Auth bootstrap uses the real login UI, Mailpit, the loopback-only OTP helper, and saved partner
  storage states under `playwright/.auth/`.
- Feature data creation stays inside browser flows; the suite does not use SQL seed fixtures for
  route-level test content.
- The suite covers implemented backend-backed routes only.

## Guardrails

- Keep authenticated app-data reads server-prefetched and hydrated through TanStack Query.
- Keep auth gate decisions in `src/lib/server/couple-context.ts`.
- Keep couple/invite invariants in SQL RPCs.
- Keep couple-level day-boundary logic rooted in `couples.timezone`.
- Keep album grouping rooted in `trips` and existing `memory_media`; trip media upload is still memory upload dated inside the trip window.
- Keep visited places rooted in `trips`; mapped place metadata is optional location enrichment, not a separate travel hierarchy.
- Keep gameplay reads server-first and reveal-safe.
- Do not introduce additional client state/query systems opportunistically.
- Do not add server reads, tables, jobs, or RPCs to shell-only routes without updating business
  rules, API contracts, route status, and tests.
