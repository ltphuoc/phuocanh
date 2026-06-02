-- Require a shared secret to invoke the reminder-processor edge function.
--
-- Previously the cron-driven invocation sent only the public anon key as a bearer
-- token, so any holder of that key plus the function URL could trigger a run. The
-- function now also requires an `x-reminder-invoke-secret` header; this migration
-- teaches the scheduled invoker to send it.
--
-- The secret is read from the same Vault / private.secret_fallbacks mechanism as
-- `project_url` / `anon_key` (see get_secret). It must be provisioned in two
-- places that have to match: Vault entry `reminder_invoke_secret` (read here) and
-- the edge function env var `REMINDER_INVOKE_SECRET` (checked in the function).
-- See docs/deployment.md. If the secret is absent the invoker skips with a notice
-- rather than firing an unauthenticated request that the function would reject.

create or replace function public.invoke_reminder_processor()
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
    raise notice 'Reminder processor invoke skipped because secrets project_url and/or anon_key are missing.';
    return null;
  end if;

  if invoke_secret is null then
    raise notice 'Reminder processor invoke skipped because secret reminder_invoke_secret is missing.';
    return null;
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/reminder-processor',
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

revoke all on function public.invoke_reminder_processor() from public, anon, authenticated, service_role;
grant execute on function public.invoke_reminder_processor() to service_role;
