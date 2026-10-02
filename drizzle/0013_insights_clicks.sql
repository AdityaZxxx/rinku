ALTER TABLE "links" ADD COLUMN "click_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- /insights replaces /analytics and /go is the click-through redirect: both
-- are app routes, so usernames must not be able to claim them.
create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'admin', 'api', 'about', 'account', 'appearance', 'auth',
    'blog', 'dashboard', 'go', 'help', 'insights', 'links', 'login', 'logout',
    'me', 'onboarding', 'overview', 'pricing', 'privacy', 'settings',
    'signin', 'signout', 'signup', 'support', 'terms', 'www'
  ]);
$$;
--> statement-breakpoint
-- Click-through counter. SECURITY DEFINER so the anon role can record a click
-- without UPDATE rights on links; it still only touches a publicly visible
-- row, so drafts cannot be inflated.
create or replace function public.record_click(link_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.links
  set click_count = click_count + 1
  where id = link_id
    and is_active
    and archived_at is null;
$$;
grant execute on function public.record_click(uuid) to anon, authenticated;
