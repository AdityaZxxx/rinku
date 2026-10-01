-- /projects belonged to a model that was dropped; the route no longer exists,
-- so the word returns to the username pool. /onboarding is a new app route and
-- must be reserved for the same reason the rest are.
create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'admin', 'api', 'about', 'account', 'analytics', 'appearance', 'auth',
    'blog', 'dashboard', 'help', 'links', 'login', 'logout', 'me', 'onboarding',
    'pricing', 'privacy', 'settings', 'signin', 'signout', 'signup', 'support',
    'terms', 'www'
  ]);
$$;
