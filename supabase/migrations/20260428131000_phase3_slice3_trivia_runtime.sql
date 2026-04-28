create table public.game_round_trivia_targets (
  round_id uuid primary key references public.game_rounds (id) on delete cascade,
  memory_id uuid not null references public.memories (id) on delete restrict,
  correct_answer text not null,
  answer_options jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint game_round_trivia_targets_correct_answer_length_check check (
    char_length(btrim(correct_answer)) between 1 and 240
  ),
  constraint game_round_trivia_targets_answer_options_check check (
    jsonb_typeof(answer_options) = 'array'
    and jsonb_array_length(answer_options) between 2 and 4
  )
);

create index game_round_trivia_targets_memory_id_idx
on public.game_round_trivia_targets (memory_id);

alter table public.game_round_trivia_targets enable row level security;

revoke all on table public.game_round_trivia_targets from anon, authenticated;

create or replace function public.ensure_trivia_round(target_round_date date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  distinct_location_count integer;
  ensured_round_id uuid;
  selected_answer_options jsonb;
  selected_correct_answer text;
  selected_clue text;
  selected_memory_id uuid;
  selected_option_array text[];
  target_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if target_round_date is null then
    raise exception 'INVALID_ROUND_DATE';
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

  select game_round.id
  into ensured_round_id
  from public.game_rounds game_round
  where game_round.couple_id = target_couple_id
    and game_round.mode = 'trivia'
    and game_round.round_date = target_round_date
  limit 1;

  if ensured_round_id is not null then
    return ensured_round_id;
  end if;

  select count(distinct lower(btrim(memory.location_name)))
  into distinct_location_count
  from public.memories memory
  where memory.couple_id = target_couple_id
    and nullif(btrim(memory.location_name), '') is not null;

  if coalesce(distinct_location_count, 0) < 2 then
    raise exception 'NO_TRIVIA_MEMORY';
  end if;

  select
    memory.id,
    btrim(memory.location_name),
    left(
      coalesce(
        nullif(btrim(memory.note), ''),
        case
          when exists (
            select 1
            from public.memory_media media
            where media.memory_id = memory.id
          ) then 'A saved memory with media'
          else 'A saved memory from your timeline'
        end
      ),
      240
    )
  into
    selected_memory_id,
    selected_correct_answer,
    selected_clue
  from public.memories memory
  where memory.couple_id = target_couple_id
    and nullif(btrim(memory.location_name), '') is not null
  order by
    exists (
      select 1
      from public.game_round_trivia_targets target
      inner join public.game_rounds used_round
        on used_round.id = target.round_id
      where used_round.couple_id = target_couple_id
        and used_round.mode = 'trivia'
        and target.memory_id = memory.id
    ),
    memory.happened_at,
    memory.created_at,
    memory.id
  limit 1;

  if selected_memory_id is null or selected_correct_answer is null then
    raise exception 'NO_TRIVIA_MEMORY';
  end if;

  with distinct_locations as (
    select
      lower(btrim(memory.location_name)) as normalized_location,
      min(btrim(memory.location_name)) as display_location
    from public.memories memory
    where memory.couple_id = target_couple_id
      and nullif(btrim(memory.location_name), '') is not null
    group by lower(btrim(memory.location_name))
  ),
  distractors as (
    select location.display_location
    from distinct_locations location
    where location.normalized_location <> lower(selected_correct_answer)
    order by md5(location.display_location || target_round_date::text || target_couple_id::text)
    limit 3
  )
  select array_prepend(
    selected_correct_answer,
    coalesce(array_agg(distractor.display_location), '{}'::text[])
  )
  into selected_option_array
  from distractors distractor;

  select jsonb_agg(option_value order by md5(option_value || target_round_date::text || target_couple_id::text))
  into selected_answer_options
  from unnest(selected_option_array) as option_value;

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
    'trivia',
    target_round_date,
    'en',
    'memory',
    selected_clue
  )
  on conflict (couple_id, mode, round_date) do nothing
  returning id into ensured_round_id;

  if ensured_round_id is not null then
    insert into public.game_round_trivia_targets (
      round_id,
      memory_id,
      correct_answer,
      answer_options
    )
    values (
      ensured_round_id,
      selected_memory_id,
      selected_correct_answer,
      selected_answer_options
    )
    on conflict (round_id) do nothing;

    return ensured_round_id;
  end if;

  select game_round.id
  into ensured_round_id
  from public.game_rounds game_round
  where game_round.couple_id = target_couple_id
    and game_round.mode = 'trivia'
    and game_round.round_date = target_round_date
  limit 1;

  if ensured_round_id is null then
    raise exception 'GAME_ROUND_UNAVAILABLE';
  end if;

  return ensured_round_id;
