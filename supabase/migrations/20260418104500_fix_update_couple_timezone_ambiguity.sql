create or replace function public.update_couple_timezone(
  target_couple_id uuid,
  target_timezone text
)
returns table (
  couple_id uuid,
  timezone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user_id uuid;
  current_timezone text;
  normalized_target_timezone text;
begin
  auth_user_id := auth.uid();
  if auth_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  normalized_target_timezone := nullif(btrim(target_timezone), '');
  if normalized_target_timezone is null or not public.is_valid_timezone(normalized_target_timezone) then
    raise exception 'INVALID_TIMEZONE';
  end if;

  select couple.timezone
  into current_timezone
  from public.couples as couple
  where couple.id = target_couple_id
    and public.is_couple_member(couple.id)
  for update;

  if current_timezone is null then
    raise exception 'COUPLE_NOT_FOUND';
  end if;

  if current_timezone = normalized_target_timezone then
    return query
    select target_couple_id as couple_id, current_timezone as timezone;
    return;
  end if;

  update public.countdowns as countdown
  set target_at =
    (((countdown.target_at at time zone current_timezone)::date)::timestamp at time zone normalized_target_timezone)
  where countdown.couple_id = target_couple_id;

  update public.future_notes as note
  set unlock_at =
    (((note.unlock_at at time zone current_timezone)::date)::timestamp at time zone normalized_target_timezone)
  where note.couple_id = target_couple_id;

  update public.couples as couple
  set timezone = normalized_target_timezone
  where couple.id = target_couple_id;

  return query
  select target_couple_id as couple_id, normalized_target_timezone as timezone;
end;
$$;
