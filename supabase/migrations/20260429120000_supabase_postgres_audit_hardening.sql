create index if not exists couple_memberships_user_id_idx
on public.couple_memberships (user_id);

create index if not exists couple_invites_couple_id_idx
on public.couple_invites (couple_id);

create index if not exists couple_invites_invited_by_user_id_idx
on public.couple_invites (invited_by_user_id);

create index if not exists couple_invites_accepted_by_user_id_idx
on public.couple_invites (accepted_by_user_id)
where accepted_by_user_id is not null;

create index if not exists memories_author_user_id_idx
on public.memories (author_user_id);

create index if not exists memory_media_couple_id_idx
on public.memory_media (couple_id);

create index if not exists wish_items_created_by_user_id_idx
on public.wish_items (created_by_user_id);

create index if not exists checklists_couple_id_idx
on public.checklists (couple_id);

create index if not exists activity_events_couple_id_idx
on public.activity_events (couple_id);

create index if not exists activity_events_actor_user_id_idx
on public.activity_events (actor_user_id);

create index if not exists countdowns_created_by_user_id_idx
on public.countdowns (created_by_user_id);

create index if not exists future_notes_created_by_user_id_idx
on public.future_notes (created_by_user_id);

create index if not exists trips_created_by_user_id_idx
on public.trips (created_by_user_id);

create index if not exists albums_created_by_user_id_idx
on public.albums (created_by_user_id);

create index if not exists album_items_memory_media_id_idx
on public.album_items (memory_media_id);

create index if not exists visited_places_created_by_user_id_idx
on public.visited_places (created_by_user_id);

create index if not exists reminder_deliveries_recipient_user_id_idx
on public.reminder_deliveries (recipient_user_id);

create index if not exists game_round_answers_user_id_idx
on public.game_round_answers (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.enforce_membership_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  active_count integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select count(*)
  into active_count
  from public.couple_memberships membership
  where membership.couple_id = new.couple_id
    and membership.status = 'active'
    and (tg_op <> 'update' or membership.id <> new.id);

  if active_count >= 2 then
    raise exception 'A couple space can only have two active users.';
  end if;

  return new;
end;
$$;

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_memberships membership
    where membership.couple_id = target_couple_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

drop policy if exists albums_insert on public.albums;
create policy albums_insert on public.albums
for insert
with check (
  (select auth.uid()) is not null
  and public.is_couple_member(albums.couple_id)
  and albums.created_by_user_id = (select auth.uid())
  and exists (
    select 1
    from public.trips trip
    where trip.id = albums.trip_id
      and trip.couple_id = albums.couple_id
  )
);

drop policy if exists visited_places_insert on public.visited_places;
create policy visited_places_insert on public.visited_places
for insert
with check (
  (select auth.uid()) is not null
  and public.is_couple_member(visited_places.couple_id)
  and visited_places.created_by_user_id = (select auth.uid())
  and exists (
    select 1
    from public.trips trip
    where trip.id = visited_places.trip_id
      and trip.couple_id = visited_places.couple_id
      and visited_places.visited_on between trip.start_date and trip.end_date
  )
);

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.enforce_membership_limit() from public, anon, authenticated, service_role;
revoke all on function public.enforce_album_has_items() from public, anon, authenticated, service_role;

revoke all on function public.is_couple_member(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_couple_member(uuid) to authenticated;

revoke all on function public.is_valid_timezone(text) from public, anon, authenticated, service_role;
grant execute on function public.is_valid_timezone(text) to authenticated;

revoke all on function public.accept_couple_invite(text) from public, anon, authenticated, service_role;
grant execute on function public.accept_couple_invite(text) to authenticated;

revoke all on function public.bootstrap_first_couple(date, text, text) from public, anon, authenticated, service_role;
grant execute on function public.bootstrap_first_couple(date, text, text) to authenticated;

revoke all on function public.memories_on_this_day(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.memories_on_this_day(uuid, text) to authenticated;

revoke all on function public.create_album_with_items(uuid, text, text, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.create_album_with_items(uuid, text, text, uuid[]) to authenticated;

revoke all on function public.add_album_items(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.add_album_items(uuid, uuid[]) to authenticated;

revoke all on function public.update_couple_timezone(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.update_couple_timezone(uuid, text) to authenticated;

revoke all on function public.has_any_couple() from public, anon, authenticated, service_role;
grant execute on function public.has_any_couple() to authenticated;

revoke all on function public.create_future_note_with_body(text, timestamptz, text) from public, anon, authenticated, service_role;
grant execute on function public.create_future_note_with_body(text, timestamptz, text) to authenticated;

revoke all on function public.get_unlocked_future_note_contents(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_unlocked_future_note_contents(uuid) to authenticated;

revoke all on function public.ensure_daily_question_round(public.game_mode, date, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.ensure_daily_question_round(public.game_mode, date, text, text, text) to authenticated;

revoke all on function public.submit_daily_question_answer(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.submit_daily_question_answer(uuid, text) to authenticated;

revoke all on function public.get_daily_question_round_state(date) from public, anon, authenticated, service_role;
grant execute on function public.get_daily_question_round_state(date) to authenticated;

revoke all on function public.get_daily_question_stats(integer) from public, anon, authenticated, service_role;
grant execute on function public.get_daily_question_stats(integer) to authenticated;

revoke all on function public.ensure_guess_date_round(date) from public, anon, authenticated, service_role;
grant execute on function public.ensure_guess_date_round(date) to authenticated;

revoke all on function public.submit_guess_date_answer(uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.submit_guess_date_answer(uuid, date) to authenticated;

revoke all on function public.get_guess_date_round_state(date) from public, anon, authenticated, service_role;
grant execute on function public.get_guess_date_round_state(date) to authenticated;

revoke all on function public.ensure_trivia_round(date) from public, anon, authenticated, service_role;
grant execute on function public.ensure_trivia_round(date) to authenticated;

revoke all on function public.submit_trivia_answer(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.submit_trivia_answer(uuid, text) to authenticated;

revoke all on function public.get_trivia_round_state(date) from public, anon, authenticated, service_role;
grant execute on function public.get_trivia_round_state(date) to authenticated;

revoke all on function public.claim_reminder_deliveries(integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_reminder_deliveries(integer) to service_role;

revoke all on function public.enqueue_due_reminder_deliveries() from public, anon, authenticated, service_role;
grant execute on function public.enqueue_due_reminder_deliveries() to service_role;

revoke all on function public.invoke_reminder_processor() from public, anon, authenticated, service_role;
grant execute on function public.invoke_reminder_processor() to service_role;

revoke all on function public.configure_phase2_reminder_jobs() from public, anon, authenticated, service_role;
grant execute on function public.configure_phase2_reminder_jobs() to service_role;
