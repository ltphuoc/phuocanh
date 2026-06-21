-- LOCAL DEV / TEST SEED ONLY.
--
-- supabase/seed.sql runs on `supabase db reset` (local dev and `pnpm test:e2e`)
-- but is NOT applied by `supabase db push`, so nothing here touches the deployed
-- project.
--
-- Why this exists: the deployed Supabase project received the standard base table
-- grants for anon/authenticated/service_role at creation time, but the local
-- Supabase CLI no longer provisions them on `db reset` (public tables come up with
-- TRUNCATE/REFERENCES/TRIGGER only -- no SELECT/INSERT/UPDATE/DELETE). Without these
-- grants the app's direct table reads (e.g. src/lib/server/couple-context.ts) get
-- "permission denied for table ..." and `pnpm test:e2e` fails at auth.setup.
--
-- Safety: all public tables have RLS enabled (deny-by-default), so these broad
-- grants are gated by RLS exactly as in production. RPC-only / encrypted tables
-- (future_note_contents, game_round_answers, game_round_*_targets) keep RLS on with
-- no read policy and stay locked. The game-table revokes below mirror the
-- migrations so the local grant model matches production.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Mirror the gameplay-hardening revokes from the migrations: anon/authenticated
-- mutate game tables only through SECURITY DEFINER RPCs.
revoke insert, update, delete on table public.game_rounds from anon, authenticated;
revoke all on table public.game_round_answers from anon, authenticated;
revoke all on table public.game_round_memory_targets from anon, authenticated;
revoke all on table public.game_round_trivia_targets from anon, authenticated;
