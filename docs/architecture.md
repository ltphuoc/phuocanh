# Engineering Architecture

This is the engineering documentation index. Use the focused docs below instead of treating this
file as the full system spec.

## Read In This Order

1. `docs/system-architecture.md`
2. `docs/codebase-summary.md`
3. `docs/frontend-architecture.md`
4. `docs/code-standards.md`
5. `docs/api-contracts.md`
6. `docs/data-model.md`
7. `docs/migration-playbook.md`
8. `docs/development-verification.md`
9. `docs/deployment.md`

## Current Runtime Summary

- Next.js App Router with Server Components by default
- Public routes for login, first-user onboarding, and invite acceptance
- Authenticated routes behind one shared app shell
- Server Actions for app-layer mutations
- TanStack Query hydration for authenticated app data
- Supabase Auth for identity
- Supabase Postgres for schema, RLS, triggers, and RPCs
- Supabase Storage for private memory media
- Supabase Edge Function plus cron/RPC queue for reminders
- OpenAI Responses API for daily-question prompt generation

## Source Of Truth Reminder

- Business rules: `docs/product/business-rules.md`
- Schema/security: `supabase/migrations/*.sql`
- Runtime contracts: `docs/api-contracts.md`
- UI/route behavior:
  `docs/frontend-architecture.md` and
  `docs/route-capability-matrix.md`
- Setup/testing: `docs/development-verification.md`
- Deployment: `docs/deployment.md`
