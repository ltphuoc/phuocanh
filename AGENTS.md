<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project Agent Rules

## Scope

- Solve only the requested problem with the smallest safe change.
- Keep docs-only tasks docs-only.
- Do not refactor unrelated code, move files, add dependencies, or regenerate artifacts unless the
  task requires it.

## Source Of Truth

1. Business rules: `docs/product/business-rules.md`
2. Schema, RLS, RPCs, triggers, and storage policies: `supabase/migrations/*.sql`
3. Runtime mutation/API contract: `src/app/actions/*` and `docs/engineering/api-contracts.md`
4. UI behavior and route status:
   `docs/engineering/frontend-architecture.md` and
   `docs/engineering/route-capability-matrix.md`
5. Historical logs: context only unless explicitly marked current

If docs conflict with SQL on schema, RLS, RPCs, or storage behavior, trust SQL and update docs to
match.

## Next.js Workflow

- This repo uses Next.js 16.2.x. Before any Next.js code or config change, read the matching
  bundled docs under `node_modules/next/dist/docs/`.
- Preserve the Next-managed block above. Add project-specific rules outside the
  `BEGIN/END:nextjs-agent-rules` comments.
- If Next.js DevTools MCP is available, use it for route, compilation, and runtime diagnostics
  before guessing.

## Development And Verification

- Start with `docs/agent/agent-handbook.md` and
  `docs/engineering/development-verification.md`.
- Check `docs/engineering/route-capability-matrix.md` before changing route behavior or route docs.
- Required baseline before PRs:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- Also run `pnpm typecheck:functions` when Supabase Edge Functions or reminder docs/contracts are
  touched.
- Do not claim a fresh `pnpm test:e2e` result unless the suite was actually run in the current
  change.

## Safety Boundaries

- Do not insert directly into `public.couples` or `public.couple_memberships` from app code.
- Do not replace `bootstrap_first_couple(...)` or `accept_couple_invite(...)` with direct table
  writes.
- Do not edit `src/lib/supabase/database.types.ts` or `src/lib/db/schema.ts` as a substitute for a
  real SQL migration.
- Do not expose future-note bodies, gameplay answers, guess-date targets, or trivia targets through
  direct browser-readable table access.
- Do not treat game slugs other than `daily-question`, `guess-date`, and `trivia` under
  `/games/[mode]` as live backend features.
