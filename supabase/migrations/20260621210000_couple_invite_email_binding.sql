-- Bind couple invites to a specific partner email so a bare-token link cannot be
-- claimed by any authenticated user who happens to have it (which would permanently
-- lock out the intended invitee). accept_couple_invite hard-rejects on email mismatch.
--
-- 1. Add invited_email. New app inserts always set lower(btrim(email)); the column is
--    nullable only so the cutover below can identify pre-binding rows.
-- 2. Cutover: force-expire every currently-unconsumed UNBOUND invite, so no pre-binding
--    bare-token link survives its remaining 14-day window. This runs once, here.
-- 3. Recreate accept_couple_invite with the mismatch gate evaluated BEFORE the
--    couple-full gate, so a wrong-email stranger learns "mismatch", never occupancy.
--    The accepter email is read from auth.users (a DEFINER-only source), never from
--    caller input, so it cannot be spoofed or enumerated.

alter table public.couple_invites
  add column if not exists invited_email text;

update public.couple_invites
set expires_at = now()
where accepted_at is null
  and invited_email is null;

create or replace function public.accept_couple_invite(invite_token text)
returns table(
  couple_id uuid,
  role public.membership_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user_id uuid;
  invite_row public.couple_invites%rowtype;
  assigned_role public.membership_role;
  active_count integer;
  accepter_email text;
begin
  auth_user_id := auth.uid();
  if auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into invite_row
  from public.couple_invites invite
  where invite.token = invite_token
    and invite.accepted_at is null
  limit 1
  for update;

  if invite_row.id is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  if invite_row.expires_at < timezone('utc', now()) then
    raise exception 'INVITE_EXPIRED';
  end if;

  if exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.user_id = auth_user_id
      and membership.status = 'active'
  ) then
    -- Caller is already an active member of this couple. Reachable only for an
    -- unused invite (the opening select filters accepted_at is null) -- the creator
    -- opening their own link, or another existing member. Do NOT consume the token;
    -- raise a distinct signal so the real invitee can still use it.
    raise exception 'INVITE_ALREADY_MEMBER';
  end if;

  -- Identity gate BEFORE the couple-full gate: a wrong-email stranger must learn
  -- "mismatch", not whether the couple has a free seat. Email comes from auth.users
  -- (DEFINER-only), normalized on both sides so case/whitespace never falsely rejects.
  select lower(btrim(email))
  into accepter_email
  from auth.users
  where id = auth_user_id;

  -- A bound invite requires a matching accepter email. accepter_email is null only for
  -- an email-less identity (phone/OAuth, currently disabled); reject that too, because
  -- `invited_email <> null` is NULL (not true) and would otherwise silently accept.
  if invite_row.invited_email is not null
     and (accepter_email is null
          or lower(btrim(invite_row.invited_email)) <> accepter_email) then
    raise exception 'INVITE_EMAIL_MISMATCH';
  end if;

  select count(*)
  into active_count
  from public.couple_memberships membership
  where membership.couple_id = invite_row.couple_id
    and membership.status = 'active';

  if active_count >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  if exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.role = 'partner_a'
      and membership.status = 'active'
  ) and not exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.role = 'partner_b'
      and membership.status = 'active'
  ) then
    assigned_role := 'partner_b';
  elsif exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.role = 'partner_b'
      and membership.status = 'active'
  ) and not exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.role = 'partner_a'
      and membership.status = 'active'
  ) then
    assigned_role := 'partner_a';
  elsif not exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.role = 'partner_a'
      and membership.status = 'active'
  ) then
    assigned_role := 'partner_a';
  elsif not exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.role = 'partner_b'
      and membership.status = 'active'
  ) then
    assigned_role := 'partner_b';
  else
    raise exception 'COUPLE_FULL';
  end if;

  begin
    insert into public.couple_memberships (
      user_id,
      couple_id,
      role,
      status,
      joined_at
    )
    values (
      auth_user_id,
      invite_row.couple_id,
      assigned_role,
      'active',
      timezone('utc', now())
    );
  exception
    when unique_violation then
      -- A concurrent first-accept won the active-role unique index between the guard
      -- above and this insert. Surface the same COUPLE_FULL signal so the loser gets
      -- the friendly "couple is full" notice rather than a raw unexpected error.
      raise exception 'COUPLE_FULL';
    when raise_exception then
      -- The couple_memberships max-2-active trigger fired (the competing accept
      -- committed first), which raises a plain message rather than a unique_violation.
      -- Map that loser path to COUPLE_FULL too; re-raise anything unexpected unchanged.
      if sqlerrm like '%two active users%' then
        raise exception 'COUPLE_FULL';
      end if;
      raise;
  end;

  update public.couple_invites
  set accepted_at = timezone('utc', now()),
      accepted_by_user_id = auth_user_id
  where id = invite_row.id;

  return query
  select invite_row.couple_id, assigned_role;
end;
$$;

revoke all on function public.accept_couple_invite(text) from public, anon, authenticated, service_role;
grant execute on function public.accept_couple_invite(text) to authenticated;
