# Migration Playbook

This file defines how schema work must happen in this repo.

## Core Rule
- SQL migrations under `supabase/migrations/*.sql` are the authoritative schema and security source of truth.

If SQL, TypeScript mirror files, and docs disagree, trust SQL and update the others to match.

## When To Edit What
- Edit SQL migrations when changing:
- tables
- columns
- enums
- indexes
- constraints
- triggers
- RLS policies
- RPCs
- storage bucket policies
- Edit `src/lib/supabase/database.types.ts` only after the SQL change exists.
- Edit `src/lib/db/schema.ts` only as a mirror/inventory update. It is not the live schema authority.
- Edit `docs/product/business-rules.md`, `docs/engineering/api-contracts.md`, and `docs/engineering/route-capability-matrix.md` whenever the change affects behavior or feature status.

## Required Checklist For Every Schema Change
1. Write a new timestamped SQL migration under `supabase/migrations/`.
2. Update RLS policies if the new or changed object is couple-scoped.
3. Update or add RPCs if the mutation owns an invariant that should not live in app code.
4. Update storage policies if object-path authorization changes.
5. Apply the migration locally with Supabase CLI.
6. Regenerate or manually sync `src/lib/supabase/database.types.ts`.
7. Sync `src/lib/db/schema.ts` if the baseline inventory is still being maintained.
8. Update the product/engineering docs that describe the new behavior.
9. Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## RLS And RPC Review Rules
- Couple bootstrap and invite acceptance are DB-owned invariants. Do not move them into app writes.
- Any mutation that could violate membership count, role uniqueness, invite validity, or storage isolation should be reviewed for RPC ownership.
- If a new table is couple-scoped, define how `is_couple_member(...)` or an equivalent access rule applies before shipping.

## Backward Compatibility Rules
- Prefer additive changes first.
- If a destructive change is required, split it into expand/migrate/contract stages unless the task explicitly says otherwise.
- Do not silently change RPC signatures used by app code.
- Do not ship TypeScript callers that assume a new schema before the SQL migration exists.

## Rollback And Backfill Rules
- Every non-trivial migration should be written so the failure point is obvious.
- If backfill is needed, document whether it is:
- in-migration SQL
- one-off manual SQL
- app-layer temporary compatibility logic
- If rollback is not straightforward, document that in the PR and affected docs.

## Type Generation Expectations
- The repo does not currently expose an automated type-generation script.
- After applying SQL changes locally, regenerate or manually sync `src/lib/supabase/database.types.ts` so checked-in TypeScript matches the live schema.
- Never edit `database.types.ts` alone and call the change complete.

## Current Posture On Drizzle
- `drizzle.config.ts` and `src/lib/db/schema.ts` are baseline artifacts only.
- Current runtime behavior does not depend on a live Drizzle ORM layer.
- Do not treat Drizzle baseline files as authority over SQL migrations.
