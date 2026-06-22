-- Atomic empty-album cleanup.
--
-- The app helper (deleteEmptyAlbums) previously ran a SELECT album_items followed by a
-- separate DELETE. A partner calling add_album_items between the two could have their
-- newly added item dropped: the album looked empty at the SELECT snapshot, so the later
-- DELETE removed it (and cascaded the just-added item away).
--
-- PostgREST cannot express a correlated NOT EXISTS anti-join in a DELETE filter, so the
-- empty check cannot be folded into the app-side delete. Collapse it into one statement
-- here instead: the in-statement NOT EXISTS is evaluated atomically under READ COMMITTED,
-- so it sees a concurrently committed add_album_items and leaves that album alone.
--
-- SECURITY INVOKER (not DEFINER): the existing albums_delete RLS policy (gated on
-- is_couple_member) and the table grants still apply, so this adds NO new privileged
-- surface — it only makes the already member-authorized empty-album delete atomic. The
-- couple-membership check therefore lives entirely in RLS; p_couple_id only scopes the
-- candidate set.

create or replace function public.delete_empty_albums(
  p_couple_id uuid,
  p_album_ids uuid[]
)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.albums
  where couple_id = p_couple_id
    and id = any (coalesce(p_album_ids, array[]::uuid[]))
    and not exists (
      select 1
      from public.album_items item
      where item.album_id = albums.id
    );
$$;

revoke all on function public.delete_empty_albums(uuid, uuid[])
  from public, anon, authenticated, service_role;

grant execute on function public.delete_empty_albums(uuid, uuid[]) to authenticated;
