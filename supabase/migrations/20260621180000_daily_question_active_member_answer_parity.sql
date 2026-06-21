-- Count only ACTIVE-member answers for daily-question reveal, stats, and the
-- timezone-reconcile delete, matching the guess-date / trivia pattern. Behavior is
-- unchanged while every membership is active (the only state the app creates today);
-- this is forward-correctness so a future membership-deactivation flow cannot leak a
-- reveal or skew stats off a departed member's answer.
--
-- Three sites are recreated from their LATEST definitions, changed only by joining
-- game_round_answers to an active couple membership:
--   1. get_daily_question_round_state  (latest: gameplay_contract_hardening)
--   2. get_daily_question_stats        (latest: fix_daily_question_stats_today_timezone)
--   3. update_couple_timezone reconcile (latest: update_couple_timezone_reconcile_game_rounds)
-- The daily-question reveal threshold stays the literal 2 (two active partners);
-- guess-date / trivia keep their own greatest(active_partner_count, 1) spec untouched.

create or replace function public.get_daily_question_round_state(target_round_date date)
returns table (
  id uuid,
  round_date date,
  prompt_locale text,
  prompt_source text,
  prompt_text text,
  answer_count integer,
  viewer_has_answered boolean,
  reveal_answers boolean,
  revealed_answers jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_couple_id uuid;
  viewer_user_id uuid;
begin
  viewer_user_id := auth.uid();
  if viewer_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select membership.couple_id
  into target_couple_id
  from public.couple_memberships membership
  where membership.user_id = viewer_user_id
    and membership.status = 'active'
  limit 1;

  if target_couple_id is null then
    raise exception 'COUPLE_CONTEXT_REQUIRED';
  end if;

  return query
  with round_row as (
    select
      game_round.id,
      game_round.round_date,
      game_round.prompt_locale,
      game_round.prompt_source,
      game_round.prompt_text
    from public.game_rounds game_round
    where game_round.couple_id = target_couple_id
      and game_round.mode = 'daily_question'
      and game_round.round_date = target_round_date
    limit 1
  ),
  answer_rows as (
    select
      answer.answer_body,
      answer.round_id,
      answer.submitted_at,
      answer.user_id
    from public.game_round_answers answer
    inner join round_row round
      on round.id = answer.round_id
    inner join public.couple_memberships membership
      on membership.couple_id = target_couple_id
      and membership.user_id = answer.user_id
      and membership.status = 'active'
  ),
  answer_stats as (
    select
      count(*)::integer as answer_count,
      coalesce(bool_or(answer.user_id = viewer_user_id), false) as viewer_has_answered
    from answer_rows answer
  )
  select
    round.id,
    round.round_date,
    round.prompt_locale,
    round.prompt_source,
    round.prompt_text,
    coalesce(stats.answer_count, 0) as answer_count,
    coalesce(stats.viewer_has_answered, false) as viewer_has_answered,
    coalesce(stats.answer_count, 0) >= 2 as reveal_answers,
    case
      when coalesce(stats.answer_count, 0) >= 2 then coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'answerBody', answer.answer_body,
              'author', case when answer.user_id = viewer_user_id then 'viewer' else 'partner' end,
              'submittedAt', answer.submitted_at
            )
            order by
              case when answer.user_id = viewer_user_id then 0 else 1 end,
              answer.submitted_at
          )
          from answer_rows answer
        ),
        '[]'::jsonb
      )
      else '[]'::jsonb
    end as revealed_answers
  from round_row round
  left join answer_stats stats
    on true;
end;
$$;

