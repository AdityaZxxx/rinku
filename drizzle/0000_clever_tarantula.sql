CREATE TABLE "link_clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"link_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"country" text,
	"device" text,
	"referrer_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link_clicks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
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
CREATE TABLE "profile_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"country" text,
	"device" text,
	"referrer_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"bio" text,
	"avatar_path" text,
	"background_path" text,
	"theme" text DEFAULT 'minimal' NOT NULL,
	"accent_color" text DEFAULT '#6366f1' NOT NULL,
	"background_type" text DEFAULT 'gradient' NOT NULL,
	"background_value" text DEFAULT 'from-indigo-500 via-purple-500 to-pink-500' NOT NULL,
	"font" text DEFAULT 'inter' NOT NULL,
	"button_style" text DEFAULT 'rounded' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_format" CHECK ("profiles"."username" ~ '^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$'),
	CONSTRAINT "profiles_username_length" CHECK (char_length("profiles"."username") between 3 and 30),
	CONSTRAINT "profiles_display_name_length" CHECK ("profiles"."display_name" is null or char_length("profiles"."display_name") <= 80),
	CONSTRAINT "profiles_bio_length" CHECK ("profiles"."bio" is null or char_length("profiles"."bio") <= 200),
	CONSTRAINT "profiles_accent_color_format" CHECK ("profiles"."accent_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "profiles_theme_valid" CHECK ("profiles"."theme" in ('minimal', 'gradient', 'card', 'glass', 'bold')),
	CONSTRAINT "profiles_font_valid" CHECK ("profiles"."font" in ('inter', 'poppins', 'space-grotesk', 'playfair', 'jetbrains')),
	CONSTRAINT "profiles_button_style_valid" CHECK ("profiles"."button_style" in ('rounded', 'pill', 'square', 'outline', 'soft')),
	CONSTRAINT "profiles_background_type_valid" CHECK ("profiles"."background_type" in ('gradient', 'solid', 'image'))
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_clicks" ADD CONSTRAINT "link_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_clicks_user_created_idx" ON "link_clicks" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "link_clicks_link_created_idx" ON "link_clicks" USING btree ("link_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "links_user_id_position_idx" ON "links" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "profile_views_user_created_idx" ON "profile_views" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE POLICY "users read own clicks" ON "link_clicks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "link_clicks"."user_id");--> statement-breakpoint
CREATE POLICY "active links are public" ON "links" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("links"."is_active" or (select auth.uid()) = "links"."user_id");--> statement-breakpoint
CREATE POLICY "users insert own links" ON "links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "links"."user_id");--> statement-breakpoint
CREATE POLICY "users update own links" ON "links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "links"."user_id") WITH CHECK ((select auth.uid()) = "links"."user_id");--> statement-breakpoint
CREATE POLICY "users delete own links" ON "links" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "links"."user_id");--> statement-breakpoint
CREATE POLICY "users read own views" ON "profile_views" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profile_views"."user_id");--> statement-breakpoint
CREATE POLICY "profiles are public" ON "profiles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "users insert own profile" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "users update own profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "profiles"."id") WITH CHECK ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "users delete own profile" ON "profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "profiles"."id");