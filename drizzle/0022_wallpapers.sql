-- Page wallpapers get their own public bucket. The path convention and
-- policies mirror the banners bucket: the first path segment is the profile id,
-- so ownership reads straight from the object name. Images and short looping
-- videos share one bucket; the app enforces the tighter per-kind size limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wallpapers', 'wallpapers', true, 33554432,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint

create policy "wallpapers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'wallpapers');--> statement-breakpoint

create policy "users upload their own wallpaper"
  on storage.objects for insert
  with check (bucket_id = 'wallpapers' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users replace their own wallpaper"
  on storage.objects for update
  using (bucket_id = 'wallpapers' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users delete their own wallpaper"
  on storage.objects for delete
  using (bucket_id = 'wallpapers' and public.storage_object_is_owned_by(name));
