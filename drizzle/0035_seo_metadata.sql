-- Crawler-facing overrides for the public page's <head>. Every column is
-- nullable because null means "derive it" — the title from display name and
-- handle, the description from bio, the share image from banner then avatar —
-- so an existing profile's public metadata is unchanged until its owner edits.
-- They sit on the world-readable row because search engines must read them.
--
-- `search_indexing` is an opt-out: true emits index, follow; false emits noindex
-- while still following links. The CHECKs mirror the lengths the settings form
-- enforces, so a bad value cannot be stored out of band.

ALTER TABLE "profiles" ADD COLUMN "meta_title" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "keywords" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "search_indexing" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "og_image_path" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_meta_title_length" CHECK ("profiles"."meta_title" is null or char_length("profiles"."meta_title") <= 70);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_meta_description_length" CHECK ("profiles"."meta_description" is null or char_length("profiles"."meta_description") <= 160);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_keywords_length" CHECK ("profiles"."keywords" is null or char_length("profiles"."keywords") <= 200);--> statement-breakpoint

-- Custom social share images get their own public bucket. The path convention
-- and policies mirror the other upload buckets: the first path segment is the
-- profile id, so ownership reads straight from the object name.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'og-images', 'og-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint

create policy "og images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'og-images');--> statement-breakpoint

create policy "users upload their own og image"
  on storage.objects for insert
  with check (bucket_id = 'og-images' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users replace their own og image"
  on storage.objects for update
  using (bucket_id = 'og-images' and public.storage_object_is_owned_by(name));--> statement-breakpoint

create policy "users delete their own og image"
  on storage.objects for delete
  using (bucket_id = 'og-images' and public.storage_object_is_owned_by(name));
