-- Atomic memory update: fold the memory-row update, media removal, and media
-- addition into a single transaction that enforces the content invariant.
--
-- The previous app-side flow ran the row update, the media delete, and the media
-- insert as separate statements, and checked "note OR >= 1 media" with a
-- read-then-write that two concurrent edits could both pass before each emptied
-- the memory. This RPC takes a row lock, re-checks couple membership (SECURITY
-- DEFINER bypasses the memories/memory_media RLS that normally guards these
-- writes, so the assert is load-bearing), and evaluates the invariant against the
-- post-mutation media count inside one transaction. Any failure rolls everything
-- back. It returns the storage paths of removed media and the albums that may now
-- be empty so the caller can perform post-commit storage cleanup.
--
-- Content invariant: a memory must always have a note OR at least one media row.
-- It is NOT media-only; removing all media while keeping a note is valid.

create or replace function public.update_memory_media(
  p_memory_id uuid,
  p_note text,
  p_happened_at timestamptz,
  p_location_address text,
  p_location_latitude double precision,
  p_location_longitude double precision,
  p_location_name text,
  p_location_provider text,
  p_location_provider_id text,
  p_remove_media_ids uuid[],
  p_add_media jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  memory_couple_id uuid;
  removed_storage_paths text[];
  affected_album_ids uuid[];
  remaining_media_count integer;
  normalized_note text;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Row lock serializes concurrent partner edits of the same memory.
  select couple_id
  into memory_couple_id
  from public.memories
  where id = p_memory_id
  for update;

  if memory_couple_id is null then
    raise exception 'MEMORY_NOT_FOUND';
  end if;

  -- Load-bearing: DEFINER bypasses RLS, so re-assert couple membership here.
  if not public.is_couple_member(memory_couple_id) then
    raise exception 'FORBIDDEN';
  end if;

  -- Capture removal side effects before deleting the rows.
  select coalesce(array_agg(media.storage_path), array[]::text[])
  into removed_storage_paths
  from public.memory_media media
  where media.memory_id = p_memory_id
    and media.id = any (coalesce(p_remove_media_ids, array[]::uuid[]));

  select coalesce(array_agg(distinct item.album_id), array[]::uuid[])
  into affected_album_ids
  from public.album_items item
  where item.memory_media_id = any (coalesce(p_remove_media_ids, array[]::uuid[]));

  update public.memories
  set
    happened_at = p_happened_at,
    location_address = p_location_address,
    location_latitude = p_location_latitude,
    location_longitude = p_location_longitude,
    location_name = p_location_name,
    location_provider = p_location_provider,
    location_provider_id = p_location_provider_id,
    note = p_note
  where id = p_memory_id;

  delete from public.memory_media
  where memory_id = p_memory_id
    and id = any (coalesce(p_remove_media_ids, array[]::uuid[]));

  -- Force couple_id / memory_id from the locked memory row; never trust the
  -- couple_id a caller might encode in p_add_media.
  insert into public.memory_media (
    couple_id,
    memory_id,
    media_type,
    mime_type,
    original_file_name,
    size_bytes,
    storage_path
  )
  select
    memory_couple_id,
    p_memory_id,
    (item->>'media_type')::public.media_type,
    item->>'mime_type',
    item->>'original_file_name',
    (item->>'size_bytes')::bigint,
    item->>'storage_path'
  from jsonb_array_elements(coalesce(p_add_media, '[]'::jsonb)) as item;

  select count(*)
  into remaining_media_count
  from public.memory_media
  where memory_id = p_memory_id;

  normalized_note := btrim(coalesce(p_note, ''));

  if remaining_media_count = 0 and normalized_note = '' then
    raise exception 'MEMORY_REQUIRES_CONTENT';
  end if;

  return jsonb_build_object(
    'removed_storage_paths', to_jsonb(removed_storage_paths),
    'affected_album_ids', to_jsonb(affected_album_ids)
  );
end;
$$;

revoke all on function public.update_memory_media(
  uuid, text, timestamptz, text, double precision, double precision, text, text, text, uuid[], jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.update_memory_media(
  uuid, text, timestamptz, text, double precision, double precision, text, text, text, uuid[], jsonb
) to authenticated;
