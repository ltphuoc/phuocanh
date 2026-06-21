-- Recreate accept_couple_invite so the loser of a concurrent second-member race
-- surfaces COUPLE_FULL instead of a raw unique-violation.
--
-- Two valid first-accepts can both pass the early active-count guard (both reading
-- active_count = 1) in the TOCTOU window before either commits, both assign the same
-- role (partner_b), and the loser then collides on the partial unique index
-- couple_memberships_active_role_idx, raising unique_violation (SQLSTATE 23505). The
-- app's error map does not match the raw 23505, so the loser previously saw a generic
-- unexpected error. Wrapping the membership insert in a handler that re-raises
-- COUPLE_FULL maps it to the same friendly "couple is full" notice the guard produces.
-- Data integrity is unchanged: the loser is still correctly rejected.
--
-- Body is identical to the previous definition except for the insert block's handler.

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
