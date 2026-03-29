create or replace function public.is_valid_timezone(target_timezone text)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names timezone_name
    where timezone_name.name = target_timezone
  );
$$;

alter table public.couples
add column timezone text not null default 'Asia/Ho_Chi_Minh';

alter table public.couples
add constraint couples_timezone_valid_check
check (public.is_valid_timezone(timezone));

drop function if exists public.bootstrap_first_couple(date, text);

create or replace function public.bootstrap_first_couple(
  started_date date,
  couple_name text
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
  select
    created_couple.id,
    'partner_a'::public.membership_role,
    created_couple.started_at,
    created_couple.name,
    created_couple.timezone;
end;
$$;

revoke all on function public.bootstrap_first_couple(date, text) from public;
grant execute on function public.bootstrap_first_couple(date, text) to authenticated;

create or replace function public.update_couple_timezone(
  target_couple_id uuid,
  target_timezone text
)
returns table(
  couple_id uuid,
  timezone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user_id uuid;
  current_timezone text;
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

  select couple.timezone
  into current_timezone
  from public.couples couple
  where couple.id = target_couple_id
    and public.is_couple_member(couple.id)
  for update;

  if current_timezone is null then
    raise exception 'COUPLE_NOT_FOUND';
  end if;

  if current_timezone = normalized_target_timezone then
    return query
    select target_couple_id, current_timezone;
    return;
  end if;

  update public.countdowns
  set target_at = (((target_at at time zone current_timezone)::date)::timestamp at time zone normalized_target_timezone)
  where couple_id = target_couple_id;

  update public.future_notes
  set unlock_at = (((unlock_at at time zone current_timezone)::date)::timestamp at time zone normalized_target_timezone)
  where couple_id = target_couple_id;

  update public.couples
  set timezone = normalized_target_timezone
  where id = target_couple_id;

  return query
  select target_couple_id, normalized_target_timezone;
end;
$$;

revoke all on function public.update_couple_timezone(uuid, text) from public;
grant execute on function public.update_couple_timezone(uuid, text) to authenticated;

drop policy if exists album_items_insert on public.album_items;

create policy album_items_insert on public.album_items
for insert
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.albums album
    join public.couples couple
      on couple.id = album.couple_id
    join public.trips trip
      on trip.id = album.trip_id
    join public.memory_media media
      on media.id = memory_media_id
    join public.memories memory
      on memory.id = media.memory_id
    where album.id = album_id
      and public.is_couple_member(album.couple_id)
      and media.couple_id = album.couple_id
      and memory.couple_id = album.couple_id
      and (memory.happened_at at time zone couple.timezone)::date between trip.start_date and trip.end_date
  )
);

create or replace function public.create_album_with_items(
  target_trip_id uuid,
  album_title text,
  album_description text,
  selected_memory_media_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_album_id uuid;
  distinct_count integer;
  inserted_count integer;
  provided_count integer;
  target_couple_id uuid;
  target_end_date date;
  target_start_date date;
  target_timezone text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  provided_count := coalesce(array_length(selected_memory_media_ids, 1), 0);
  if provided_count = 0 then
    raise exception 'ALBUM_ITEMS_REQUIRED';
  end if;

  select count(distinct selected_media_id)
  into distinct_count
  from unnest(selected_memory_media_ids) as selected_media_id;

  if distinct_count <> provided_count then
    raise exception 'DUPLICATE_ALBUM_MEDIA';
  end if;

  select trip.couple_id, trip.start_date, trip.end_date, couple.timezone
  into target_couple_id, target_start_date, target_end_date, target_timezone
  from public.trips trip
  join public.couples couple
    on couple.id = trip.couple_id
  where trip.id = target_trip_id
    and public.is_couple_member(trip.couple_id);

  if target_couple_id is null then
    raise exception 'TRIP_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.albums album
    where album.trip_id = target_trip_id
  ) then
    raise exception 'TRIP_ALBUM_ALREADY_EXISTS';
  end if;

  insert into public.albums (
    couple_id,
    trip_id,
    created_by_user_id,
    title,
    description
  )
  values (
    target_couple_id,
    target_trip_id,
    auth.uid(),
    album_title,
    nullif(btrim(album_description), '')
  )
  returning id into created_album_id;

  insert into public.album_items (
    album_id,
    memory_media_id,
    position
  )
  select
    created_album_id,
    media.id,
    selected_media.ordinality::integer
  from unnest(selected_memory_media_ids) with ordinality as selected_media(memory_media_id, ordinality)
  join public.memory_media media
    on media.id = selected_media.memory_media_id
  join public.memories memory
    on memory.id = media.memory_id
  where media.couple_id = target_couple_id
    and memory.couple_id = target_couple_id
    and (memory.happened_at at time zone target_timezone)::date between target_start_date and target_end_date;

  get diagnostics inserted_count = row_count;

  if inserted_count <> provided_count then
    raise exception 'INVALID_ALBUM_MEDIA_SELECTION';
  end if;

  return created_album_id;
end;
$$;

create or replace function public.add_album_items(
  target_album_id uuid,
  selected_memory_media_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_max_position integer;
  distinct_count integer;
  inserted_count integer;
  provided_count integer;
  target_couple_id uuid;
  target_end_date date;
  target_start_date date;
  target_timezone text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  provided_count := coalesce(array_length(selected_memory_media_ids, 1), 0);
  if provided_count = 0 then
    raise exception 'ALBUM_ITEMS_REQUIRED';
  end if;

  select count(distinct selected_media_id)
  into distinct_count
  from unnest(selected_memory_media_ids) as selected_media_id;

  if distinct_count <> provided_count then
    raise exception 'DUPLICATE_ALBUM_MEDIA';
  end if;

  select
    album.couple_id,
    trip.start_date,
    trip.end_date,
    couple.timezone,
    coalesce(max(existing_item.position), 0)
  into target_couple_id, target_start_date, target_end_date, target_timezone, current_max_position
  from public.albums album
  join public.couples couple
    on couple.id = album.couple_id
  join public.trips trip
    on trip.id = album.trip_id
  left join public.album_items existing_item
    on existing_item.album_id = album.id
  where album.id = target_album_id
    and public.is_couple_member(album.couple_id)
  group by album.couple_id, trip.start_date, trip.end_date, couple.timezone;

  if target_couple_id is null then
    raise exception 'ALBUM_NOT_FOUND';
  end if;

  insert into public.album_items (
    album_id,
    memory_media_id,
    position
  )
  select
    target_album_id,
    media.id,
    current_max_position + selected_media.ordinality::integer
  from unnest(selected_memory_media_ids) with ordinality as selected_media(memory_media_id, ordinality)
  join public.memory_media media
    on media.id = selected_media.memory_media_id
  join public.memories memory
    on memory.id = media.memory_id
  where media.couple_id = target_couple_id
    and memory.couple_id = target_couple_id
    and (memory.happened_at at time zone target_timezone)::date between target_start_date and target_end_date
    and not exists (
      select 1
      from public.album_items existing_item
      where existing_item.album_id = target_album_id
        and existing_item.memory_media_id = media.id
    );

  get diagnostics inserted_count = row_count;

  if inserted_count <> provided_count then
    raise exception 'INVALID_ALBUM_MEDIA_SELECTION';
  end if;

  return inserted_count;
end;
$$;
