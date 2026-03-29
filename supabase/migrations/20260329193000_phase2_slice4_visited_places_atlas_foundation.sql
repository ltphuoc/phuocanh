create table public.visited_places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  title text not null,
  note text null,
  visited_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint visited_places_title_length_check check (char_length(btrim(title)) between 1 and 120),
  constraint visited_places_note_length_check check (
    note is null or char_length(note) <= 800
  )
);

create index visited_places_couple_visited_on_idx
on public.visited_places (couple_id, visited_on desc);

create index visited_places_trip_visited_on_created_at_idx
on public.visited_places (trip_id, visited_on asc, created_at asc);

create trigger visited_places_updated_at_trigger
before update on public.visited_places
for each row
execute function public.set_updated_at();

alter table public.visited_places enable row level security;

create policy visited_places_select on public.visited_places
for select
using (public.is_couple_member(couple_id));

create policy visited_places_insert on public.visited_places
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
      and visited_on between trip.start_date and trip.end_date
  )
);
