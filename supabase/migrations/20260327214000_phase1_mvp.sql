create extension if not exists pgcrypto with schema extensions;

create type public.membership_role as enum ('partner_a', 'partner_b');
create type public.membership_status as enum ('active', 'inactive');
create type public.media_type as enum ('image', 'video');
create type public.wish_category as enum ('place', 'food', 'movie');
create type public.wish_status as enum ('pending', 'done');

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text null,
  started_at date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.couple_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  joined_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, user_id)
);

create table public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  token text not null unique,
  invited_by_user_id uuid not null references auth.users (id) on delete cascade,
  accepted_by_user_id uuid null references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  note text null,
  location_name text null,
  happened_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.memory_media (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  memory_id uuid not null references public.memories (id) on delete cascade,
  storage_path text not null,
  media_type public.media_type not null,
  mime_type text not null,
  size_bytes bigint not null,
  original_file_name text null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.wish_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  category public.wish_category not null,
  title text not null,
  note text null,
  status public.wish_status not null default 'pending',
  completed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  text text not null,
  is_done boolean not null default false,
  done_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index memories_couple_happened_at_idx on public.memories (couple_id, happened_at desc);
create index memory_media_memory_id_idx on public.memory_media (memory_id);
create index wish_items_couple_status_idx on public.wish_items (couple_id, status);
create index checklist_items_checklist_id_idx on public.checklist_items (checklist_id);
create index couple_invites_token_idx on public.couple_invites (token);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = target_couple_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.enforce_membership_limit()
returns trigger
language plpgsql
as $$
declare
  active_count integer;
begin
  select count(*)
  into active_count
  from public.couple_memberships membership
  where membership.couple_id = new.couple_id
    and membership.status = 'active';

  if active_count >= 2 and new.status = 'active' then
    raise exception 'A couple space can only have two active users.';
  end if;

  return new;
end;
$$;

create trigger couples_updated_at_trigger
before update on public.couples
for each row
execute function public.set_updated_at();

create trigger memberships_updated_at_trigger
before update on public.couple_memberships
for each row
execute function public.set_updated_at();

create trigger memories_updated_at_trigger
before update on public.memories
for each row
execute function public.set_updated_at();

create trigger wish_items_updated_at_trigger
before update on public.wish_items
for each row
execute function public.set_updated_at();

create trigger checklists_updated_at_trigger
before update on public.checklists
for each row
execute function public.set_updated_at();

create trigger checklist_items_updated_at_trigger
before update on public.checklist_items
for each row
execute function public.set_updated_at();

create trigger memberships_limit_trigger
before insert on public.couple_memberships
for each row
execute function public.enforce_membership_limit();

alter table public.couples enable row level security;
alter table public.couple_memberships enable row level security;
alter table public.couple_invites enable row level security;
alter table public.memories enable row level security;
alter table public.memory_media enable row level security;
alter table public.wish_items enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.activity_events enable row level security;

create policy couples_select on public.couples
for select
using (public.is_couple_member(id));

create policy couples_insert on public.couples
for insert
with check (auth.role() = 'authenticated');

create policy couples_update on public.couples
for update
using (public.is_couple_member(id))
with check (public.is_couple_member(id));

create policy memberships_select on public.couple_memberships
for select
using (auth.uid() = user_id or public.is_couple_member(couple_id));

create policy memberships_insert on public.couple_memberships
for insert
with check (auth.uid() = user_id);

create policy memberships_update on public.couple_memberships
for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy invites_select on public.couple_invites
for select
using (
  public.is_couple_member(couple_id)
  or accepted_by_user_id = auth.uid()
);

create policy invites_insert on public.couple_invites
for insert
with check (
  public.is_couple_member(couple_id)
  and invited_by_user_id = auth.uid()
);

create policy invites_update on public.couple_invites
for update
using (
  public.is_couple_member(couple_id)
  or accepted_by_user_id = auth.uid()
)
with check (
  public.is_couple_member(couple_id)
  or accepted_by_user_id = auth.uid()
);

create policy memories_select on public.memories
for select
using (public.is_couple_member(couple_id));

create policy memories_insert on public.memories
for insert
with check (
  public.is_couple_member(couple_id)
  and author_user_id = auth.uid()
);

create policy memories_update on public.memories
for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy memory_media_select on public.memory_media
for select
using (public.is_couple_member(couple_id));

create policy memory_media_insert on public.memory_media
for insert
with check (public.is_couple_member(couple_id));

create policy memory_media_update on public.memory_media
for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy wish_items_select on public.wish_items
for select
using (public.is_couple_member(couple_id));

create policy wish_items_insert on public.wish_items
for insert
with check (
  public.is_couple_member(couple_id)
  and created_by_user_id = auth.uid()
);

create policy wish_items_update on public.wish_items
for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy checklists_select on public.checklists
for select
using (public.is_couple_member(couple_id));

create policy checklists_insert on public.checklists
for insert
with check (public.is_couple_member(couple_id));

create policy checklists_update on public.checklists
for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

create policy checklist_items_select on public.checklist_items
for select
using (
  exists (
    select 1
    from public.checklists checklist
    where checklist.id = checklist_items.checklist_id
      and public.is_couple_member(checklist.couple_id)
  )
);

create policy checklist_items_insert on public.checklist_items
for insert
with check (
  exists (
    select 1
    from public.checklists checklist
    where checklist.id = checklist_items.checklist_id
      and public.is_couple_member(checklist.couple_id)
  )
);

create policy checklist_items_update on public.checklist_items
for update
using (
  exists (
    select 1
    from public.checklists checklist
    where checklist.id = checklist_items.checklist_id
      and public.is_couple_member(checklist.couple_id)
  )
)
with check (
  exists (
    select 1
    from public.checklists checklist
    where checklist.id = checklist_items.checklist_id
      and public.is_couple_member(checklist.couple_id)
  )
);

create policy activity_events_select on public.activity_events
for select
using (public.is_couple_member(couple_id));

create policy activity_events_insert on public.activity_events
for insert
with check (
  public.is_couple_member(couple_id)
  and actor_user_id = auth.uid()
);

insert into storage.buckets (id, name, public)
values ('memory-media', 'memory-media', false)
on conflict (id) do nothing;

create policy memory_media_storage_select on storage.objects
for select
using (
  bucket_id = 'memory-media'
  and split_part(name, '/', 1) = 'couples'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);

create policy memory_media_storage_insert on storage.objects
for insert
with check (
  bucket_id = 'memory-media'
  and split_part(name, '/', 1) = 'couples'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);

create policy memory_media_storage_update on storage.objects
for update
using (
  bucket_id = 'memory-media'
  and split_part(name, '/', 1) = 'couples'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
)
with check (
  bucket_id = 'memory-media'
  and split_part(name, '/', 1) = 'couples'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);

create policy memory_media_storage_delete on storage.objects
for delete
using (
  bucket_id = 'memory-media'
  and split_part(name, '/', 1) = 'couples'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);
