-- Read-only helper backing the album-orphan guard in updateTripAction. Given a trip
-- and a candidate date window, counts album items whose parent memory's couple-local
-- date falls outside that window. It reuses the SAME couple-timezone predicate as
-- add_album_items ((happened_at at time zone couple.timezone)::date), so the trip-edit
-- guard and album-eligibility rule can never drift apart.
--
-- SECURITY INVOKER: the caller's RLS limits the joined rows to their own couple, so a
-- member can only probe their own couple's trip. `between` is inclusive, matching the
-- album-eligibility window.
create or replace function public.count_album_items_outside_trip_window(
  p_trip_id uuid,
  p_start_date date,
  p_end_date date
)
returns integer
language sql
security invoker
set search_path = public
stable
as $$
  select count(*)::integer
  from public.album_items item
  join public.albums album on album.id = item.album_id
  join public.memory_media media on media.id = item.memory_media_id
  join public.memories memory on memory.id = media.memory_id
  join public.couples couple on couple.id = album.couple_id
  where album.trip_id = p_trip_id
    and (memory.happened_at at time zone couple.timezone)::date
          not between p_start_date and p_end_date;
$$;

grant execute on function public.count_album_items_outside_trip_window(uuid, date, date)
  to authenticated;
