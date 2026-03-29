create type public.countdown_kind as enum ('anniversary', 'birthday', 'travel', 'plan', 'custom');

create table public.countdowns (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  note text null,
  kind public.countdown_kind not null default 'custom',
  target_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.future_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  unlock_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.future_note_contents (
  future_note_id uuid primary key references public.future_notes (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index countdowns_couple_target_at_idx on public.countdowns (couple_id, target_at asc);
create index future_notes_couple_unlock_at_idx on public.future_notes (couple_id, unlock_at asc);

create trigger countdowns_updated_at_trigger
before update on public.countdowns
for each row
execute function public.set_updated_at();

create trigger future_notes_updated_at_trigger
before update on public.future_notes
for each row
execute function public.set_updated_at();

alter table public.countdowns enable row level security;
alter table public.future_notes enable row level security;
alter table public.future_note_contents enable row level security;

create policy countdowns_select on public.countdowns
for select
using (public.is_couple_member(couple_id));

create policy countdowns_insert on public.countdowns
for insert
with check (
  auth.uid() is not null
  and public.is_couple_member(couple_id)
  and created_by_user_id = auth.uid()
);

create policy future_notes_select on public.future_notes
for select
using (public.is_couple_member(couple_id));

create policy future_notes_insert on public.future_notes
for insert
with check (
  auth.uid() is not null
  and public.is_couple_member(couple_id)
  and created_by_user_id = auth.uid()
);

create policy future_notes_delete on public.future_notes
for delete
using (
  auth.uid() is not null
  and public.is_couple_member(couple_id)
  and created_by_user_id = auth.uid()
);

create policy future_note_contents_select on public.future_note_contents
for select
using (
  exists (
    select 1
    from public.future_notes note
    where note.id = future_note_id
      and public.is_couple_member(note.couple_id)
      and note.unlock_at <= now()
  )
);

create policy future_note_contents_insert on public.future_note_contents
for insert
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.future_notes note
    where note.id = future_note_id
      and public.is_couple_member(note.couple_id)
      and note.created_by_user_id = auth.uid()
  )
);
