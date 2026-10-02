CREATE TABLE "link_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link_clicks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_clicks_link_id_created_at_idx" ON "link_clicks" USING btree ("link_id","created_at");--> statement-breakpoint
CREATE POLICY "users read own link clicks" ON "link_clicks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from "links"
          join "profiles" on "profiles"."id" = "links"."profile_id"
        where "links"."id" = "link_clicks"."link_id" and "profiles"."user_id" = (select auth.uid())
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
    returning id
  )
  insert into public.link_clicks (link_id)
  select id from tracked;
$$;
