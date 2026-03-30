drop function if exists public.bootstrap_first_couple(date, text);

create or replace function public.bootstrap_first_couple(
  started_date date,
  couple_name text,
  target_timezone text default 'Asia/Ho_Chi_Minh'
)
returns table(
  couple_id uuid,
  role public.membership_role,
  started_at date,
  name text,
  timezone text
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
  normalized_target_timezone text;
begin
  auth_user_id := auth.uid();
  if auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  normalized_target_timezone := nullif(btrim(target_timezone), '');
  if normalized_target_timezone is null or not public.is_valid_timezone(normalized_target_timezone) then
    raise exception 'INVALID_TIMEZONE';
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
      select
        existing_couple.id,
        existing_role,
        existing_couple.started_at,
        existing_couple.name,
        existing_couple.timezone;
      return;
    end if;

    raise exception 'COUPLE_EXISTS';
  end if;

  insert into public.couples (name, started_at, timezone)
  values (
    nullif(trim(couple_name), ''),
    started_date,
    normalized_target_timezone
  )
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
  select
    created_couple.id,
    'partner_a'::public.membership_role,
    created_couple.started_at,
    created_couple.name,
    created_couple.timezone;
end;
$$;

revoke all on function public.bootstrap_first_couple(date, text, text) from public;
grant execute on function public.bootstrap_first_couple(date, text, text) to authenticated;
