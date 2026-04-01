create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (
    select 1
    from pg_available_extensions
    where name = 'vault'
  ) then
    execute 'create extension if not exists vault';
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.secret_fallbacks (
  name text primary key,
  secret_value text not null,
  description text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists secret_fallbacks_updated_at_trigger on private.secret_fallbacks;
create trigger secret_fallbacks_updated_at_trigger
before update on private.secret_fallbacks
for each row
execute function public.set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'reminder_kind'
  ) THEN
    CREATE TYPE public.reminder_kind AS ENUM ('countdown_day_of', 'future_note_unlock');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'reminder_delivery_status'
  ) THEN
    CREATE TYPE public.reminder_delivery_status AS ENUM ('pending', 'processing', 'sent', 'failed');
  END IF;
END $$;

create or replace function private.is_vault_available()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from pg_extension
    where extname = 'vault'
  );
$$;

create or replace function private.upsert_secret_fallback(
  secret_name text,
  secret_value text,
  secret_description text default null
)
returns void
language plpgsql
security definer
set search_path = private, public
as $$
begin
  insert into private.secret_fallbacks (
    name,
    secret_value,
    description
  )
  values (
    secret_name,
    secret_value,
    secret_description
  )
  on conflict (name) do update
  set
    description = excluded.description,
    secret_value = excluded.secret_value,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function private.get_secret(secret_name text)
returns text
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  fallback_secret_value text;
  vault_secret_value text;
begin
  if private.is_vault_available() then
    execute
      'select decrypted_secret
       from vault.decrypted_secrets
       where name = $1
       limit 1'
    into vault_secret_value
    using secret_name;

    if vault_secret_value is not null then
      return vault_secret_value;
    end if;
  end if;

  select secret_fallback.secret_value
  into fallback_secret_value
  from private.secret_fallbacks secret_fallback
  where secret_fallback.name = secret_name
  limit 1;

  return fallback_secret_value;
end;
$$;

create or replace function private.ensure_future_note_encryption_key()
returns void
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  generated_key text;
begin
  if private.get_secret('future_note_encryption_key') is not null then
    return;
  end if;

  generated_key := encode(extensions.gen_random_bytes(32), 'base64');

  if private.is_vault_available() then
    execute
      'select vault.create_secret($1, $2, $3)'
    using
      generated_key,
      'future_note_encryption_key',
      'Phase 2 future note encryption key';

    return;
  end if;

  perform private.upsert_secret_fallback(
    'future_note_encryption_key',
    generated_key,
    'Phase 2 future note encryption key'
  );
end;
$$;

create or replace function private.encrypt_future_note_body(plain_body text)
returns bytea
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  encryption_key text;
begin
  if plain_body is null then
    return null;
  end if;

  encryption_key := private.get_secret('future_note_encryption_key');
  if encryption_key is null then
    raise exception 'FUTURE_NOTE_ENCRYPTION_KEY_MISSING';
  end if;

  return extensions.pgp_sym_encrypt(
    plain_body,
    encryption_key,
    'cipher-algo=aes256,unicode-mode=1,sess-key=1'
  );
end;
$$;

create or replace function private.decrypt_future_note_body(encrypted_body bytea)
returns text
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  encryption_key text;
begin
  if encrypted_body is null then
    return null;
  end if;

  encryption_key := private.get_secret('future_note_encryption_key');
  if encryption_key is null then
    raise exception 'FUTURE_NOTE_ENCRYPTION_KEY_MISSING';
  end if;

  return extensions.pgp_sym_decrypt(
    encrypted_body,
    encryption_key
  );
end;
$$;

revoke all on table private.secret_fallbacks from public, anon, authenticated;
revoke all on function private.is_vault_available() from public, anon, authenticated;
revoke all on function private.upsert_secret_fallback(text, text, text) from public, anon, authenticated;
revoke all on function private.get_secret(text) from public, anon, authenticated;
revoke all on function private.ensure_future_note_encryption_key() from public, anon, authenticated;
revoke all on function private.encrypt_future_note_body(text) from public, anon, authenticated;
revoke all on function private.decrypt_future_note_body(bytea) from public, anon, authenticated;

