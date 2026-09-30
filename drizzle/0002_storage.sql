-- Storage for user uploads.
--
-- Kept separate from the handle lifecycle so the core schema can be applied and
-- tested without Supabase's `storage` extension being present.

-- Public bucket: an avatar is meant to be seen by anyone who visits the page,
-- and a public bucket lets next/image fetch through a plain CDN URL instead of a
-- signed-URL round trip on every render. Writes stay owner-only via the policies
-- below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects are addressed as `<user_id>/<file>`, so ownership is readable from the
-- first path segment without a join.
create or replace function public.storage_object_is_owned_by(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (storage.foldername(object_name))[1] = auth.uid()::text;
$$;

create policy "uploads are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert
  with check (public.storage_object_is_owned_by(name));

create policy "users replace their own avatar"
  on storage.objects for update
  using (public.storage_object_is_owned_by(name));

create policy "users delete their own avatar"
  on storage.objects for delete
  using (public.storage_object_is_owned_by(name));
