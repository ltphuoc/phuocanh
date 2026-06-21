-- Server-side orphan-media sweep. The new-memory form uploads each file to the
-- bucket on selection (before the memory_media row exists), tracking objects so it
-- can clean up on deselect / failed submit / unmount. A hard crash or force-closed
-- tab can still strand an object with no row. This adds a scheduled sweep that lists
-- bucket objects with no memory_media row older than a cutoff so an edge function can
-- delete them through the Storage API.
--
-- Deletion deliberately does NOT happen in SQL: storage.objects is protected by a
-- delete trigger and SQL deletes leave the physical object behind. The selection is
-- kept here (one place, unit-testable); the media-sweeper edge function performs the
-- actual removal via the Storage API, and ships dry-run by default.

-- Lists bucket objects that have no referencing memory_media row and are older than
-- the cutoff. SECURITY DEFINER so the service-role caller can read storage.objects;
-- service_role only (never authenticated). The cutoff must exceed the longest
-- realistic compose session (uploads happen before the row exists) so an in-flight
-- upload is never swept.
create or replace function public.list_orphaned_memory_media(
  older_than interval,
  max_rows integer
)
returns table (object_name text)
language sql
security definer
set search_path = public
stable
as $$
  select object.name
  from storage.objects object
  where object.bucket_id = 'memory-media'
    and object.created_at < now() - older_than
    and not exists (
      select 1
      from public.memory_media media
      where media.storage_path = object.name
    )
  order by object.created_at
  limit greatest(max_rows, 0);
$$;

-- Scheduled invoker: posts to the media-sweeper edge function with the shared cron
-- invoke secret (reused from the reminder pipeline; same trust boundary -- the only
-- callers are pg_cron jobs). Skips with a notice rather than firing an unauthenticated
-- request when a secret is missing. See docs/deployment.md.
create or replace function public.invoke_media_sweeper()
returns bigint
language plpgsql
security definer
set search_path = public, private
as $$
declare
  project_url text;
  anon_key text;
  invoke_secret text;
  request_id bigint;
begin
  project_url := private.get_secret('project_url');
  anon_key := private.get_secret('anon_key');
  invoke_secret := private.get_secret('reminder_invoke_secret');

  if project_url is null or anon_key is null then
    raise notice 'Media sweeper invoke skipped because secrets project_url and/or anon_key are missing.';
    return null;
  end if;

  if invoke_secret is null then
    raise notice 'Media sweeper invoke skipped because secret reminder_invoke_secret is missing.';
    return null;
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/media-sweeper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-reminder-invoke-secret', invoke_secret
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

revoke all on function public.list_orphaned_memory_media(interval, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_orphaned_memory_media(interval, integer) to service_role;

revoke all on function public.invoke_media_sweeper() from public, anon, authenticated, service_role;
grant execute on function public.invoke_media_sweeper() to service_role;

-- Hourly sweep -- far less frequent than the 5-minute reminder cron. The edge
-- function ships dry-run (log-only) by default; deletion is enabled by env only after
-- one clean cycle is observed.
select cron.schedule(
  'memory-media-sweeper',
  '0 * * * *',
  'select public.invoke_media_sweeper();'
);