select private.ensure_future_note_encryption_key();

alter table public.future_note_contents
add column if not exists body_encrypted bytea;

update public.future_note_contents
set body_encrypted = private.encrypt_future_note_body(body)
where body is not null
  and body_encrypted is null;

alter table public.future_note_contents
alter column body_encrypted set not null;

alter table public.future_note_contents
drop column if exists body;

drop policy if exists future_note_contents_select on public.future_note_contents;
drop policy if exists future_note_contents_insert on public.future_note_contents;

create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_email text not null,
  kind public.reminder_kind not null,
  source_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  due_at timestamptz not null,
  not_before timestamptz not null default timezone('utc', now()),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  status public.reminder_delivery_status not null default 'pending',
  provider_message_id text null,
  processing_started_at timestamptz null,
  sent_at timestamptz null,
  failed_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (kind, source_id, recipient_user_id)
);

create index reminder_deliveries_status_not_before_idx
on public.reminder_deliveries (status, not_before asc, due_at asc)
where status in ('pending', 'processing');

create index reminder_deliveries_couple_id_idx
on public.reminder_deliveries (couple_id, created_at desc);

create index reminder_deliveries_source_idx
on public.reminder_deliveries (source_id, kind);

create trigger reminder_deliveries_updated_at_trigger
before update on public.reminder_deliveries
for each row
execute function public.set_updated_at();

alter table public.reminder_deliveries enable row level security;

