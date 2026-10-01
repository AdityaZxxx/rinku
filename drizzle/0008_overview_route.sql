-- /overview is a new app route (the profile's edit context lands here, so the
-- root's default is a real page instead of /links) and must be reserved for
-- the same reason the rest are: a profile could otherwise claim the path.
create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'admin', 'api', 'about', 'account', 'analytics', 'appearance', 'auth',
    'blog', 'dashboard', 'help', 'links', 'login', 'logout', 'me', 'onboarding',
    'overview', 'pricing', 'privacy', 'settings', 'signin', 'signout', 'signup',
    'support', 'terms', 'www'
  ]);
$$;
