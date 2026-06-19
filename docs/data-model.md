# Data Model

This file summarizes the current schema. The authoritative source is always `supabase/migrations/*.sql`.

## Schema Authority

- Live schema, RLS, triggers, RPCs, and storage policies are owned by SQL migrations.
- `src/lib/supabase/database.types.ts` is a checked-in TypeScript mirror and must match SQL.
- `src/lib/db/schema.ts` is baseline inventory only and does not replace SQL.
- Use `docs/migration-playbook.md` before making schema changes.

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
- `reminder_deliveries`
- `trips`
- `albums`
- `album_items`
- `visited_places`
- `game_rounds`
- `game_round_answers`
- `game_round_memory_targets`
- `game_round_trivia_targets`

## Internal Schema

- `private.secret_fallbacks` holds fallback secret material for local and CI reminder replay when
  Vault is unavailable. It is not couple-scoped app data and exposes no member-facing policies.
- Reminder scheduling depends on the `pg_cron`, `pg_net`, and `vault` extensions provisioned by the
  Phase 2 closeout migration.

## Core Relationships

- One `couples` row -> many `couple_memberships`
- One `couples` row -> many `memories`, `wish_items`, `checklists`, `activity_events`, `countdowns`, `future_notes`, `trips`, and `albums`
- One `couples` row -> many `reminder_deliveries`
- One `memories` row -> many `memory_media`
- One `checklists` row -> many `checklist_items`
- One `future_notes` row -> one `future_note_contents`
- One `trips` row -> at most one `albums` row in the current contract
- One `trips` row -> many `visited_places`
- One `albums` row -> many `album_items`
- One `album_items` row -> one existing `memory_media` row
- One `couples` row -> many `game_rounds`
- One `game_rounds` row -> many `game_round_answers`
- One `game_rounds` row -> zero or one `game_round_memory_targets` row in the current guess-date contract
- One `game_rounds` row -> zero or one `game_round_trivia_targets` row in the current trivia contract
- One `memories` row -> many `game_round_memory_targets`
- One `memories` row -> many `game_round_trivia_targets`

## Critical Constraints

- Global singleton couple space via unique expression index on `couples ((true))`
- `couples.timezone` must be a valid IANA timezone name
- Max two active memberships per couple via trigger
- Unique active role per couple via partial unique index on `(couple_id, role)` where `status = 'active'`
- Unique invite token
- Storage authorization bound to the couple ID embedded in object paths
- `future_note_contents.future_note_id` is one-to-one with `future_notes.id`
- `reminder_deliveries` is unique on `(kind, source_id, recipient_user_id)`
- `trips.end_date >= trips.start_date`
- `albums.trip_id` is unique in Slice 3 (`one album per trip`)
- `albums` must not commit without at least one linked `album_items` row
- `album_items` is unique on `(album_id, memory_media_id)`
- `album_items.position > 0`
- `visited_places.visited_on` must fall inside the parent trip date range at insert time
- `game_rounds` is unique on `(couple_id, mode, round_date)`
- `game_round_answers` is unique on `(round_id, user_id)`
- `game_round_answers.answer_body` must be trimmed non-empty text
- `game_round_memory_targets.round_id` is primary-key unique and cascades when the round is deleted
- `game_round_memory_targets.memory_id` restricts deletion of the linked source memory
- `game_round_trivia_targets.round_id` is primary-key unique and cascades when the round is deleted
- `game_round_trivia_targets.memory_id` restricts deletion of the linked source memory
- `game_round_trivia_targets.correct_answer` must be trimmed non-empty text
- `game_round_trivia_targets.answer_options` must be a JSON array with 2 to 4 options

## Security Posture

- RLS is enabled across app tables.
- `is_couple_member(target_couple_id uuid)` is the central access helper.
- Direct app-layer insert into `couples` and `couple_memberships` is intentionally blocked; membership creation happens through RPCs.
- `couple_memberships` UPDATE policy is scoped to the caller's own row; a member cannot modify their partner's membership.
- `albums` DELETE policy allows deletion only by couple members (enabling empty-album cleanup).
- `couples.timezone` is protected by a `BEFORE UPDATE` trigger that rejects direct writes from app roles; timezone changes must flow through the `update_couple_timezone()` SECURITY DEFINER RPC to preserve calendar dates in countdowns and future notes.
- Storage bucket `memory-media` is private, capped at 25 MiB per object (`file_size_limit`), and restricted to `image/*` and `video/*` declared content-types (`allowed_mime_types`).
- Storage object access is couple-scoped by path policy.
- `future_note_contents` stores encrypted note bodies and is only decrypted through `get_unlocked_future_note_contents(...)`.
- `albums` and `album_items` are couple-scoped through RLS.
- Direct `album_items` inserts are additionally bounded by the parent trip window through policy checks.
- `albums_require_items_trigger` blocks empty albums from committing, even if a caller bypasses the RPC path.
- `visited_places` is couple-scoped through RLS and additionally bounded by the parent trip window through policy checks.
- `reminder_deliveries` is RLS-protected with no member-facing policies; reminder processing is handled by cron plus service-role reads/writes.
- `game_rounds` is couple-scoped through RLS.
- `game_round_answers` is not directly browser-readable or browser-writable in the current contract.
- `game_round_memory_targets` has RLS enabled and no direct member-facing read/write policies; guess-date RPCs are the access path.
- `game_round_trivia_targets` has RLS enabled and no direct member-facing read/write policies; trivia RPCs are the access path.
- Gameplay round creation, answer submission, and reveal-safe gameplay reads are owned by SQL RPCs rather than client-only checks.

