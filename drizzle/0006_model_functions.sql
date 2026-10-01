-- The first profile is created through onboarding, not at signup: dropping the
-- signup trigger makes a fresh account own zero profiles, which the app's
-- empty state then handles.
drop trigger on_auth_user_created on auth.users;
drop function public.handle_new_user();

-- Avatars are per-profile now: each profile's page shows its own avatar, so
-- ownership is "the folder is a profile this account owns" instead of "the
-- folder is my user id". The bucket is still empty, so no object moves.
create or replace function public.storage_object_is_owned_by(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = (storage.foldername(object_name))[1]
      and p.user_id = auth.uid()
  );
$$;