create or replace function public.create_future_note_with_body(
  note_title text,
  note_unlock_at timestamptz,
  note_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  current_couple_id uuid;
  current_user_id uuid;
  created_future_note_id uuid;
  normalized_body text;
  normalized_title text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select membership.couple_id
  into current_couple_id
  from public.couple_memberships membership
  where membership.user_id = current_user_id
    and membership.status = 'active'
  limit 1;

  if current_couple_id is null then
    raise exception 'COUPLE_CONTEXT_NOT_READY';
  end if;

  normalized_title := btrim(coalesce(note_title, ''));
  normalized_body := btrim(coalesce(note_body, ''));

  if normalized_title = '' or char_length(normalized_title) > 120 then
    raise exception 'INVALID_FUTURE_NOTE_TITLE';
  end if;

  if normalized_body = '' or char_length(normalized_body) > 2000 then
    raise exception 'INVALID_FUTURE_NOTE_BODY';
  end if;

  if note_unlock_at is null then
    raise exception 'INVALID_FUTURE_NOTE_UNLOCK_AT';
  end if;

  insert into public.future_notes (
    couple_id,
    created_by_user_id,
    title,
    unlock_at
  )
  values (
    current_couple_id,
    current_user_id,
    normalized_title,
    note_unlock_at
  )
  returning id into created_future_note_id;

  insert into public.future_note_contents (
    future_note_id,
    body_encrypted
  )
  values (
    created_future_note_id,
    private.encrypt_future_note_body(normalized_body)
  );

  return created_future_note_id;
end;
$$;

create or replace function public.get_unlocked_future_note_contents(target_couple_id uuid)
returns table (
  future_note_id uuid,
  body text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_couple_member(target_couple_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    content.future_note_id,
    private.decrypt_future_note_body(content.body_encrypted) as body
  from public.future_note_contents content
  inner join public.future_notes note
    on note.id = content.future_note_id
  where note.couple_id = target_couple_id
    and note.unlock_at <= now();
end;
$$;

create or replace function public.enqueue_due_reminder_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  with active_members as (
    select
      membership.couple_id,
      membership.user_id as recipient_user_id,
      "user".email as recipient_email
    from public.couple_memberships membership
    inner join auth.users "user"
      on "user".id = membership.user_id
    where membership.status = 'active'
      and "user".email is not null
  ),
  due_rows as (
    select
      countdown.couple_id,
      'countdown_day_of'::public.reminder_kind as kind,
      countdown.id as source_id,
      countdown.target_at as due_at,
      jsonb_build_object(
        'dateToken', ((countdown.target_at at time zone couple.timezone)::date)::text,
        'routePath', '/countdowns',
        'title', countdown.title
      ) as payload
    from public.countdowns countdown
    inner join public.couples couple
      on couple.id = countdown.couple_id
    where (countdown.target_at at time zone couple.timezone)::date = (timezone(couple.timezone, timezone('utc', now())))::date

    union all

    select
      note.couple_id,
      'future_note_unlock'::public.reminder_kind as kind,
      note.id as source_id,
      note.unlock_at as due_at,
      jsonb_build_object(
        'dateToken', ((note.unlock_at at time zone couple.timezone)::date)::text,
        'routePath', '/future-notes',
        'title', note.title
      ) as payload
    from public.future_notes note
    inner join public.couples couple
      on couple.id = note.couple_id
    where (note.unlock_at at time zone couple.timezone)::date = (timezone(couple.timezone, timezone('utc', now())))::date
  ),
  inserted_rows as (
    insert into public.reminder_deliveries (
      couple_id,
      recipient_user_id,
      recipient_email,
      kind,
      source_id,
      payload,
      due_at
    )
    select
      due.couple_id,
      member.recipient_user_id,
      member.recipient_email,
      due.kind,
      due.source_id,
      due.payload,
      due.due_at
    from due_rows due
    inner join active_members member
      on member.couple_id = due.couple_id
    on conflict (kind, source_id, recipient_user_id) do nothing
    returning 1
  )
  select count(*)
  into inserted_count
  from inserted_rows;

  return coalesce(inserted_count, 0);
end;
$$;

create or replace function public.claim_reminder_deliveries(max_batch_size integer default 25)
returns table (
  id uuid,
  kind public.reminder_kind,
  recipient_email text,
  due_at timestamptz,
  payload jsonb,
  attempts integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;

  return query
  with candidate_rows as (
    select delivery.id
    from public.reminder_deliveries delivery
    where (
      (delivery.status = 'pending' and delivery.not_before <= timezone('utc', now()))
      or (
        delivery.status = 'processing'
        and delivery.processing_started_at <= timezone('utc', now()) - interval '15 minutes'
      )
    )
    order by delivery.due_at asc, delivery.created_at asc
    limit greatest(coalesce(max_batch_size, 25), 1)
    for update skip locked
  ),
  claimed_rows as (
    update public.reminder_deliveries delivery
    set
      attempts = delivery.attempts + 1,
      failed_at = null,
      last_error = null,
      processing_started_at = timezone('utc', now()),
      status = 'processing',
      updated_at = timezone('utc', now())
    where delivery.id in (select candidate_rows.id from candidate_rows)
    returning
      delivery.id,
      delivery.kind,
      delivery.recipient_email,
      delivery.due_at,
      delivery.payload,
      delivery.attempts,
      delivery.max_attempts
  )
  select *
  from claimed_rows;
end;
$$;

create or replace function public.invoke_reminder_processor()
returns bigint
language plpgsql
security definer
set search_path = public, private
as $$
declare
  project_url text;
  anon_key text;
  request_id bigint;
begin
  project_url := private.get_secret('project_url');
  anon_key := private.get_secret('anon_key');

  if project_url is null or anon_key is null then
    raise notice 'Reminder processor invoke skipped because secrets project_url and/or anon_key are missing.';
    return null;
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/reminder-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'triggeredAt', timezone('utc', now())
    ),
    timeout_milliseconds := 5000
  )
  into request_id;

  return request_id;
end;
$$;

create or replace function public.configure_phase2_reminder_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform cron.schedule(
    'phase2-reminder-enqueue',
    '*/5 * * * *',
    'select public.enqueue_due_reminder_deliveries();'
  );

  perform cron.schedule(
    'phase2-reminder-processor',
    '*/5 * * * *',
    'select public.invoke_reminder_processor();'
  );
end;
$$;

select public.configure_phase2_reminder_jobs();