end;
$$;

revoke all on function public.ensure_trivia_round(date) from public;
grant execute on function public.ensure_trivia_round(date) to authenticated;

create or replace function public.submit_trivia_answer(
  target_round_id uuid,
  selected_answer text
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

  normalized_answer := nullif(btrim(selected_answer), '');
  if normalized_answer is null or char_length(normalized_answer) > 240 then
    raise exception 'INVALID_GAME_ANSWER';
  end if;

  select game_round.couple_id
  into target_couple_id
  from public.game_rounds game_round
  inner join public.game_round_trivia_targets target
    on target.round_id = game_round.id
  where game_round.id = target_round_id
    and game_round.mode = 'trivia'
    and target.answer_options ? normalized_answer
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

revoke all on function public.submit_trivia_answer(uuid, text) from public;
grant execute on function public.submit_trivia_answer(uuid, text) to authenticated;

create or replace function public.get_trivia_round_state(target_round_date date)
returns table (
  id uuid,
  round_date date,
  prompt_locale text,
  prompt_source text,
  clue_text text,
  answer_options jsonb,
  answer_count integer,
  active_partner_count integer,
  viewer_has_answered boolean,
  reveal_answers boolean,
  correct_answer text,
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
      game_round.prompt_text,
      target.correct_answer,
      target.answer_options
    from public.game_rounds game_round
    inner join public.game_round_trivia_targets target
      on target.round_id = game_round.id
    where game_round.couple_id = target_couple_id
      and game_round.mode = 'trivia'
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
  member_stats as (
    select count(*)::integer as active_partner_count
    from public.couple_memberships membership
    where membership.couple_id = target_couple_id
      and membership.status = 'active'
  ),
  answer_stats as (
    select
      count(*)::integer as answer_count,
      coalesce(bool_or(answer.user_id = viewer_user_id), false) as viewer_has_answered
    from answer_rows answer
  ),
  reveal_state as (
    select
      coalesce(answer_stats.answer_count, 0) as answer_count,
      coalesce(member_stats.active_partner_count, 0) as active_partner_count,
      coalesce(answer_stats.viewer_has_answered, false) as viewer_has_answered,
      coalesce(answer_stats.answer_count, 0) >= greatest(coalesce(member_stats.active_partner_count, 0), 1) as reveal_answers
    from answer_stats
    cross join member_stats
  )
  select
    round.id,
    round.round_date,
    round.prompt_locale,
    round.prompt_source,
    round.prompt_text as clue_text,
    round.answer_options,
    reveal.answer_count,
    reveal.active_partner_count,
    reveal.viewer_has_answered,
    reveal.reveal_answers,
    case
      when reveal.reveal_answers then round.correct_answer
      else null::text
    end as correct_answer,
    case
      when reveal.reveal_answers then coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'selectedAnswer', answer.answer_body,
              'isCorrect', answer.answer_body = round.correct_answer,
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
  cross join reveal_state reveal;
end;
$$;

revoke all on function public.get_trivia_round_state(date) from public;
grant execute on function public.get_trivia_round_state(date) to authenticated;
