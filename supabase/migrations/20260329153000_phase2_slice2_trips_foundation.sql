create table public.trips (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete restrict,
  title text not null,
  note text null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trips_title_length_check check (char_length(btrim(title)) between 1 and 120),
  constraint trips_note_length_check check (note is null or char_length(note) <= 2000),
  constraint trips_date_range_check check (end_date >= start_date)
);

create index trips_couple_start_date_idx on public.trips (couple_id, start_date asc);

create trigger trips_updated_at_trigger
before update on public.trips
for each row
execute function public.set_updated_at();

alter table public.trips enable row level security;

create policy trips_select on public.trips
for select
using (public.is_couple_member(couple_id));

create policy trips_insert on public.trips
for insert
with check (
  auth.uid() is not null
  and public.is_couple_member(couple_id)
  and created_by_user_id = auth.uid()
);
