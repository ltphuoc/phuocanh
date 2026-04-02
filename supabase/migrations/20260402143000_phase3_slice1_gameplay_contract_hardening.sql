drop policy if exists game_rounds_insert on public.game_rounds;
drop policy if exists game_round_answers_select on public.game_round_answers;
drop policy if exists game_round_answers_insert on public.game_round_answers;

revoke insert, update, delete on table public.game_rounds from anon, authenticated;
revoke all on table public.game_round_answers from anon, authenticated;

create or replace function public.ensure_daily_question_round(
  target_mode public.game_mode,
  target_round_date date,
  prompt_locale text,
  prompt_text text,
  prompt_source text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ensured_round_id uuid;
  target_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if target_mode <> 'daily_question' then
    raise exception 'UNSUPPORTED_GAME_MODE';
  end if;

  if prompt_locale not in ('en', 'vi') then
    raise exception 'INVALID_PROMPT_LOCALE';
  end if;

  if coalesce(char_length(btrim(prompt_text)), 0) = 0
    or char_length(prompt_text) > 240 then
    raise exception 'INVALID_PROMPT_TEXT';
  end if;

  if coalesce(btrim(prompt_source), '') <> 'openai' then
    raise exception 'INVALID_PROMPT_SOURCE';
  end if;

  select membership.couple_id
  into target_couple_id
  from public.couple_memberships membership
  where membership.user_id = auth.uid()
    and membership.status = 'active'
  limit 1;

  if target_couple_id is null then
    raise exception 'COUPLE_CONTEXT_REQUIRED';
  end if;

  insert into public.game_rounds (
    couple_id,
    mode,
    round_date,
    prompt_locale,
    prompt_source,
    prompt_text
  )
  values (
    target_couple_id,
    target_mode,
    target_round_date,
    prompt_locale,
    prompt_source,
    btrim(prompt_text)
  )
  on conflict (couple_id, mode, round_date) do nothing
  returning id into ensured_round_id;

  if ensured_round_id is not null then
    return ensured_round_id;
  end if;

  select game_round.id
  into ensured_round_id
  from public.game_rounds game_round
  where game_round.couple_id = target_couple_id
    and game_round.mode = target_mode
    and game_round.round_date = target_round_date
  limit 1;

  if ensured_round_id is null then
    raise exception 'GAME_ROUND_UNAVAILABLE';
  end if;

  return ensured_round_id;
end;
$$;

revoke all on function public.ensure_daily_question_round(public.game_mode, date, text, text, text) from public;
grant execute on function public.ensure_daily_question_round(public.game_mode, date, text, text, text) to authenticated;

create or replace function public.submit_daily_question_answer(
  target_round_id uuid,
  answer_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_answer_id uuid;
  normalized_answer text;
  target_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  normalized_answer := nullif(btrim(answer_body), '');
  if normalized_answer is null or char_length(normalized_answer) > 800 then
    raise exception 'INVALID_GAME_ANSWER';
  end if;

  select game_round.couple_id
  into target_couple_id
  from public.game_rounds game_round
  where game_round.id = target_round_id
    and game_round.mode = 'daily_question'
    and exists (
      select 1
      from public.couple_memberships membership
      where membership.couple_id = game_round.couple_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
    )
  limit 1;

  if target_couple_id is null then
    raise exception 'GAME_ROUND_NOT_FOUND';
  end if;

  insert into public.game_round_answers (
    round_id,
    user_id,
    answer_body
  )
  values (
    target_round_id,
    auth.uid(),
    normalized_answer
  )
  on conflict (round_id, user_id) do nothing
  returning id into created_answer_id;

  if created_answer_id is null then
    raise exception 'GAME_ANSWER_ALREADY_SUBMITTED';
  end if;

  return created_answer_id;
end;
$$;

revoke all on function public.submit_daily_question_answer(uuid, text) from public;
grant execute on function public.submit_daily_question_answer(uuid, text) to authenticated;

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

revoke all on function public.get_daily_question_round_state(date) from public;
grant execute on function public.get_daily_question_round_state(date) to authenticated;

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
    select (timezone(target_timezone, timezone('utc', now())))::date as today_date
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

revoke all on function public.get_daily_question_stats(integer) from public;
grant execute on function public.get_daily_question_stats(integer) to authenticated;
