alter table public.memories
add column location_address text null,
add column location_provider text null,
add column location_provider_id text null,
add column location_longitude double precision null,
add column location_latitude double precision null,
add constraint memories_location_coordinates_check check (
  (location_longitude is null and location_latitude is null)
  or (
    location_longitude between -180 and 180
    and location_latitude between -90 and 90
  )
),
add constraint memories_location_provider_length_check check (
  location_provider is null or char_length(location_provider) <= 40
),
add constraint memories_location_provider_id_length_check check (
  location_provider_id is null or char_length(location_provider_id) <= 255
),
add constraint memories_location_address_length_check check (
  location_address is null or char_length(location_address) <= 280
);

alter table public.trips
add column location_name text null,
add column location_address text null,
add column location_provider text null,
add column location_provider_id text null,
add column location_longitude double precision null,
add column location_latitude double precision null,
add constraint trips_location_coordinates_check check (
  (location_longitude is null and location_latitude is null)
  or (
    location_longitude between -180 and 180
    and location_latitude between -90 and 90
  )
),
add constraint trips_location_name_length_check check (
  location_name is null or char_length(location_name) <= 180
),
add constraint trips_location_address_length_check check (
  location_address is null or char_length(location_address) <= 280
),
add constraint trips_location_provider_length_check check (
  location_provider is null or char_length(location_provider) <= 40
),
add constraint trips_location_provider_id_length_check check (
  location_provider_id is null or char_length(location_provider_id) <= 255
);

alter table public.visited_places
add column location_address text null,
add column location_provider text null,
add column location_provider_id text null,
add column location_longitude double precision null,
add column location_latitude double precision null,
add constraint visited_places_location_coordinates_check check (
  (location_longitude is null and location_latitude is null)
  or (
    location_longitude between -180 and 180
    and location_latitude between -90 and 90
  )
),
add constraint visited_places_location_address_length_check check (
  location_address is null or char_length(location_address) <= 280
),
add constraint visited_places_location_provider_length_check check (
  location_provider is null or char_length(location_provider) <= 40
),
add constraint visited_places_location_provider_id_length_check check (
  location_provider_id is null or char_length(location_provider_id) <= 255
);

create index memories_location_coordinates_idx
on public.memories (couple_id, location_latitude, location_longitude)
where location_latitude is not null and location_longitude is not null;

create index trips_location_coordinates_idx
on public.trips (couple_id, location_latitude, location_longitude)
where location_latitude is not null and location_longitude is not null;

create index visited_places_location_coordinates_idx
on public.visited_places (couple_id, location_latitude, location_longitude)
where location_latitude is not null and location_longitude is not null;

drop policy if exists memories_delete on public.memories;
create policy memories_delete on public.memories
for delete
using (public.is_couple_member(couple_id));

drop policy if exists memory_media_delete on public.memory_media;
create policy memory_media_delete on public.memory_media
for delete
using (public.is_couple_member(couple_id));

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
for delete
using (public.is_couple_member(couple_id));

drop policy if exists visited_places_update on public.visited_places;
create policy visited_places_update on public.visited_places
for update
using (public.is_couple_member(couple_id))
with check (
  public.is_couple_member(couple_id)
  and exists (
    select 1
    from public.trips trip
    where trip.id = visited_places.trip_id
      and trip.couple_id = visited_places.couple_id
      and visited_places.visited_on between trip.start_date and trip.end_date
  )
);

drop policy if exists visited_places_delete on public.visited_places;
create policy visited_places_delete on public.visited_places
for delete
using (public.is_couple_member(couple_id));