create or replace function public.get_daily_question_stats(target_history_days integer default 14)
returns table (
  current_streak integer,
  total_rounds integer,
  total_completed_rounds integer,
  viewer_participation_count integer,
  viewer_participation_rate integer,
  recent_history jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  history_days integer;
  target_couple_id uuid;
  target_timezone text;
  viewer_user_id uuid;
begin
  viewer_user_id := auth.uid();
  if viewer_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  history_days := greatest(coalesce(target_history_days, 14), 1);

  select
    membership.couple_id,
    couple.timezone
  into
    target_couple_id,
    target_timezone
  from public.couple_memberships membership
  inner join public.couples couple
    on couple.id = membership.couple_id
  where membership.user_id = viewer_user_id
    and membership.status = 'active'
  limit 1;

  if target_couple_id is null or target_timezone is null then
    raise exception 'COUPLE_CONTEXT_REQUIRED';
  end if;

  return query
  with round_rows as (
    select
      game_round.id,
      game_round.round_date
    from public.game_rounds game_round
    where game_round.couple_id = target_couple_id
      and game_round.mode = 'daily_question'
  ),
  active_answers as (
    select
      answer.round_id,
      answer.user_id
    from public.game_round_answers answer
    inner join public.couple_memberships membership
      on membership.couple_id = target_couple_id
      and membership.user_id = answer.user_id
      and membership.status = 'active'
  ),
  round_states as (
    select
      round.round_date,
      count(answer.user_id)::integer as answer_count,
      coalesce(bool_or(answer.user_id = viewer_user_id), false) as viewer_has_answered,
      case
        when count(answer.user_id) >= 2 then 'completed'
        when coalesce(bool_or(answer.user_id = viewer_user_id), false) then 'waiting_for_partner'
        when count(answer.user_id) > 0 then 'waiting_for_you'
        else 'not_started'
      end::text as status
    from round_rows round
    left join active_answers answer
      on answer.round_id = round.id
    group by round.round_date
  ),
  today_row as (
    select (now() at time zone target_timezone)::date as today_date
  ),
  recent_history_rows as (
    select
      (today_row.today_date - history_offset.day_offset::integer) as round_date,
      coalesce(round_state.status, 'not_started') as status,
      history_offset.day_offset
    from today_row
    cross join generate_series(0, history_days - 1) as history_offset(day_offset)
    left join round_states round_state
      on round_state.round_date = (today_row.today_date - history_offset.day_offset::integer)
  ),
  streak_seed as (
    select
      case
        when exists (
          select 1
          from round_states round_state
          inner join today_row
            on round_state.round_date = today_row.today_date
          where round_state.status = 'completed'
        ) then 0
        else 1
      end as starting_offset
  ),
  streak_rows as (
    select
      streak_offset.day_offset,
      coalesce(round_state.status, 'not_started') as status
    from today_row
    cross join streak_seed
    cross join generate_series(
      streak_seed.starting_offset,
      streak_seed.starting_offset + coalesce((select count(*) from round_states), 0) + history_days
    ) as streak_offset(day_offset)
    left join round_states round_state
      on round_state.round_date = (today_row.today_date - streak_offset.day_offset::integer)
  ),
  streak_with_breaks as (
    select
      streak_row.day_offset,
      streak_row.status,
      sum(case when streak_row.status <> 'completed' then 1 else 0 end)
        over (order by streak_row.day_offset) as break_count
    from streak_rows streak_row
  )
  select
    coalesce(
      (
        select count(*)::integer
        from streak_with_breaks streak
        where streak.status = 'completed'
          and streak.break_count = 0
      ),
      0
    ) as current_streak,
    coalesce((select count(*)::integer from round_states), 0) as total_rounds,
    coalesce(
      (
        select count(*)::integer
        from round_states round_state
        where round_state.status = 'completed'
      ),
      0
    ) as total_completed_rounds,
    coalesce(
      (
        select count(*)::integer
        from round_states round_state
        where round_state.viewer_has_answered
      ),
      0
    ) as viewer_participation_count,
    coalesce(
      (
        select
          case
            when count(*) = 0 then 0
            else round((count(*) filter (where round_state.viewer_has_answered)::numeric / count(*)::numeric) * 100)::integer
          end
        from round_states round_state
      ),
      0
    ) as viewer_participation_rate,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'dateToken', recent_history.round_date::text,
            'status', recent_history.status
          )
          order by recent_history.day_offset
        )
        from recent_history_rows recent_history
      ),
      '[]'::jsonb
    ) as recent_history;
end;
$$;

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
  -- collision). The answer count below counts only ACTIVE-member answers, matching
  -- the reveal RPCs exactly so the "revealed" boundary is identical across all three.
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
      inner join public.couple_memberships as membership
        on membership.couple_id = target_couple_id
        and membership.user_id = answer.user_id
        and membership.status = 'active'
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

revoke all on function public.get_daily_question_round_state(date) from public, anon, authenticated, service_role;
grant execute on function public.get_daily_question_round_state(date) to authenticated;

revoke all on function public.get_daily_question_stats(integer) from public, anon, authenticated, service_role;
grant execute on function public.get_daily_question_stats(integer) to authenticated;

revoke all on function public.update_couple_timezone(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.update_couple_timezone(uuid, text) to authenticated;
