create type public.game_mode as enum ('daily_question');

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  mode public.game_mode not null,
  round_date date not null,
  prompt_locale text not null,
  prompt_source text not null,
  prompt_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint game_rounds_couple_mode_round_date_unique unique (couple_id, mode, round_date),
  constraint game_rounds_prompt_locale_check check (prompt_locale in ('en', 'vi')),
  constraint game_rounds_prompt_source_check check (prompt_source = 'openai'),
  constraint game_rounds_prompt_text_length_check check (
    char_length(btrim(prompt_text)) between 1 and 240
  )
);

create table public.game_round_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.game_rounds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  answer_body text not null,
  submitted_at timestamptz not null default timezone('utc', now()),
  constraint game_round_answers_round_user_unique unique (round_id, user_id),
  constraint game_round_answers_answer_body_length_check check (
    char_length(btrim(answer_body)) between 1 and 800
  )
);

create index game_rounds_couple_mode_round_date_idx
on public.game_rounds (couple_id, mode, round_date desc);

create index game_round_answers_round_id_idx
on public.game_round_answers (round_id);

create trigger game_rounds_updated_at_trigger
before update on public.game_rounds
for each row
execute function public.set_updated_at();

alter table public.game_rounds enable row level security;
alter table public.game_round_answers enable row level security;

create policy game_rounds_select on public.game_rounds
for select
using (public.is_couple_member(couple_id));

create policy game_rounds_insert on public.game_rounds
for insert
with check (
  auth.uid() is not null
  and public.is_couple_member(couple_id)
);

create policy game_round_answers_select on public.game_round_answers
for select
using (
  exists (
    select 1
    from public.game_rounds game_round
    where game_round.id = round_id
      and public.is_couple_member(game_round.couple_id)
  )
);

create policy game_round_answers_insert on public.game_round_answers
for insert
with check (
  auth.uid() is not null
  and auth.uid() = user_id
  and exists (
    select 1
    from public.game_rounds game_round
    where game_round.id = round_id
      and public.is_couple_member(game_round.couple_id)
  )
);

create or replace function public.ensure_daily_question_round(
  target_mode public.game_mode,
  target_round_date date,
  prompt_locale text,
  prompt_text text,
  prompt_source text
)
returns uuid
language plpgsql
security invoker
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

  if exists (
    select 1
    from public.game_round_answers answer
    where answer.round_id = target_round_id
      and answer.user_id = auth.uid()
  ) then
    raise exception 'GAME_ANSWER_ALREADY_SUBMITTED';
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
  returning id into created_answer_id;

  return created_answer_id;
end;
$$;
