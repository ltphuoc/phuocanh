# Codebase Summary

Module-by-module map of the application source. This is an orientation aid, not a contract. For
behavior and status, trust `supabase/migrations/*.sql`, `src/app/actions/*`,
`docs/api-contracts.md`, and `docs/route-capability-matrix.md`.

## Top-Level Layout

| Path                  | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `src/app`             | Next.js App Router routes, route handlers, and Server Actions   |
| `src/components`      | Shared layout, UI primitives, forms, and app navigation         |
| `src/lib`             | Server reads, query layer, Supabase clients, utilities, env     |
| `src/i18n`            | `next-intl` routing, navigation, and request configuration      |
| `src/hooks`           | Shared client hooks                                             |
| `messages`            | `next-intl` message files (`vi`, `en`)                          |
| `supabase/migrations` | Authoritative SQL schema, RLS, triggers, RPCs, storage policies |
| `supabase/functions`  | Reminder Edge Function (`reminder-processor`)                   |
| `tests/unit`          | Vitest unit tests                                               |
| `tests/e2e`           | Playwright production-flow tests                                |
| `scripts`             | i18n checks and the E2E run harness                             |

## Routes (`src/app`)

- `src/app/[locale]/layout.tsx` — root layout; wires `NextIntlClientProvider`, `QueryProvider`, and
  the `Fraunces` / `Manrope` fonts.
- `src/app/[locale]/page.tsx` — redirect-only index; resolves auth gate state.
- `src/app/[locale]/(public)` — `login`, `onboarding`, `accept-invite`.
- `src/app/[locale]/(app)` — authenticated routes inside one shared shell (`layout.tsx` renders
  `SideNavigation` + `BottomNavigation`): `home`, `on-this-day`, `memories/new`,
  `memories/[memoryId]`, `albums`, `albums/[albumId]`, `trips`, `trips/[tripId]`, `map`,
  `countdowns`, `future-notes`, `lists`, `games`, `games/[mode]`, `stats`, `settings`.
- Interactive `(app)` pages pair a Server Component `page.tsx` with a `*-client-page.tsx` client
  component for hydrated TanStack Query data.
- `src/app/auth/callback/route.ts` — Supabase auth callback exchange.
- `src/app/auth/callback/verify-email-otp/route.ts` — loopback-only local E2E helper.
- `src/app/api/app-data/[...slug]/route.ts` — internal authenticated client-refetch surface for
  TanStack Query.
- `src/app/api/geo/search/route.ts` — authenticated server-side Nominatim place-search proxy.

## Server Actions (`src/app/actions`)

App-layer mutations, grouped by domain. All return the shared `ActionState` shape.

- `auth-actions.ts` — `sendMagicLinkAction`, `createInviteAction`, `acceptInviteAction`,
  `completeOnboardingAction`.
- `memory-actions.ts` — `createMemoryAction`, `updateMemoryAction`, `deleteMemoryAction`;
  `updateMemoryAction` routes media changes through the atomic `update_memory_media` RPC.
- `list-actions.ts` — `addWishItemAction`, `createChecklistAction`, `addChecklistItemAction`,
  `toggleChecklistItemAction`.
- `planning-actions.ts` — countdown, future-note, trip, album, visited-place, and couple-timezone
  mutations.
- `gameplay-actions.ts` — `ensure*RoundAction` / `submit*AnswerAction` for daily-question,
  guess-date, and trivia.

## Server Reads (`src/lib/server`)

- `couple-context.ts` — auth gate (`getAuthGateState()`) and ready-couple context resolution.
- `app-data.ts` — central app-data aggregator; attaches signed storage URLs.
- `phase-one-data.ts` — home, lists, on-this-day, memory detail reads.
- `phase-two-data.ts` — countdowns, future notes, trips, albums, map reads.
- `phase-three-data.ts` — game rounds and gameplay stats reads.
- `memory-media.ts` — signs `memory-media` storage URLs.
- `openai-daily-question.ts` — OpenAI Responses API prompt generation.
- `nominatim-geocoding.ts` — Nominatim search with per-process cache and rate limits.
- `site-url.ts` — runtime base-URL resolution from request headers.

## Query Layer (`src/lib/query`)

- `query-client.ts` — TanStack Query client factory and singleton.
- `app-query-keys.ts` — exact `["app-data", ...]` query keys per data domain.
- `app-query-fetchers.ts` — client fetchers hitting `/api/app-data/*`.
- `app-query-updates.ts` — targeted invalidation, `setQueryData`, and optimistic-update helpers.
- `action-mutation.ts` — bridges Server Actions into `useMutation`.
- `server-prefetch.ts` — `dehydrateAppQuery(...)` hydration helper.

## Supabase Clients (`src/lib/supabase`)

- `server.ts`, `client.ts` — typed server and browser clients.
- `database.types.ts` — checked-in TypeScript schema mirror; must match SQL migrations.

## Components (`src/components`)

- `ui/` — presentational primitives (`Button`, `Input`, `MemoryCard`, `TravelAtlasShell`, card and
  template widgets, state components, and `skeleton.tsx` loading primitives: `Skeleton`,
  `TimelineSkeleton`, `CardGridSkeleton`, `StatGridSkeleton`, `DetailSkeleton`).
- `forms/` — React Hook Form components, one per Server Action flow, plus `location-picker.tsx`.
- `app/` — navigation: `navigation-model.ts` is the source of truth, consumed by
  `side-navigation.tsx`, `bottom-navigation.tsx`, `more-navigation-sheet.tsx`,
  `language-switcher.tsx`.
- `layout/` — page-structure primitives (`PageContainer`, `PageHeader`, `SectionStack`,
  `ResponsiveGrid`, `FormSection`, `AuthShell`, `ShellPage`).
- `providers/` — `query-provider.tsx`. `query/` — `query-status.tsx`.

## Other Libraries (`src/lib`)

- `utils/` — `cn.ts`, `couple-timezone.ts`, `date-input.ts`, `trip-display.ts`.
- `location/` — shared location type definitions.
- `env.ts` / `public-env.ts` — validated server and public environment access.
- `runtime-env.ts` — shared `isProductionRuntime` detection used by `public-env.ts` and
  `server/site-url.ts`.
- `db/schema.ts` — baseline Drizzle inventory only; not a live ORM model.
- `auth/` — auth redirect helpers and callback origin utilities.
- `actions/` — Server Action helpers and shared error mapping (e.g., `accept-invite-error-map.ts`).
- `app-data/` — app-data types and payload contract.

## Internationalization

- `src/i18n/` — `routing.ts` (`vi` default, `en` supported), `navigation.ts`, `server.ts`,
  `request.ts` (English base, Vietnamese merged on top).
- `messages/en.json`, `messages/vi.json` — message catalogs; parity is enforced by
  `pnpm i18n:check`.

## Backend (`supabase`)

- `migrations/` — authoritative schema, RLS, triggers, RPCs, and storage policies.
- `functions/reminder-processor/` — Deno Edge Function that claims and delivers reminder rows via
  Resend; invoked by `pg_cron`.
- `functions/media-sweeper/` — Deno Edge Function that deletes orphaned `memory-media` bucket
  objects; invoked by the `memory-media-sweeper` `pg_cron` job (dry-run by default).
- `config.toml` — local ports; local Edge Runtime is disabled.
