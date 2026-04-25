# AI Agent Handbook

This repository is safe for stateless AI agents only if they follow the source-of-truth order and respect the database-owned invariants. Do not treat visual completeness as proof that backend logic exists.

## Next.js 16.2 Agent Baseline
- Before any Next.js change, read the matching bundled docs under `node_modules/next/dist/docs/`; installed Next.js docs are version-matched to this project.
- Preserve the Next-managed section in root `AGENTS.md`; project-specific rules belong outside its comment markers.
- If Next.js DevTools MCP is available, use it for runtime route, compilation, and error diagnostics before guessing from static files alone.
- For local development behavior, remember that Next.js 16 uses Turbopack by default and writes dev output under `.next/dev`.

## Source Of Truth
1. Business rules: `docs/product/business-rules.md`
2. Schema and security enforcement: `supabase/migrations/*.sql`
3. Runtime mutation/API contract: `src/app/actions/*` plus documented RPCs in `docs/engineering/api-contracts.md`
4. UI behavior and current route status: `docs/engineering/frontend-architecture.md` and `docs/engineering/route-capability-matrix.md`
5. Historical logs and decision logs: context only unless explicitly marked current

If docs conflict with SQL on schema, RLS, RPCs, or storage policy, trust SQL.
If roadmap or feature copy conflicts with the route-capability matrix on what exists today, trust the route-capability matrix.
If an older decision log conflicts with current architecture docs, trust the newer architecture docs unless the log explicitly says it is still current.

## Repo Map
- `src/app/[locale]/(public)`: login, first-user onboarding, and invite acceptance routes
- `src/app/[locale]/(app)`: authenticated app shell and user-facing routes
- `src/app/actions`: Server Actions that own runtime mutations
- `src/lib/server`: auth gate, couple context, page data reads, site URL resolution
- `src/lib/supabase`: typed server/browser clients and middleware
- `supabase/migrations`: authoritative schema, RLS, RPCs, triggers, storage policies
- `docs/product`: product rules, user flows, roadmap, feature state
- `docs/engineering`: architecture, contracts, migration rules, route capability matrix
- `docs/engineering/development-verification.md`: local setup, verification, and E2E harness guide

## Capability Model
- `implemented`: route is data-backed and part of the current runtime
- `shell-only`: route has layout/UI composition but no live domain model or backend workflow
- `mock-only`: route renders fake sample content to demonstrate future UX; do not treat it as real data wiring
- `planned`: route or feature does not exist yet

Use `docs/engineering/route-capability-matrix.md` as the canonical “what exists today” reference.

## Safe Areas
- Docs-only changes that preserve current source-of-truth rules
- Presentational improvements on implemented routes that do not alter auth, mutation, or schema behavior
- Shell-only and mock-only routes, as long as they remain clearly non-authoritative and do not invent backend assumptions
- Small component refactors that preserve shared layout and token rules from `docs/engineering/frontend-architecture.md`

## Unsafe Areas
- Auth flow, invite acceptance, couple bootstrap, and callback redirect handling
- Any change touching `couples`, `couple_memberships`, invite lifecycle, RLS, RPCs, or storage policies
- Any schema change that edits TypeScript mirrors without matching SQL migrations
- Any work that assumes `/chat` is live data
- Any work that assumes non-`daily-question` slugs under `/games/[mode]` are live gameplay routes
- Any work that treats `/stats` as a general analytics system beyond the current gameplay read model
- Any work that changes the trip/album contract without also reviewing the trip-rooted album rules in `docs/product/business-rules.md`
- Any work that skips `docs/engineering/route-capability-matrix.md` and invents route status from older logs or shell polish alone

## Forbidden Actions
- Do not insert directly into `public.couples` or `public.couple_memberships` from app code.
- Do not replace `bootstrap_first_couple` or `accept_couple_invite` with direct table writes.
- Do not edit `src/lib/supabase/database.types.ts` or `src/lib/db/schema.ts` as a substitute for a real SQL migration.
- Do not treat decision logs or changelog entries as the canonical description of current behavior.
- Do not add backend assumptions to shell-only or mock-only routes without also adding schema/contracts/docs.
- Do not change the storage path contract for memory media without reviewing storage policies and rollback behavior.
- Do not add a second album upload pipeline without reviewing the existing `memory_media` contract first.
- Do not treat `/map` as a provider-backed geographic contract; the current implementation is a provider-free atlas over `visited_places`.

## Required Validation Before PR
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `git diff --check`

If a change touches auth, invite flow, schema, RLS, RPCs, or storage:
- re-read `docs/product/business-rules.md`
- re-read `docs/engineering/migration-playbook.md`
- confirm the affected docs still match the code and SQL

If a change touches Supabase Edge Functions or reminder delivery:
- run `pnpm typecheck:functions`

If a change touches browser production flows:
- consider `pnpm test:e2e`
- do not claim a fresh E2E result unless it was run in the current change

## Agent Start Checklist
- Read this file first.
- Read `docs/product/active-plan.md` before roadmap, feature-planning, or "what should we build next" work.
- Read `docs/product/business-rules.md` before changing auth, invite, memory, or list flows.
- Read `docs/engineering/migration-playbook.md` before proposing schema work.
- Read `docs/engineering/route-capability-matrix.md` before touching a route that is not obviously implemented.
- Read `docs/engineering/development-verification.md` before changing local setup, validation, or E2E instructions.
- If the task changes current behavior, update the affected docs in the same PR.
