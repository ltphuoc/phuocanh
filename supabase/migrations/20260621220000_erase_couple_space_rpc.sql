-- Member-only, irreversible erasure of the couple space (the data, not the auth users).
-- Removing the single couples row resets the singleton invariant so the members return
-- to pre-onboarding and can re-bootstrap. The storage objects are wiped by the calling
-- Server Action BEFORE this runs (the path list lives in memory_media, which this delete
-- destroys), so the action stays crash-safe / retryable; this RPC is the DB half only.

create or replace function public.erase_couple_space()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_couple_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Resolve the caller's couple from their OWN active membership. DEFINER bypasses RLS,
  -- so this lookup is the load-bearing member gate: a non-member has no active row and
  -- gets NOT_A_MEMBER, deleting nothing.
  select membership.couple_id
  into target_couple_id
  from public.couple_memberships membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
  limit 1;

  if target_couple_id is null then
    raise exception 'NOT_A_MEMBER';
  end if;

  -- Serialize against onboarding bootstrap (same advisory key) and lock the couple row,
  -- so a concurrent bootstrap/accept cannot interleave with this teardown.
  perform pg_advisory_xact_lock(hashtext('bootstrap_first_couple'));
  perform 1 from public.couples where id = target_couple_id for update;

  -- Delete game_rounds FIRST: their *_targets cascade away here, which removes the
  -- ON DELETE RESTRICT references those targets hold to memories. Without this, the
  -- couples cascade below hits those RESTRICT FKs and aborts the whole erase.
  delete from public.game_rounds where couple_id = target_couple_id;

  -- Removing the single couples row cascades the remaining couple-scoped graph
  -- (memberships, invites, memories -> memory_media -> album_items, trips -> albums /
  -- visited_places, checklists -> checklist_items, countdowns, future_notes ->
  -- future_note_contents, wish_items, reminder_deliveries, activity_events).
  delete from public.couples where id = target_couple_id;
end;
$$;

revoke all on function public.erase_couple_space() from public, anon, authenticated, service_role;
grant execute on function public.erase_couple_space() to authenticated;
