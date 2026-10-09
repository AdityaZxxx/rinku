ALTER TABLE "link_clicks" ADD COLUMN "visitor_hash" text;--> statement-breakpoint
ALTER TABLE "profile_visits" ADD COLUMN "referrer" text;--> statement-breakpoint
drop function if exists public.record_profile_visit(uuid, text);--> statement-breakpoint
create or replace function public.record_profile_visit(profile_id uuid, visitor_hash text, referrer text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_visits (profile_id, visitor_hash, referrer)
  select id, visitor_hash, referrer
  from public.profiles
  where id = profile_id
    and not exists (
      select 1 from public.profile_visits
      where profile_visits.profile_id = record_profile_visit.profile_id
        and profile_visits.visitor_hash = record_profile_visit.visitor_hash
        and profile_visits.created_at > now() - interval '24 hours'
    );
$$;--> statement-breakpoint
grant execute on function public.record_profile_visit(uuid, text, text) to anon, authenticated;--> statement-breakpoint
drop function if exists public.record_click(uuid);--> statement-breakpoint
create or replace function public.record_click(link_id uuid, visitor_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  with tracked as (
    update public.links
    set click_count = click_count + 1
    where id = link_id
      and is_active
      and archived_at is null
      and (visible_from is null or visible_from <= now())
      and (visible_until is null or visible_until > now())
    returning id
  )
  insert into public.link_clicks (link_id, visitor_hash)
  select id, visitor_hash from tracked;
$$;--> statement-breakpoint
grant execute on function public.record_click(uuid, text) to anon, authenticated;