## RPCs In Use

- `bootstrap_first_couple(started_date date, couple_name text, target_timezone text)`
- `accept_couple_invite(invite_token text)`
- `update_couple_timezone(target_couple_id uuid, target_timezone text)`
- `memories_on_this_day(target_couple_id uuid, target_timezone text)`
- `create_future_note_with_body(note_title text, note_unlock_at timestamptz, note_body text)`
- `get_unlocked_future_note_contents(target_couple_id uuid)`
- `update_memory_media(p_memory_id uuid, p_note text, p_happened_at timestamptz, p_location_address text, p_location_latitude double precision, p_location_longitude double precision, p_location_name text, p_location_provider text, p_location_provider_id text, p_remove_media_ids uuid[], p_add_media jsonb)`
- `create_album_with_items(target_trip_id uuid, album_title text, album_description text, selected_memory_media_ids uuid[])`
- `add_album_items(target_album_id uuid, selected_memory_media_ids uuid[])`
- `ensure_daily_question_round(target_mode game_mode, target_round_date date, prompt_locale text, prompt_text text, prompt_source text)`
- `get_daily_question_round_state(target_round_date date)`
- `get_daily_question_stats(target_history_days integer)`
- `ensure_guess_date_round(target_round_date date)`
- `submit_guess_date_answer(target_round_id uuid, guessed_date date)`
- `get_guess_date_round_state(target_round_date date)`
- `ensure_trivia_round(target_round_date date)`
- `submit_trivia_answer(target_round_id uuid, selected_answer text)`
- `get_trivia_round_state(target_round_date date)`
- `has_any_couple()`
- `submit_daily_question_answer(target_round_id uuid, answer_body text)`

## Reminder Service-Role RPCs

These run under cron/service-role context only and are not part of the app-layer contract:

- `enqueue_due_reminder_deliveries()`
- `claim_reminder_deliveries(max_batch_size integer)`
- `invoke_reminder_processor()`
- `configure_phase2_reminder_jobs()`

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
  - stores encrypted `body_encrypted` bytes instead of plaintext note bodies
  - is decrypted only through the unlocked-body RPC after the parent note satisfies `unlock_at <= now()`
- `reminder_deliveries`
  - durable queue/audit table for countdown day-of and future-note unlock emails
  - deduplicates delivery per `(kind, source_id, recipient_user_id)` and tracks retry/failure state

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

## Phase 3 Slice 1 Tables

- `game_rounds`
  - couple-scoped gameplay round rows with `mode`, `round_date`, `prompt_locale`, `prompt_text`, and `prompt_source`
  - `game_mode` currently supports `daily_question`, `guess_date`, and `trivia`
  - `prompt_source` currently supports `openai` and `memory`
  - readable by active couple members; canonical inserts flow through gameplay RPCs
- `game_round_answers`
  - couple-scoped per-user answer rows keyed to a parent `game_round`
  - direct member reads/writes are not part of the runtime contract
  - secure read/reveal behavior flows through gameplay RPCs
  - stores one locked free-text answer per user per round

## Phase 3 Slice 2 Tables

- `game_round_memory_targets`
  - links one `guess_date` round to the source `memories` row selected by SQL
  - direct member reads/writes are not part of the runtime contract
  - secure guess-date read/reveal behavior flows through `get_guess_date_round_state(...)`
- `game_round_answers`
  - also stores one locked ISO date guess per user for `guess_date` rounds in `answer_body`
  - guess bodies remain hidden until all active partners submit

## Phase 3 Slice 3 Tables

- `game_round_trivia_targets`
  - links one `trivia` round to the source `memories` row selected by SQL
  - stores the correct location answer and stable answer options server-side
  - direct member reads/writes are not part of the runtime contract
  - secure trivia read/reveal behavior flows through `get_trivia_round_state(...)`
- `game_round_answers`
  - also stores one locked selected option per user for `trivia` rounds in `answer_body`
  - selected answers and correctness remain hidden until all active partners submit

## Gameplay Stats Timezone Rule

- `get_daily_question_stats(...)` now derives `today` from the saved `couples.timezone` value, not the database/server timezone.
- Streak and recent-history output therefore follow the same couple-local day boundary as the live gameplay routes.

## Remaining Shell-Only Route Impact

- The deprecated `/chat` mock route has been removed and should not be used to justify future schema work.
- `/games/[mode]` still does not justify additional schema outside the delivered `daily_question`, `guess_date`, and `trivia` modes.
