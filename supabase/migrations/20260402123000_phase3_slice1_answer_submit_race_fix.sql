create or replace function public.submit_daily_question_answer(
  target_round_id uuid,
  answer_body text
)
returns uuid
language plpgsql
security invoker
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
    and public.is_couple_member(game_round.couple_id)
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
