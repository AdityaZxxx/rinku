-- /projects is an app route, not a username: the workspace namespace. A route
-- claimed by a profile would shadow the route itself. The signed-in half of
-- this list mirrors PROTECTED_ROUTES in proxy.ts.
create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'admin', 'api', 'about', 'account', 'analytics', 'appearance', 'auth',
    'blog', 'dashboard', 'help', 'links', 'login', 'logout', 'me', 'pricing',
    'privacy', 'projects', 'settings', 'signin', 'signout', 'signup',
    'support', 'terms', 'www'
  ]);
$$;
