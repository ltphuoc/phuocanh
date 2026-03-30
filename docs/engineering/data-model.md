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
- `countdowns`
- `future_notes`
- `future_note_contents`
- `trips`
- `albums`
- `album_items`
- `visited_places`

## Core Relationships
- One `couples` row -> many `couple_memberships`
- One `couples` row -> many `memories`, `wish_items`, `checklists`, `activity_events`, `countdowns`, `future_notes`, `trips`, and `albums`
- One `memories` row -> many `memory_media`
- One `checklists` row -> many `checklist_items`
- One `future_notes` row -> one `future_note_contents`
- One `trips` row -> at most one `albums` row in the current contract
- One `trips` row -> many `visited_places`
- One `albums` row -> many `album_items`
- One `album_items` row -> one existing `memory_media` row

## Critical Constraints
- Global singleton couple space via unique expression index on `couples ((true))`
- `couples.timezone` must be a valid IANA timezone name
- Max two active memberships per couple via trigger
- Unique active role per couple via partial unique index on `(couple_id, role)` where `status = 'active'`
- Unique invite token
- Storage authorization bound to the couple ID embedded in object paths
- `future_note_contents.future_note_id` is one-to-one with `future_notes.id`
- `trips.end_date >= trips.start_date`
- `albums.trip_id` is unique in Slice 3 (`one album per trip`)
- `albums` must not commit without at least one linked `album_items` row
- `album_items` is unique on `(album_id, memory_media_id)`
- `album_items.position > 0`
- `visited_places.visited_on` must fall inside the parent trip date range at insert time

## Security Posture
- RLS is enabled across app tables.
- `is_couple_member(target_couple_id uuid)` is the central access helper.
- Direct app-layer insert into `couples` and `couple_memberships` is intentionally blocked; membership creation happens through RPCs.
- Storage bucket `memory-media` is private.
- Storage object access is couple-scoped by path policy.
- `future_note_contents` is protected by a separate read policy that only allows access after the parent `unlock_at` passes.
- `albums` and `album_items` are couple-scoped through RLS.
- Direct `album_items` inserts are additionally bounded by the parent trip window through policy checks.
- `albums_require_items_trigger` blocks empty albums from committing, even if a caller bypasses the RPC path.
- `visited_places` is couple-scoped through RLS and additionally bounded by the parent trip window through policy checks.

## RPCs In Use
- `bootstrap_first_couple(started_date date, couple_name text, target_timezone text)`
- `accept_couple_invite(invite_token text)`
- `update_couple_timezone(target_couple_id uuid, target_timezone text)`
- `memories_on_this_day(target_couple_id uuid, target_timezone text)`
- `create_album_with_items(target_trip_id uuid, album_title text, album_description text, selected_memory_media_ids uuid[])`
- `add_album_items(target_album_id uuid, selected_memory_media_ids uuid[])`

## Couple Timezone Foundation
- `couples`
  - now includes a shared `timezone` field
  - defaults to `Asia/Ho_Chi_Minh`
  - is validated against `pg_timezone_names` through SQL
- `bootstrap_first_couple(...)`
  - now accepts explicit `target_timezone` and returns the stored `timezone` with couple identity fields
- `update_couple_timezone(...)`
  - updates the shared couple timezone transactionally
  - preserves visible calendar dates for existing `countdowns.target_at` and `future_notes.unlock_at`

## Current Drizzle Posture
- `drizzle.config.ts` and `src/lib/db/schema.ts` exist as baseline artifacts only.
- Current runtime behavior still depends on SQL migrations, not a live Drizzle ORM model.
- Do not treat older package-install failures as a current repo invariant.

## Phase 2 Slice 1 Tables
- `countdowns`
  - couple-scoped milestone rows with `kind`, `title`, optional `note`, and `target_at`
  - stored as UTC instants derived from the selected date in the saved couple timezone
  - writable/readable by active couple members through RLS
- `future_notes`
  - couple-scoped metadata rows with `title` and `unlock_at`
  - stored as UTC instants derived from the selected date in the saved couple timezone
  - metadata is visible immediately to active couple members
- `future_note_contents`
  - separate protected body table keyed by `future_note_id`
  - readable only when the parent note satisfies `unlock_at <= now()`

## Phase 2 Slice 2 Tables
- `trips`
  - couple-scoped travel rows with `title`, optional `note`, `start_date`, and `end_date`
  - writable/readable by active couple members through RLS
  - acts as the dependency root for later album and map entities

## Phase 2 Slice 3 Tables
- `albums`
  - couple-scoped trip-rooted album rows with `title`, optional `description`, and one linked `trip_id`
  - writable/readable by active couple members through RLS
- `album_items`
  - joins `albums` to existing `memory_media`
  - preserves explicit display order via `position`
  - writable/readable by active couple members through RLS and RPC validation

## Phase 2 Slice 4 Tables
- `visited_places`
  - couple-scoped trip-linked place rows with `title`, optional `note`, and `visited_on`
  - writable/readable by active couple members through RLS
  - acts as the provider-free atlas data source for `/map`

## Remaining Shell-Only / Mock-Only Route Impact
- `/chat`, `/games`, `/games/[mode]`, and `/stats` still do not add schema by themselves.
