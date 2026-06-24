# PhuocAnh Couple App

Private couple memory web app for exactly two users in one shared space.

The app is built with Next.js App Router, Supabase Auth/Postgres/Storage, Server Actions,
TanStack Query hydration, and a light-only editorial UI system.

## Current State

Use [docs/route-capability-matrix.md](docs/route-capability-matrix.md) as
the canonical route map. Implemented areas include auth/onboarding, memories, lists, countdowns,
future notes, trips, trip albums, visited places, map, daily-question, guess-date, trivia, gameplay
stats, and shared timezone settings.

Game slugs other than `daily-question`, `guess-date`, and `trivia` under `/games/[mode]` are not
live backend features.

## Tech Stack

- Next.js `16.2.x`, React `19`, TypeScript, App Router, Server Components by default
- `next-intl` with locale-prefixed routes; `vi` is default, `en` is supported
- Supabase Auth, Postgres, RLS, SQL RPCs, Storage, Edge Functions for reminders
- TanStack Query for hydrated authenticated app data and same-session freshness
- React Hook Form, Zod, Sonner, Tailwind CSS v4, shadcn-style local components, Lucide icons
- Vitest for unit tests, Playwright for production-flow browser coverage

## Start Here

- Agent rules: [AGENTS.md](AGENTS.md) and [docs/agent/agent-handbook.md](docs/agent/agent-handbook.md)
- Setup and commands:
  [docs/development-verification.md](docs/development-verification.md)
- Deployment: [docs/deployment.md](docs/deployment.md)
- Business rules: [docs/product/business-rules.md](docs/product/business-rules.md)
- System architecture: [docs/system-architecture.md](docs/system-architecture.md)
- Codebase map: [docs/codebase-summary.md](docs/codebase-summary.md)
- Frontend architecture:
  [docs/frontend-architecture.md](docs/frontend-architecture.md)
- Code standards: [docs/code-standards.md](docs/code-standards.md)
- API/action contracts: [docs/api-contracts.md](docs/api-contracts.md)
- Data model: [docs/data-model.md](docs/data-model.md)
- Migration rules: [docs/migration-playbook.md](docs/migration-playbook.md)

## Source Of Truth

1. Business rules: `docs/product/business-rules.md`
2. Schema, RLS, triggers, RPCs, and storage policy: `supabase/migrations/*.sql`
3. Runtime mutation/API contract: `src/app/actions/*` and `docs/api-contracts.md`
4. UI behavior and route status:
   `docs/frontend-architecture.md` and
   `docs/route-capability-matrix.md`
5. Historical logs: context only unless explicitly marked current

If docs conflict with SQL on schema, RLS, RPCs, or storage behavior, trust SQL and update the docs.

## Quick Start

```bash
cp .env.example .env.local
pnpm install
supabase start
supabase db reset --local
pnpm dev
```

Open `http://localhost:3000` or `http://127.0.0.1:3000`. Keep the browser host aligned with
Supabase auth redirect config.

For normal local development, keep `.env.local` pointed at the local Supabase stack. Use deployed
Supabase values in Vercel/provider environment variables, or only in `.env.local` for an intentional
smoke test against the hosted project.

Local Supabase ports are project-specific:

| Service           | URL                                                       |
| ----------------- | --------------------------------------------------------- |
| API / Project URL | `http://127.0.0.1:54331`                                  |
| Studio            | `http://127.0.0.1:54332`                                  |
| Mailpit           | `http://127.0.0.1:54333`                                  |
| Database          | `postgresql://postgres:postgres@127.0.0.1:54330/postgres` |

The local Supabase Edge Runtime is disabled in `supabase/config.toml`; hosted reminder processing
still remains part of the runtime contract.

## Environment

Copy `.env.example` and fill at least:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `GEMINI_API_KEY`, unless using `DAILY_QUESTION_STUB_RESPONSE` for local/E2E testing

Do not run local reset, push, or E2E workflows against the deployed database. `pnpm test:e2e` is
designed to reset and seed local Supabase.

See [docs/development-verification.md](docs/development-verification.md)
for the full local/E2E/reminder environment matrix.

## Common Commands

| Command                     | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                  | Start the Next.js dev server                               |
| `pnpm lint`                 | ESLint with zero warnings                                  |
| `pnpm typecheck`            | TypeScript check                                           |
| `pnpm typecheck:functions`  | Deno check for the reminder Edge Function                  |
| `pnpm test:unit`            | Vitest unit tests                                          |
| `pnpm test:e2e`             | Production-flow Playwright harness against local Supabase  |
| `pnpm i18n:check`           | Translation key parity and fallback checks                 |
| `pnpm i18n:audit-hardcoded` | Hardcoded UI copy audit                                    |
| `pnpm build`                | Production Next.js build                                   |
| `pnpm validate`             | Lint, format check, typecheck, build, and whitespace check |

Before PRs, run the baseline listed in
[docs/development-verification.md](docs/development-verification.md). Do
not report a fresh E2E result unless `pnpm test:e2e` ran in the current change.

## Folder Map

| Path                        | Purpose                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `src/app/[locale]/(public)` | Login, first-user onboarding, invite acceptance                 |
| `src/app/[locale]/(app)`    | Authenticated app shell and user-facing routes                  |
| `src/app/actions`           | Server Actions for app-layer mutations                          |
| `src/lib/server`            | Couple context, auth gate, app-data reads, service helpers      |
| `src/lib/query`             | TanStack Query keys, fetchers, hydration, cache updates         |
| `src/lib/supabase`          | Typed Supabase clients and middleware                           |
| `src/components`            | Shared layout, UI, forms, and app navigation                    |
| `messages`                  | `next-intl` message files                                       |
| `supabase/migrations`       | Authoritative SQL schema, RLS, triggers, RPCs, storage policies |
| `supabase/functions`        | Reminder Edge Function                                          |
| `tests/unit`                | Vitest tests                                                    |
| `tests/e2e`                 | Playwright production-flow tests                                |
| `docs`                      | Product, engineering, agent, and manual-test documentation      |

## Safe Change Rules

- Keep docs-only tasks docs-only.
- Do not write directly to `public.couples` or `public.couple_memberships` from app code.
- Do not replace `bootstrap_first_couple(...)` or `accept_couple_invite(...)` with direct table
  writes.
- Do not edit `src/lib/supabase/database.types.ts` or `src/lib/db/schema.ts` without a real SQL
  migration when schema changes are needed.
- Keep gameplay writes behind Server Actions and SQL RPCs.
- Update the route matrix, business rules, contracts, and migration docs when behavior changes.
