create unique index if not exists couples_singleton_idx on public.couples ((true));

create unique index if not exists couple_memberships_active_role_idx
on public.couple_memberships (couple_id, role)
where status = 'active';

create or replace function public.enforce_membership_limit()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select count(*)
  into active_count
  from public.couple_memberships membership
  where membership.couple_id = new.couple_id
    and membership.status = 'active'
    and (tg_op <> 'update' or membership.id <> new.id);

  if active_count >= 2 then
    raise exception 'A couple space can only have two active users.';
  end if;

  return new;
end;
$$;

drop trigger if exists memberships_limit_trigger on public.couple_memberships;

create trigger memberships_limit_insert_trigger
before insert on public.couple_memberships
for each row
execute function public.enforce_membership_limit();

create trigger memberships_limit_update_trigger
before update of status, couple_id on public.couple_memberships
for each row
execute function public.enforce_membership_limit();

drop policy if exists couples_insert on public.couples;
create policy couples_insert on public.couples
for insert
with check (false);

drop policy if exists memberships_insert on public.couple_memberships;
create policy memberships_insert on public.couple_memberships
for insert
with check (false);

drop policy if exists invites_select on public.couple_invites;
create policy invites_select on public.couple_invites
for select
using (public.is_couple_member(couple_id));

drop policy if exists invites_update on public.couple_invites;
create policy invites_update on public.couple_invites
for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

drop policy if exists memories_delete on public.memories;
create policy memories_delete on public.memories
for delete
using (
  public.is_couple_member(couple_id)
  and author_user_id = auth.uid()
);

create or replace function public.bootstrap_first_couple(
  started_date date,
  couple_name text
)
returns table(
  couple_id uuid,
  role public.membership_role,
  started_at date,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user_id uuid;
  existing_couple public.couples%rowtype;
  existing_role public.membership_role;
  created_couple public.couples%rowtype;
begin
  auth_user_id := auth.uid();
  if auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('bootstrap_first_couple'));

  select *
  into existing_couple
  from public.couples
  limit 1;

  if existing_couple.id is not null then
    select membership.role
    into existing_role
    from public.couple_memberships membership
    where membership.couple_id = existing_couple.id
      and membership.user_id = auth_user_id
      and membership.status = 'active'
    limit 1;

    if existing_role is not null then
      return query
      select existing_couple.id, existing_role, existing_couple.started_at, existing_couple.name;
      return;
    end if;

    raise exception 'COUPLE_EXISTS';
  end if;

  insert into public.couples (name, started_at)
  values (nullif(trim(couple_name), ''), started_date)
  returning *
  into created_couple;

  insert into public.couple_memberships (
    user_id,
    couple_id,
    role,
    status,
    joined_at
  )
  values (
    auth_user_id,
    created_couple.id,
    'partner_a',
    'active',
    timezone('utc', now())
  );

  return query
  select created_couple.id, 'partner_a'::public.membership_role, created_couple.started_at, created_couple.name;
end;
$$;

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
    select membership.role
    into assigned_role
    from public.couple_memberships membership
    where membership.couple_id = invite_row.couple_id
      and membership.user_id = auth_user_id
      and membership.status = 'active'
    limit 1;

    update public.couple_invites
    set accepted_at = coalesce(accepted_at, timezone('utc', now())),
        accepted_by_user_id = coalesce(accepted_by_user_id, auth_user_id)
    where id = invite_row.id;

    return query
    select invite_row.couple_id, assigned_role;
    return;
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

create or replace function public.memories_on_this_day(
  target_couple_id uuid,
  target_timezone text default 'Asia/Ho_Chi_Minh'
)
returns setof public.memories
language sql
stable
security invoker
set search_path = public
as $$
  select memory.*
  from public.memories memory
  where memory.couple_id = target_couple_id
    and public.is_couple_member(memory.couple_id)
    and to_char(memory.happened_at at time zone target_timezone, 'MM-DD') =
      to_char(timezone(target_timezone, now()), 'MM-DD')
  order by memory.happened_at desc;
$$;

revoke all on function public.bootstrap_first_couple(date, text) from public;
grant execute on function public.bootstrap_first_couple(date, text) to authenticated;

revoke all on function public.accept_couple_invite(text) from public;
grant execute on function public.accept_couple_invite(text) to authenticated;

revoke all on function public.memories_on_this_day(uuid, text) from public;
grant execute on function public.memories_on_this_day(uuid, text) to authenticated;
