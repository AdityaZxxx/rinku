-- Everything the Drizzle schema cannot express: triggers, SECURITY DEFINER
-- functions, and Storage objects.
--
-- Drizzle owns tables, indexes, and RLS policies. This file owns behaviour that
-- must exist in the database itself because the application cannot be trusted to
-- provide it: lowercasing a username, refusing reserved names, creating a
-- profile on signup, and validating that a click belongs to the link it claims.

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger links_touch_updated_at
  before update on public.links
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- username hygiene
-- ---------------------------------------------------------------------------

-- Paths that belong to the app itself. Without this a profile could claim
-- "login" and shadow the sign-in route.
--
-- Kept in sync with RESERVED_USERNAMES in lib/db/schema.ts. If you add a route,
-- add it here too.
create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'admin', 'api', 'about', 'account', 'auth', 'blog', 'dashboard', 'help',
    'login', 'logout', 'me', 'pricing', 'privacy', 'settings', 'signin',
    'signout', 'signup', 'support', 'terms', 'www'
  ]);
$$;

-- Normalizes case and rejects reserved names here rather than relying on the
-- unique index, so the user sees "That username is reserved" instead of a raw
-- 23505 unique violation.
create or replace function public.normalize_username()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.username := lower(trim(both '-' from btrim(new.username)));

  if public.username_is_reserved(new.username) then
    raise exception 'That username is reserved.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger profiles_normalize_username
  before insert or update of username on public.profiles
  for each row execute function public.normalize_username();

-- ---------------------------------------------------------------------------
-- profile bootstrap on signup
-- ---------------------------------------------------------------------------

-- Derives a URL segment from the email local part and walks a numeric suffix
-- until it is free. Doing this in a signup trigger means a profile row always
-- exists by the time a user's first render runs, so no page needs a lazy-create
-- fallback that could race two requests.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
begin
  base := trim(both '-' from
    regexp_replace(
      lower(split_part(coalesce(new.email, new.id::text), '@', 1)),
      '[^a-z0-9_-]+', '-', 'g'
    )
  );

  if char_length(base) < 3 then
    base := 'user';
  end if;

  base := left(base, 24);
  candidate := base;

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 28 - char_length(suffix::text)) || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- anonymous write paths
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so an anonymous visitor can record an event without holding
-- any policy grant. Ownership is derived from the link row, never accepted from
-- the caller, which is what stops someone inflating another user's numbers.
create or replace function public.record_click(
  target_link_id uuid,
  visitor_country text default null,
  visitor_device text default null,
  visitor_referrer_host text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.link_clicks (link_id, user_id, country, device, referrer_host)
  select id, user_id, visitor_country, visitor_device, visitor_referrer_host
  from public.links
  where id = target_link_id and is_active;
$$;

create or replace function public.record_profile_view(
  target_profile_id uuid,
  visitor_country text default null,
  visitor_device text default null,
  visitor_referrer_host text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_views (user_id, country, device, referrer_host)
  values (target_profile_id, visitor_country, visitor_device, visitor_referrer_host);
$$;

-- Revoke from public first, then grant exactly the two roles that need it.
revoke all on function public.record_click(uuid, text, text, text) from public;
revoke all on function public.record_profile_view(uuid, text, text, text) from public;
grant execute on function public.record_click(uuid, text, text, text) to anon, authenticated;
grant execute on function public.record_profile_view(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Both buckets are public: an avatar and a profile background are meant to be
-- seen by anyone who visits the page, and a public bucket lets next/image fetch
-- through a plain CDN URL instead of a signed-URL round trip on every render.
-- Writes stay owner-only, which is what the policies below enforce.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'backgrounds', 'backgrounds', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on bucket public.avatars is 'Profile pictures, stored as <user_id>/<file>.';

-- Objects are addressed as `<user_id>/<file>`, so ownership can be read straight
-- off the first path segment. That keeps each policy a single expression instead
-- of a join against a table.
create or replace function public.storage_object_is_owned_by(bucket text, object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (storage.foldername(object_name))[1] = auth.uid()::text
    and bucket = any (array['avatars', 'backgrounds']);
$$;

create policy "uploads are publicly readable"
  on storage.objects for select
  using (bucket_id in ('avatars', 'backgrounds'));

create policy "users upload to their own folder"
  on storage.objects for insert
  with check (public.storage_object_is_owned_by(bucket_id, name));

create policy "users update their own uploads"
  on storage.objects for update
  using (public.storage_object_is_owned_by(bucket_id, name));

create policy "users delete their own uploads"
  on storage.objects for delete
  using (public.storage_object_is_owned_by(bucket_id, name));
