ALTER TABLE "links" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER POLICY "active links are public" ON "links" TO anon,authenticated USING (("links"."is_active" and "links"."archived_at" is null) or exists (
        select 1 from "profiles"
        where "profiles"."id" = "links"."profile_id" and "profiles"."user_id" = (select auth.uid())
      ));