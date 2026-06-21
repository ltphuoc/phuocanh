# AI Agent Handbook

This repo is safe for stateless AI agents only when they follow source-of-truth order and respect
database-owned invariants. Do not treat visual completeness as proof that backend logic exists.

## Start Checklist

- Read root `AGENTS.md`.
- For Next.js work, read the matching bundled docs under `node_modules/next/dist/docs/`.
- Read `docs/development-verification.md` before changing setup, commands, env vars,
  testing, or E2E instructions.
- Read `docs/route-capability-matrix.md` before changing route behavior or route docs.
- Read `docs/product/business-rules.md` before touching auth, membership, invite, memory, list,
  planning, travel, gameplay, stats, or timezone behavior.
- Read `docs/migration-playbook.md` before proposing schema, RLS, RPC, trigger, or
  storage policy work.
- Read `docs/product/active-plan.md` before roadmap or "what should we build next" work.

## Source Of Truth

1. Business rules: `docs/product/business-rules.md`
2. Schema and security enforcement: `supabase/migrations/*.sql`
3. Runtime mutation/API contract: `src/app/actions/*` plus documented RPCs in
   `docs/api-contracts.md`
4. UI behavior and current route status:
   `docs/frontend-architecture.md` and
   `docs/route-capability-matrix.md`
5. Historical logs and decision logs: context only unless explicitly marked current

If docs conflict with SQL on schema, RLS, RPCs, or storage policy, trust SQL. If roadmap or feature
copy conflicts with the route matrix, trust the route matrix.

## Repo Map

| Path                        | Purpose                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/app/[locale]/(public)` | Login, first-user onboarding, invite acceptance                                                        |
| `src/app/[locale]/(app)`    | Authenticated app shell and user-facing routes                                                         |
| `src/app/actions`           | Server Actions that own app-layer mutations                                                            |
| `src/lib/server`            | Auth gate, couple context, app-data reads, site URL resolution                                         |
| `src/lib/query`             | Query keys, fetchers, hydration, mutation cache updates                                                |
| `src/lib/supabase`          | Typed server and browser clients                                                                       |
| `supabase/migrations`       | Authoritative schema, RLS, RPCs, triggers, storage policies                                            |
| `supabase/functions`        | Reminder and media-sweeper Edge Functions                                                              |
| `docs/product`              | Product rules, flows, feature state, current plan                                                      |
| `docs`                      | Architecture, codebase map, contracts, data model, code standards, migration, deployment, verification |
| `docs/agent`                | Agent handbook and source-of-truth order                                                               |
| `docs/changelog`            | Historical implementation log (context only)                                                           |
| `tests/e2e`                 | Production-flow Playwright coverage                                                                    |
| `tests/unit`                | Vitest coverage                                                                                        |

## Capability Model

- `implemented`: backed by current runtime data or auth logic.
- `shell-only`: route defines layout/navigation only; it does not prove backend support.
- `planned`: not currently routed or implemented.

Use `docs/route-capability-matrix.md` as the canonical current route map.

## Safe Change Areas

- Docs-only changes that preserve source-of-truth rules.
- Presentational changes on implemented routes that do not alter auth, mutation, schema, or storage
  behavior.
- Small component changes that preserve shared layout and token rules from
  `docs/frontend-architecture.md` and `docs/design-system.md`.
- Shell-only routes, if they remain clearly non-authoritative and do not invent backend assumptions.

## High-Risk Areas

- Auth flow, invite acceptance, couple bootstrap, callback redirect handling, and auth gate logic.
- `couples`, `couple_memberships`, invite lifecycle, RLS, RPCs, triggers, and storage policies.
- Schema changes that edit TypeScript mirrors without matching SQL migrations.
- Storage path contract for `memory-media`.
- Trip, album, visited-place, reminder, future-note encryption, gameplay reveal, and shared-timezone
  invariants.
- Any work that treats `/stats` as general analytics beyond the daily-question gameplay read model.
- Any work that treats game slugs other than `daily-question`, `guess-date`, and `trivia` under
  `/games/[mode]` as live gameplay routes.

## Forbidden Actions

- Do not insert directly into `public.couples` or `public.couple_memberships` from app code.
- Do not replace `bootstrap_first_couple(...)` or `accept_couple_invite(...)` with direct table
  writes.
- Do not edit `src/lib/supabase/database.types.ts` or `src/lib/db/schema.ts` as a substitute for a
  real SQL migration.
- Do not add backend assumptions to shell-only routes without schema, contracts, docs, and tests.
- Do not add a second album upload pipeline without revisiting the `memory_media` contract.
- Do not expose hidden gameplay targets or answers through direct browser-readable table access.
- Do not treat `/map` as provider-backed geography; it is currently a provider-free atlas over
  `visited_places`.

## Validation Rules

- Baseline before PRs:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
  - `git diff --check`
- Run `pnpm typecheck:functions` for Edge Function or docs/contract changes affecting reminder or media-sweeper.
- Run i18n checks for translation or user-visible copy changes.
- Consider `pnpm test:e2e` for browser production-flow changes. Never claim a fresh E2E result
  unless it ran in the current change.
- If behavior changes, update affected docs in the same PR.
