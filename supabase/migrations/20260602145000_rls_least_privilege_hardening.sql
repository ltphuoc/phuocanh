-- Least-privilege hardening for couple-scoped tables.
--
-- 1. couple_memberships UPDATE: a member could previously edit ANY row in their
--    couple (including the partner's), because the policy only checked couple
--    membership. Scope it to the caller's own row so nobody can deactivate or
--    rewrite their partner's membership. Membership creation/transition still
--    flows exclusively through the SECURITY DEFINER bootstrap/accept-invite RPCs,
--    which bypass RLS, so legitimate flows are unaffected (the app only SELECTs
--    this table directly).
-- 2. albums DELETE: RLS is enabled on public.albums with only select/insert
--    policies, so empty-album cleanup silently matched zero rows. Add a delete
--    policy scoped to couple membership so orphaned albums are actually removed.
-- 3. couples.timezone: timezone must only change through
--    update_couple_timezone(), which rewrites reminder due-dates to preserve the
--    wall-clock. A direct UPDATE from app code would desync reminders. Block
--    direct timezone changes from app roles via a trigger; the SECURITY DEFINER
--    RPC runs as the function owner and is therefore exempt. Other columns
--    (name, started_at) stay directly updatable.

-- 1. Membership UPDATE limited to the caller's own row.
drop policy if exists memberships_update on public.couple_memberships;

create policy memberships_update on public.couple_memberships
for update
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- 2. Allow couple members to delete their own albums (enables empty-album cleanup).
drop policy if exists albums_delete on public.albums;

create policy albums_delete on public.albums
for delete
using (public.is_couple_member(couple_id));

-- 3. Force timezone changes through update_couple_timezone().
create or replace function public.reject_direct_couple_timezone_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- update_couple_timezone() is SECURITY DEFINER and runs as the function owner;
  -- direct table writes from the app run as the authenticated/anon roles. Reject
  -- timezone changes from those roles so the wall-clock-preserving RPC stays the
  -- only mutation path.
  if new.timezone is distinct from old.timezone
     and current_user in ('authenticated', 'anon') then
    raise exception 'TIMEZONE_UPDATE_REQUIRES_RPC';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_direct_couple_timezone_update()
  from public, anon, authenticated, service_role;

drop trigger if exists couples_reject_direct_timezone_update on public.couples;

create trigger couples_reject_direct_timezone_update
before update on public.couples
for each row
execute function public.reject_direct_couple_timezone_update();
