insert into storage.buckets (id, name, public, file_size_limit)
values ('memory-media', 'memory-media', false, 26214400)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists memory_media_storage_select on storage.objects;
create policy memory_media_storage_select on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-media'
  and name ~* '^couples/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/memories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);

drop policy if exists memory_media_storage_insert on storage.objects;
create policy memory_media_storage_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'memory-media'
  and name ~* '^couples/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/memories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);

drop policy if exists memory_media_storage_update on storage.objects;
create policy memory_media_storage_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'memory-media'
  and name ~* '^couples/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/memories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
)
with check (
  bucket_id = 'memory-media'
  and name ~* '^couples/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/memories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);

drop policy if exists memory_media_storage_delete on storage.objects;
create policy memory_media_storage_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'memory-media'
  and name ~* '^couples/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/memories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
  and public.is_couple_member(split_part(name, '/', 2)::uuid)
);
