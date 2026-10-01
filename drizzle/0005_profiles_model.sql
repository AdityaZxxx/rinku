ALTER TABLE "profiles" DROP CONSTRAINT "profiles_id_fkey";
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "user_id" uuid;--> statement-breakpoint
-- The one existing profile keeps working: its id is the account id, so the
-- backfill is a copy, and the URL and username history are untouched.
UPDATE "profiles" SET "user_id" = "id";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER POLICY "active links are public" ON "links" TO anon,authenticated USING ("links"."is_active" or exists (
        select 1 from "profiles"
        where "profiles"."id" = "links"."profile_id" and "profiles"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "users insert own links" ON "links" TO authenticated WITH CHECK (exists (
        select 1 from "profiles"
        where "profiles"."id" = "links"."profile_id" and "profiles"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "users update own links" ON "links" TO authenticated USING (exists (
        select 1 from "profiles"
        where "profiles"."id" = "links"."profile_id" and "profiles"."user_id" = (select auth.uid())
      )) WITH CHECK (exists (
        select 1 from "profiles"
        where "profiles"."id" = "links"."profile_id" and "profiles"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "users delete own links" ON "links" TO authenticated USING (exists (
        select 1 from "profiles"
        where "profiles"."id" = "links"."profile_id" and "profiles"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "users insert own profile" ON "profiles" TO authenticated WITH CHECK ((select auth.uid()) = "profiles"."user_id");--> statement-breakpoint
ALTER POLICY "users update own profile" ON "profiles" TO authenticated USING ((select auth.uid()) = "profiles"."user_id") WITH CHECK ((select auth.uid()) = "profiles"."user_id");--> statement-breakpoint
ALTER POLICY "users delete own profile" ON "profiles" TO authenticated USING ((select auth.uid()) = "profiles"."user_id");