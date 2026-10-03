ALTER TABLE "profile_visits" ADD COLUMN "visitor_hash" text;--> statement-breakpoint
DROP FUNCTION IF EXISTS public.record_profile_visit(uuid);--> statement-breakpoint
create or replace function public.record_profile_visit(profile_id uuid, visitor_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_visits (profile_id, visitor_hash)
  select id, visitor_hash
  from public.profiles
  where id = profile_id
    and not exists (
      select 1 from public.profile_visits
      where profile_visits.profile_id = record_profile_visit.profile_id
        and profile_visits.visitor_hash = record_profile_visit.visitor_hash
        and profile_visits.created_at > now() - interval '24 hours'
    );
$$;--> statement-breakpoint
grant execute on function public.record_profile_visit(uuid, text) to anon, authenticated;