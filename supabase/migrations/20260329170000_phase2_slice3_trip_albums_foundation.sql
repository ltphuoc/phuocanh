create table public.albums (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  trip_id uuid not null unique references public.trips (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  title text not null,
  description text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint albums_title_length_check check (char_length(btrim(title)) between 1 and 120),
  constraint albums_description_length_check check (
    description is null or char_length(description) <= 800
  )
);

create table public.album_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  memory_media_id uuid not null references public.memory_media (id) on delete cascade,
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint album_items_album_media_unique unique (album_id, memory_media_id),
  constraint album_items_position_check check (position > 0)
);

create index albums_couple_created_at_idx on public.albums (couple_id, created_at desc);
create index album_items_album_position_idx on public.album_items (album_id, position asc);

create trigger albums_updated_at_trigger
before update on public.albums
for each row
execute function public.set_updated_at();

create or replace function public.enforce_album_has_items()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.album_items item
    where item.album_id = new.id
  ) then
    raise exception 'ALBUM_ITEMS_REQUIRED';
  end if;

  return new;
end;
$$;

create constraint trigger albums_require_items_trigger
after insert on public.albums
deferrable initially deferred
for each row
execute function public.enforce_album_has_items();

alter table public.albums enable row level security;
alter table public.album_items enable row level security;

create policy albums_select on public.albums
for select
using (public.is_couple_member(couple_id));

create policy albums_insert on public.albums
for insert
with check (
  auth.uid() is not null
  and public.is_couple_member(couple_id)
  and created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.trips trip
    where trip.id = trip_id
      and trip.couple_id = couple_id
  )
);

create policy album_items_select on public.album_items
for select
using (
  exists (
    select 1
    from public.albums album
    where album.id = album_id
      and public.is_couple_member(album.couple_id)
  )
);

create policy album_items_insert on public.album_items
for insert
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.albums album
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
      and timezone('utc', memory.happened_at)::date between trip.start_date and trip.end_date
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
  inserted_count integer;
  provided_count integer;
  distinct_count integer;
  target_couple_id uuid;
  target_end_date date;
  target_start_date date;
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

  select trip.couple_id, trip.start_date, trip.end_date
  into target_couple_id, target_start_date, target_end_date
  from public.trips trip
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
    and timezone('utc', memory.happened_at)::date between target_start_date and target_end_date;

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
    coalesce(max(existing_item.position), 0)
  into target_couple_id, target_start_date, target_end_date, current_max_position
  from public.albums album
  join public.trips trip
    on trip.id = album.trip_id
  left join public.album_items existing_item
    on existing_item.album_id = album.id
  where album.id = target_album_id
    and public.is_couple_member(album.couple_id)
  group by album.couple_id, trip.start_date, trip.end_date;

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
    and timezone('utc', memory.happened_at)::date between target_start_date and target_end_date
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
