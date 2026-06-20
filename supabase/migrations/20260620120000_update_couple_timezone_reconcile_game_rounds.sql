-- Recreate update_couple_timezone so changing the couple timezone also clears
-- in-flight game rounds that the couple-local day shift would otherwise strand.
--
-- round_date is a stored couple-local DATE token (computed client-side from the
-- couple timezone). When the timezone changes to a date-shifting zone, the next
-- open computes a new token and a new round, stranding any in-flight round dated
-- today-or-future under the OLD zone -- and if one partner already answered, the
-- reveal (which needs both partners on the SAME round) can never fire.
--
-- Reconciliation deletes only NOT-yet-revealed rounds in the live window
-- (today-or-future under the old zone). The reveal threshold mirrors each mode's
-- own rule (daily_question reveals at 2 answers; guess_date/trivia reveal at
-- greatest(active_partner_count, 1)), so already-revealed rounds -- including a
-- solo guess_date/trivia round at a single answer -- are preserved as history.
-- Past rounds (round_date < today) are untouched. Child rows drop via the
-- existing on delete cascade.

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

  -- Clear not-yet-revealed in-flight rounds the timezone shift would strand. This
  -- runs while current_timezone still holds the OLD zone (before the couples
  -- UPDATE below): "today or future under the old zone" is the live window. The
  -- couple-local "today" expression matches the one used elsewhere in gameplay
  -- ((now() at time zone <tz>)::date) and the client-side round_date token, so the
  -- date boundary is exact. The per-mode threshold keeps revealed rounds as
  -- history; only not-yet-revealed live-window rounds are removed so they
  -- regenerate cleanly under the new zone (delete, not move -> no unique-constraint
  -- collision). The answer count below counts all answers for the round; this
  -- equals the reveal RPCs' active-member-only count while every membership is
  -- active (the only state the app creates today -- there is no deactivation flow).
  delete from public.game_rounds as round
  using (
    select count(*)::int as active_partner_count
    from public.couple_memberships as membership
    where membership.couple_id = target_couple_id
      and membership.status = 'active'
  ) as member_stats
  where round.couple_id = target_couple_id
    and round.round_date >= (now() at time zone current_timezone)::date
    and (
      select count(*)
      from public.game_round_answers as answer
      where answer.round_id = round.id
    ) < case round.mode
          when 'daily_question' then 2
          else greatest(member_stats.active_partner_count, 1)
        end;

  update public.couples as couple
  set timezone = normalized_target_timezone
  where couple.id = target_couple_id;

  return query
  select target_couple_id as couple_id, normalized_target_timezone as timezone;
end;
$$;

revoke all on function public.update_couple_timezone(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.update_couple_timezone(uuid, text) to authenticated;
