<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Agent Rules

## Scope
- Keep changes as small as the request allows.
- Do not refactor unrelated code, move files, or add new runtime dependencies unless the task explicitly requires it.
- Treat docs-only tasks as docs-only; package upgrades and generated artifacts are separate tasks.

## Source Of Truth
1. Business rules: `docs/product/business-rules.md`
2. Schema and security: `supabase/migrations/*.sql`
3. Runtime mutation/API contract: `src/app/actions/*` and `docs/engineering/api-contracts.md`
4. UI behavior and route status: `docs/engineering/frontend-architecture.md` and `docs/engineering/route-capability-matrix.md`
5. Historical logs: context only unless explicitly marked current

If docs conflict with SQL on schema, RLS, RPCs, or storage behavior, trust SQL and update docs to match.

## Next.js Workflow
- This repo uses Next.js 16.2.x. Before any Next.js code or config change, read the matching bundled docs under `node_modules/next/dist/docs/`.
- Preserve the Next-managed block above. Add project-specific agent instructions outside the `BEGIN/END:nextjs-agent-rules` comments.
- If Next.js DevTools MCP is available, use it for runtime diagnostics before guessing about routes, errors, or build behavior.

## Development And Verification
- Start with `docs/agent/agent-handbook.md` and `docs/engineering/development-verification.md`.
- Re-check `docs/engineering/route-capability-matrix.md` before changing route behavior or route docs.
- Required baseline before PRs:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- Also run `pnpm typecheck:functions` when Supabase Edge Functions or reminder docs/contracts are touched.
- Do not claim a fresh `pnpm test:e2e` result unless the suite was actually run in the current change.

## Safety Boundaries
- Do not insert directly into `public.couples` or `public.couple_memberships` from app code.
- Do not replace `bootstrap_first_couple(...)` or `accept_couple_invite(...)` with direct table writes.
- Do not edit `src/lib/supabase/database.types.ts` or `src/lib/db/schema.ts` as a substitute for a real SQL migration.
- Do not treat `/chat` or non-`daily-question` `/games/[mode]` routes as live backend features.
