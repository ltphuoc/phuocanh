-- Recreate accept_couple_invite so an already-active member opening an unused
-- invite no longer burns the token.
--
-- Previously, when the caller was already an active member the RPC stamped
-- accepted_at/accepted_by_user_id and returned the role. That meant the creator
-- (partner_a) opening their own invite link consumed the token, permanently
-- locking out the real invitee (partner_b). The opening `accepted_at is null`
-- filter means this branch is only reachable for an UNUSED invite (creator
-- self-open or another existing member), so the fix is simply: do not consume the
-- token -- raise a distinct INVITE_ALREADY_MEMBER signal the app surfaces as a
-- friendly notice. Every other branch is unchanged.

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
