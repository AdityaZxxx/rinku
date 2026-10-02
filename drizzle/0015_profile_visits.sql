CREATE TABLE "profile_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile_visits" ADD CONSTRAINT "profile_visits_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_visits_profile_id_created_at_idx" ON "profile_visits" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE POLICY "users read own visits" ON "profile_visits" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from "profiles"
        where "profiles"."id" = "profile_visits"."profile_id" and "profiles"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
create or replace function public.record_profile_visit(profile_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_visits (profile_id)
  select id from public.profiles where id = profile_id;
$$;
grant execute on function public.record_profile_visit(uuid) to anon, authenticated;
