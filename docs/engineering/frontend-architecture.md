# Frontend Architecture

This file describes the current frontend operating model. It is the canonical reference for route behavior and UI/runtime boundaries.

## Route Groups
- `src/app/(public)`: `/login`, `/onboarding`, and `/accept-invite`
- `src/app/(app)`: authenticated routes rendered inside one shared app shell
- `src/app/auth/callback/route.ts`: Supabase auth callback exchange and safe redirect
- `src/app/page.tsx`: redirect-only route that resolves auth gate state

## Route Categories
- `implemented`: `/`, `/login`, `/onboarding`, `/accept-invite`, `/auth/callback`, `/home`, `/lists`, `/memories/new`, `/memories/[memoryId]`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/trips/[tripId]`, `/albums`, `/albums/[albumId]`, `/map`, `/games`, `/games/daily-question`, `/stats`, `/settings`
- `shell-only`: non-`daily-question` slugs under `/games/[mode]`
- `mock-only`: `/chat` (deprecated mock artifact pending cleanup)

Use `docs/engineering/route-capability-matrix.md` for the full table.

## Server vs Client Boundary
- Default: pages and data reads stay on the server.
- Implemented pages fetch data in Server Components through helpers in `src/lib/server/*`.
- Client components are used for forms, navigation interaction, motion wrappers, toast feedback, and file input handling.

Do not move server reads into client components unless the task explicitly changes architecture.

## Data Read Pattern
- Authenticated pages first resolve couple context through `getAuthGateState()` or `getReadyCoupleContextOrRedirect()`.
- Page reads then call server helpers such as `getHomePageData(...)`, `getOnThisDayData(...)`, `getMemoryDetailData(...)`, `getCountdownsPageData(...)`, `getFutureNotesPageData(...)`, `getTripsPageData(...)`, `getTripDetailData(...)`, `getMapPageData(...)`, `getAlbumsPageData(...)`, `getAlbumDetailData(...)`, `getGamesHubData(...)`, `getDailyQuestionPageData(...)`, and `getGameplayStatsPageData(...)`.
- Signed `memory-media` URLs are created server-side through `signMemoryMediaStorageItems(...)` before render.
- Future-note bodies stay in the server read layer; client components never fetch locked content directly, and unlocked bodies now flow through the decrypted RPC path rather than direct table reads.
- Trip detail reads return `notFound()` for invalid or non-member trip IDs instead of rendering placeholder content.
- Trip detail reads now include ordered `visited_places` rows for the trip.
- Album detail reads return `notFound()` for invalid or non-member album IDs instead of rendering placeholder content.
- `/map` renders a provider-free atlas from real trip-linked `visited_places`; it does not depend on a tile provider.
- `/games` renders the live daily-question hub state on the server through secure gameplay read RPCs.
- `/games/daily-question` renders the current couple-local round, submission state, and reveal state on the server through secure gameplay read RPCs.
- `/stats` renders gameplay-only aggregates from the server read model through secure gameplay stats RPCs.
- `/settings` resolves real couple context and renders the live shared-timezone control.
- Shared date helpers and date-rendering components receive the couple timezone explicitly instead of relying on environment defaults.

## Mutation Pattern
- Forms use `react-hook-form`, `zodResolver`, `useActionState`, `startTransition(...)`, and Sonner toasts.
- Phase 2 planning forms also use inline field errors via `FormSection` in addition to toast feedback.
- Server Actions are the mutation boundary for app code.
- First-user onboarding confirmation and invite acceptance use SQL RPCs because membership/bootstrap invariants are DB-owned.
- Countdown and future-note forms submit date-only values; server actions derive stored UTC instants from the saved couple timezone.
- Future-note creation now uses a SQL RPC so metadata insert plus encrypted body write stay transactional.
- Album creation/add flows call SQL RPCs from Server Actions so multi-row album writes stay transactional and couple-scoped.
- Daily-question generation calls the OpenAI Responses API on the server, then writes through `ensure_daily_question_round(...)`.
- Daily-question answer submit calls `submit_daily_question_answer(...)` so one-answer-per-user and locked-after-submit behavior stays DB-owned.
- Direct browser reads of `game_round_answers` are intentionally not part of the runtime; gameplay reveal state comes from secure server read helpers.
- `/settings` owns the `updateCoupleTimezoneAction` flow for the shared couple timezone.

## ActionState Contract
- `ActionState = { status: "idle" | "success" | "error"; message: string }`
- `ActionStateWithData<T>` extends `ActionState` with optional `data`
- Client forms should not invent alternate success/error payload shapes for the current runtime without updating `docs/engineering/api-contracts.md`

## Revalidation Rules
| Mutation | Revalidated routes |
|---|---|
| `sendMagicLinkAction` | none |
| `completeOnboardingAction` | `/`, `/home` |
| `createInviteAction` | none |
| `acceptInviteAction` | `/home` |
| `createMemoryAction` | `/home`, `/on-this-day`, `/lists` |
| `addWishItemAction` | `/home`, `/lists` |
| `createChecklistAction` | `/home`, `/lists` |
| `addChecklistItemAction` | `/home`, `/lists` |
| `toggleChecklistItemAction` | `/home`, `/lists` |
| `createCountdownAction` | `/countdowns` |
| `createFutureNoteAction` | `/future-notes` |
| `createTripAction` | `/trips` |
| `createVisitedPlaceAction` | `/map`, `/trips/[tripId]` |
| `createAlbumAction` | `/albums`, `/trips/[tripId]` |
| `addAlbumItemsAction` | `/albums`, `/albums/[albumId]`, `/trips/[tripId]` |
| `ensureDailyQuestionRoundAction` | `/games`, `/games/daily-question`, `/stats` |
| `submitDailyQuestionAnswerAction` | `/games`, `/games/daily-question`, `/stats` |
| `updateCoupleTimezoneAction` | `/settings`, `/home`, `/on-this-day`, `/countdowns`, `/future-notes`, `/trips`, `/albums`, `/map` |

## Shared UI Structure
- App shell: `src/app/(app)/layout.tsx`, `BottomNavigation`, `SideNavigation`, `navigation-model.ts`
- Shared layout primitives: `AuthShell`, `PageContainer`, `PageHeader`, `SectionStack`, `ResponsiveGrid`, `FormSection`, `ShellPage`
- Shared UI/state primitives: `SectionCard`, `EmptyState`, `LoadingState`, `ListRow`, `ComingSoonCard`, `PageReveal`, `CountdownWidgetTemplate`, `FutureNoteCard`, `TripCardTemplate`, `AlbumCard`
- Phase 2/3 forms: `CreateCountdownForm`, `CreateFutureNoteForm`, `CreateTripForm`, `CreateVisitedPlaceForm`, `CreateAlbumForm`, `AddAlbumItemsForm`, `GenerateDailyQuestionForm`, `SubmitDailyQuestionAnswerForm`, `UpdateCoupleTimezoneForm`
- Phase 2 travel atlas shell: `TravelAtlasShell`

New routes should compose these primitives rather than invent new layout systems per page.

## Shell-Only And Mock-Only Rules
- `shell-only` means the route exists to define layout and navigation, not to prove backend support.
- `mock-only` means the route renders sample content for UX direction or survives temporarily as a deprecated artifact and must not be treated as real data.
- Do not add server reads, new tables, or background jobs to shell-only or mock-only routes without updating `docs/product/business-rules.md`, `docs/engineering/api-contracts.md`, and `docs/engineering/route-capability-matrix.md`.

## Architecture Guardrails
- Keep implemented reads server-first.
- Keep auth gate decisions in `src/lib/server/couple-context.ts`.
- Keep couple/invite invariants in SQL RPCs.
- Keep couple-level day-boundary logic rooted in the saved `couples.timezone` field and shared timezone helpers.
- Keep album grouping rooted in `trips` and existing `memory_media`; do not add a second upload pipeline casually.
- Keep visited places rooted in `trips`; do not derive them implicitly from memory locations without revisiting the product contract.
- Keep gameplay reads server-first and keep prompt generation on the server; do not move OpenAI prompt generation into client code.
- Do not introduce TanStack Query, Zustand, or `nuqs` opportunistically into routine changes. The current runtime is not structured around them yet.
- If a task intentionally migrates data/state architecture, document it first.
