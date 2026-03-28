# Data Model

This file summarizes the current schema. The authoritative source is always `supabase/migrations/*.sql`.

## Schema Authority
- Live schema, RLS, triggers, RPCs, and storage policies are owned by SQL migrations.
- `src/lib/supabase/database.types.ts` is a checked-in TypeScript mirror and must match SQL.
- `src/lib/db/schema.ts` is baseline inventory only and does not replace SQL.
- Use `docs/engineering/migration-playbook.md` before making schema changes.

## Tables Implemented
- `couples`
- `couple_memberships`
- `couple_invites`
- `memories`
- `memory_media`
- `wish_items`
- `checklists`
- `checklist_items`
- `activity_events`

## Core Relationships
- One `couples` row -> many `couple_memberships`
- One `couples` row -> many `memories`, `wish_items`, `checklists`, `activity_events`
- One `memories` row -> many `memory_media`
- One `checklists` row -> many `checklist_items`

## Critical Constraints
- Global singleton couple space via unique expression index on `couples ((true))`
- Max two active memberships per couple via trigger
- Unique active role per couple via partial unique index on `(couple_id, role)` where `status = 'active'`
- Unique invite token
- Storage authorization bound to the couple ID embedded in object paths

## Security Posture
- RLS is enabled across app tables.
- `is_couple_member(target_couple_id uuid)` is the central access helper.
- Direct app-layer insert into `couples` and `couple_memberships` is intentionally blocked; membership creation happens through RPCs.
- Storage bucket `memory-media` is private.
- Storage object access is couple-scoped by path policy.

## RPCs In Use
- `bootstrap_first_couple(started_date date, couple_name text)`
- `accept_couple_invite(invite_token text)`
- `memories_on_this_day(target_couple_id uuid, target_timezone text)`

## Current Drizzle Posture
- `drizzle.config.ts` and `src/lib/db/schema.ts` exist as baseline artifacts only.
- Current runtime behavior still depends on SQL migrations, not a live Drizzle ORM model.
- Do not treat older package-install failures as a current repo invariant.

## Shell-Only Route Impact
- The editorial shell redesign and route shells do not add tables, columns, or RPCs by themselves.
- `/chat`, `/map`, `/trips`, `/trips/[tripId]`, `/albums/[albumId]`, `/countdowns`, `/future-notes`, `/games`, `/games/[mode]`, `/stats`, and `/settings` remain UI-only until migrations say otherwise.
