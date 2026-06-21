-- Explicit Data API grants for the public tables the app reaches through PostgREST.
--
-- Supabase is moving the platform default to STOP auto-granting anon/authenticated
-- on new public tables (Data API exposure becomes opt-in; applied to all projects
-- 2026-10-30). The local Supabase CLI already provisions tables created by the
-- `postgres` role (the role migrations run as) without select/insert/update/delete,
-- so the app's direct table reads 500 with "permission denied" until granted.
--
-- This migration makes the exposure explicit (the secure-by-default pattern Supabase
-- recommends): grant only the tables the app/edge function actually use, and only to
-- the roles that use them. RLS is already enabled on every table by its creating
-- migration and remains the row/command gate; tables omitted here (future_note_contents,
-- game_round_answers, game_round_memory_targets, game_round_trivia_targets) stay
-- Data-API-invisible (RPC-only). It is additive and idempotent on the deployed project,
-- which already carries these grants from its creation-time default.
--
-- Going forward, every NEW public table must ship its own grant + RLS + policies in
-- the same migration (see docs/development-verification.md).

-- Couple context: read-only for the app; all writes go through SECURITY DEFINER RPCs
-- (bootstrap_first_couple / accept_couple_invite / update_couple_timezone). The
-- service-role admin client reads `couples` for a schema-readiness probe.
grant select on table public.couples            to authenticated, service_role;
grant select on table public.couple_memberships to authenticated, service_role;

-- Gameplay rounds are read directly for state; inserts/updates/deletes stay RPC-only
-- (DML already revoked from anon/authenticated in 20260402143000).
grant select on table public.game_rounds        to authenticated, service_role;

-- App-managed content tables. RLS policies gate which rows/commands actually succeed.
grant select, insert, update, delete on table public.activity_events to authenticated, service_role;
grant select, insert, update, delete on table public.albums          to authenticated, service_role;
grant select, insert, update, delete on table public.album_items     to authenticated, service_role;
grant select, insert, update, delete on table public.checklists      to authenticated, service_role;
grant select, insert, update, delete on table public.checklist_items to authenticated, service_role;
grant select, insert, update, delete on table public.countdowns      to authenticated, service_role;
grant select, insert, update, delete on table public.couple_invites  to authenticated, service_role;
grant select, insert, update, delete on table public.future_notes    to authenticated, service_role;
grant select, insert, update, delete on table public.memories        to authenticated, service_role;
grant select, insert, update, delete on table public.memory_media    to authenticated, service_role;
grant select, insert, update, delete on table public.trips           to authenticated, service_role;
grant select, insert, update, delete on table public.visited_places  to authenticated, service_role;
grant select, insert, update, delete on table public.wish_items      to authenticated, service_role;

-- Reminder deliveries are written only by the reminder Edge Function (service_role).
grant select, insert, update, delete on table public.reminder_deliveries to service_role;
