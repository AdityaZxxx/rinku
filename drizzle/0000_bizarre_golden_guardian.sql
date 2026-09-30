CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_title_length" CHECK (char_length("links"."title") between 1 and 100),
	CONSTRAINT "links_url_length" CHECK (char_length("links"."url") between 1 and 2048)
);
--> statement-breakpoint
ALTER TABLE "links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profile_usernames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"bio" text,
	"avatar_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_format" CHECK ("profiles"."username" ~ '^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$'),
	CONSTRAINT "profiles_username_length" CHECK (char_length("profiles"."username") between 3 and 30),
	CONSTRAINT "profiles_display_name_length" CHECK ("profiles"."display_name" is null or char_length("profiles"."display_name") <= 80),
	CONSTRAINT "profiles_bio_length" CHECK ("profiles"."bio" is null or char_length("profiles"."bio") <= 200)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_usernames" ADD CONSTRAINT "profile_usernames_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "links_profile_id_position_idx" ON "links" USING btree ("profile_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_usernames_active_key" ON "profile_usernames" USING btree ("username") WHERE "profile_usernames"."released_at" is null;--> statement-breakpoint
CREATE INDEX "profile_usernames_username_idx" ON "profile_usernames" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE POLICY "active links are public" ON "links" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("links"."is_active" or (select auth.uid()) = "links"."profile_id");--> statement-breakpoint
CREATE POLICY "users insert own links" ON "links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "links"."profile_id");--> statement-breakpoint
CREATE POLICY "users update own links" ON "links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "links"."profile_id") WITH CHECK ((select auth.uid()) = "links"."profile_id");--> statement-breakpoint
CREATE POLICY "users delete own links" ON "links" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "links"."profile_id");--> statement-breakpoint
CREATE POLICY "profiles are public" ON "profiles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "users insert own profile" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "users update own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "profiles"."id") WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "users delete own profile" ON "profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "profiles"."id");