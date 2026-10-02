-- /:username/profile is the profile's data editor, so the path must be
-- reserved the same way the other edit sections are: a profile could
-- otherwise claim it.
create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'admin', 'api', 'about', 'account', 'analytics', 'appearance', 'auth',
    'blog', 'dashboard', 'help', 'links', 'login', 'logout', 'me', 'onboarding',
    'overview', 'pricing', 'privacy', 'profile', 'settings', 'signin', 'signout',
    'signup', 'support', 'terms', 'www'
  ]);
$$;
