-- Featured-link images get their own public bucket. The path convention and
-- policies mirror the banners bucket: the first path segment is the profile id,
-- so ownership reads straight from the object name.
-- Covers are bigger than avatars, so they get their own bucket and limit; the
-- path convention and policies mirror the avatars bucket (first path segment
-- is the account id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'link-images', 'link-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint

create policy "link images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'link-images');--> statement-breakpoint

create policy "users upload their own link image"
  on storage.objects for insert
  with check (bucket_id = 'link-images' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users replace their own link image"
  on storage.objects for update
  using (bucket_id = 'link-images' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users delete their own link image"
  on storage.objects for delete
  using (bucket_id = 'link-images' and public.storage_object_is_owned_by(name));
