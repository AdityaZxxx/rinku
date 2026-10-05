ALTER TABLE "links" ADD COLUMN "visible_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "visible_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_visible_window" CHECK ("links"."visible_from" is null or "links"."visible_until" is null or "links"."visible_from" <= "links"."visible_until");--> statement-breakpoint
ALTER POLICY "active links are public" ON "links" TO anon,authenticated USING (("links"."is_active" and "links"."archived_at" is null
          and ("links"."visible_from" is null or "links"."visible_from" <= now())
          and ("links"."visible_until" is null or "links"."visible_until" > now())) or exists (
        select 1 from "profiles"
        where "profiles"."id" = "links"."profile_id" and "profiles"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
create or replace function public.record_click(link_id uuid)
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
  insert into public.link_clicks (link_id)
  select id from tracked;
$$;