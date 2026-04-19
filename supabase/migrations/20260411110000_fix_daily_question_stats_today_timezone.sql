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
    left join public.game_round_answers answer
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
