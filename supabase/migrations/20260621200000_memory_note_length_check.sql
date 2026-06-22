-- Bound the memory note length at the database layer so the cap holds even on a
-- direct PostgREST write, not only inside the Server Action. public.memories carries
-- a direct INSERT/UPDATE grant to authenticated (data_api_grants_public_tables), so
-- the bypass this guards is real: the app-side Zod bound can be skipped by writing the
-- column directly. A same-row CHECK needs no trigger or function: zero write-time cost
-- and no DML grant changes.
--
-- 4000 chars = 2x the future-note body bound (the longest free-text body in the app),
-- a generous ceiling for a memory caption while still rejecting unbounded payloads.
-- char_length(btrim(note)) mirrors the app's .trim() so leading/trailing whitespace
-- never counts toward the limit.
--
-- Added NOT VALID then VALIDATE'd in the same migration so a deploy fails loudly only
-- if a legacy row already exceeds the bound (none should — the app has always capped
-- the note). Under supabase db reset the table is empty, so VALIDATE is a no-op there.
-- If VALIDATE ever fails, clamp or raise the bound with owner sign-off rather than
-- letting a raw constraint-scan abort the deploy.

alter table public.memories
  add constraint memories_note_length_check
    check (note is null or char_length(btrim(note)) <= 4000) not valid;

alter table public.memories
  validate constraint memories_note_length_check;
