-- Same-row CHECK backstops so the MIME / size / path rules on memory_media and the
-- title / note limits on countdowns hold even on a direct PostgREST write, not only
-- inside the Server Action. Both tables carry a direct INSERT grant to authenticated
-- (data_api_grants_public_tables), so the bypass these guard is real. Same-row checks
-- need no trigger or function: zero write-time cost and no DML grant changes.
--
-- The memory_media size ceiling (26214400 = 25 MiB) matches the memory-media bucket
-- file_size_limit so app, bucket, and DB agree. The storage_path check is a
-- deliberately LOOSER superset of the real upload contract: it asserts only the
-- couples/{couple_id}/memories/{memory_id}/ prefix (trailing /%), while the app path
-- pattern and storage RLS additionally constrain the filename segment. It is a
-- backstop that can never false-reject a valid app write; if the prefix contract ever
-- changes, this check must change with it.
--
-- Each constraint is added NOT VALID then VALIDATE'd in the same migration so a deploy
-- fails loudly only if a legacy row already violates it (none should — the app has
-- always enforced these). Under supabase db reset the tables are empty, so VALIDATE is
-- a no-op there.

alter table public.memory_media
  add constraint memory_media_mime_type_check
    check (mime_type like 'image/%' or mime_type like 'video/%') not valid,
  add constraint memory_media_size_bytes_check
    check (size_bytes > 0 and size_bytes <= 26214400) not valid,
  add constraint memory_media_storage_path_check
    check (
      storage_path like 'couples/' || couple_id::text || '/memories/' || memory_id::text || '/%'
    ) not valid;

alter table public.memory_media
  validate constraint memory_media_mime_type_check,
  validate constraint memory_media_size_bytes_check,
  validate constraint memory_media_storage_path_check;

alter table public.countdowns
  add constraint countdowns_title_length_check
    check (char_length(btrim(title)) between 1 and 120) not valid,
  add constraint countdowns_note_length_check
    check (note is null or char_length(note) <= 280) not valid;

alter table public.countdowns
  validate constraint countdowns_title_length_check,
  validate constraint countdowns_note_length_check;
