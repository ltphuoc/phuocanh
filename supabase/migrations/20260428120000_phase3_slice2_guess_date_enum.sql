alter type public.game_mode add value if not exists 'guess_date';

alter table public.game_rounds
drop constraint if exists game_rounds_prompt_source_check;

alter table public.game_rounds
add constraint game_rounds_prompt_source_check
check (prompt_source in ('openai', 'memory'));
