-- Defense-in-depth: restrict the private memory-media bucket to image/* and video/*
-- declared content-types, mirroring the app's ALLOWED_MEDIA_MIME_PREFIXES
-- (src/app/actions/memory-actions.ts). The app already validates the client-supplied
-- mimeType; this adds a second, storage-enforced check on the declared type. The bucket
-- stays private, and the existing 25 MiB file_size_limit and object RLS policies are
-- unchanged.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-media', 'memory-media', false, 26214400, array['image/*', 'video/*'])
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
