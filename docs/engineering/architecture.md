# Engineering Architecture

This file is now the engineering index. Use the focused docs below instead of treating this file as the full system spec.

## Read In This Order
1. `docs/engineering/system-architecture.md`
2. `docs/engineering/frontend-architecture.md`
3. `docs/engineering/api-contracts.md`
4. `docs/engineering/data-model.md`
5. `docs/engineering/migration-playbook.md`

## Current Runtime Summary
- Next.js App Router with Server Components by default
- Public routes for login, first-user onboarding, and invite acceptance
- Authenticated routes behind one shared app shell
- Server Actions for app-layer mutations
- Supabase Auth for identity
- Supabase Postgres for schema, RLS, triggers, and RPCs
- Supabase Storage for private memory media

## Source Of Truth Reminder
- Business rules: `docs/product/business-rules.md`
- Schema/security: `supabase/migrations/*.sql`
- Runtime contracts: `docs/engineering/api-contracts.md`
- UI/route behavior: `docs/engineering/frontend-architecture.md` and `docs/engineering/route-capability-matrix.md`
