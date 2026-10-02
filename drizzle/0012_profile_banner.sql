ALTER TABLE "profiles" ADD COLUMN "banner_path" text;--> statement-breakpoint

-- Covers are bigger than avatars, so they get their own bucket and limit; the
-- path convention and policies mirror the avatars bucket (first path segment
-- is the account id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners', 'banners', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint

create policy "banners are publicly readable"
  on storage.objects for select
  using (bucket_id = 'banners');--> statement-breakpoint

create policy "users upload their own banner"
  on storage.objects for insert
  with check (bucket_id = 'banners' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users replace their own banner"
  on storage.objects for update
  using (bucket_id = 'banners' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users delete their own banner"
  on storage.objects for delete
  using (bucket_id = 'banners' and public.storage_object_is_owned_by(name));
