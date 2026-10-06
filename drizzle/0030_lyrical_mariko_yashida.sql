CREATE TABLE "appearance_drafts" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"theme_id" text DEFAULT 'air' NOT NULL,
	"button_shape" text DEFAULT 'pill' NOT NULL,
	"button_style" text DEFAULT 'fill' NOT NULL,
	"button_umbra" text DEFAULT 'soft' NOT NULL,
	"button_color" text DEFAULT '#111111' NOT NULL,
	"button_text_color" text DEFAULT '#ffffff' NOT NULL,
	"font_id" text DEFAULT 'inter' NOT NULL,
	"title_color" text DEFAULT '#111111' NOT NULL,
	"body_color" text DEFAULT '#6e6e6e' NOT NULL,
	"wallpaper_kind" text DEFAULT 'fill' NOT NULL,
	"wallpaper_color" text DEFAULT '#ffffff' NOT NULL,
	"wallpaper_color_b" text DEFAULT '#f5f3ff' NOT NULL,
	"wallpaper_pattern" text DEFAULT 'dots' NOT NULL,
	"wallpaper_image_path" text,
	"wallpaper_video_path" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appearance_drafts_theme_id" CHECK ("appearance_drafts"."theme_id" in ('air', 'charcoal', 'cream', 'mint', 'sky', 'sunset', 'custom')),
	CONSTRAINT "appearance_drafts_button_shape" CHECK ("appearance_drafts"."button_shape" in ('sharp', 'soft', 'round', 'pill')),
	CONSTRAINT "appearance_drafts_button_style" CHECK ("appearance_drafts"."button_style" in ('fill', 'outline', 'soft', 'glass')),
	CONSTRAINT "appearance_drafts_button_umbra" CHECK ("appearance_drafts"."button_umbra" in ('none', 'soft', 'lift', 'hard')),
	CONSTRAINT "appearance_drafts_font_id" CHECK ("appearance_drafts"."font_id" in ('inter', 'noto-sans', 'plus-jakarta-sans', 'work-sans', 'dm-sans', 'karla', 'nunito', 'figtree', 'merriweather', 'playfair-display', 'lora', 'cormorant-garamond', 'source-serif-4', 'ibm-plex-mono', 'space-grotesk', 'fraunces')),
	CONSTRAINT "appearance_drafts_wallpaper_kind" CHECK ("appearance_drafts"."wallpaper_kind" in ('fill', 'gradient', 'blur', 'pattern', 'image', 'video')),
	CONSTRAINT "appearance_drafts_wallpaper_pattern" CHECK ("appearance_drafts"."wallpaper_pattern" in ('dots', 'grid', 'lines', 'waves'))
);
--> statement-breakpoint
ALTER TABLE "appearance_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profile_drafts" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"bio" text,
	"header_style" text DEFAULT 'classic' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_drafts_header_style" CHECK ("profile_drafts"."header_style" in ('classic', 'hero', 'banner', 'cutout', 'minimal', 'left', 'statement')),
	CONSTRAINT "profile_drafts_display_name_length" CHECK ("profile_drafts"."display_name" is null or char_length("profile_drafts"."display_name") <= 80),
	CONSTRAINT "profile_drafts_bio_length" CHECK ("profile_drafts"."bio" is null or char_length("profile_drafts"."bio") <= 200)
);
--> statement-breakpoint
ALTER TABLE "profile_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profile_editor_settings" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"links_save_mode" text DEFAULT 'auto' NOT NULL,
	"profile_save_mode" text DEFAULT 'auto' NOT NULL,
	"appearance_save_mode" text DEFAULT 'auto' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_editor_settings_links_save_mode" CHECK ("profile_editor_settings"."links_save_mode" in ('auto', 'manual')),
	CONSTRAINT "profile_editor_settings_profile_save_mode" CHECK ("profile_editor_settings"."profile_save_mode" in ('auto', 'manual')),
	CONSTRAINT "profile_editor_settings_appearance_save_mode" CHECK ("profile_editor_settings"."appearance_save_mode" in ('auto', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "profile_editor_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_drafts" ADD CONSTRAINT "profile_drafts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_editor_settings" ADD CONSTRAINT "profile_editor_settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "users read own appearance draft" ON "appearance_drafts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "appearance_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users insert own appearance draft" ON "appearance_drafts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (
    select 1 from "profiles"
    where "profiles"."id" = "appearance_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users update own appearance draft" ON "appearance_drafts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "appearance_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  )) WITH CHECK (exists (
    select 1 from "profiles"
    where "profiles"."id" = "appearance_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users delete own appearance draft" ON "appearance_drafts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "appearance_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users read own profile draft" ON "profile_drafts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users insert own profile draft" ON "profile_drafts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users update own profile draft" ON "profile_drafts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  )) WITH CHECK (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users delete own profile draft" ON "profile_drafts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_drafts"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users read own editor settings" ON "profile_editor_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_editor_settings"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users insert own editor settings" ON "profile_editor_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_editor_settings"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users update own editor settings" ON "profile_editor_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_editor_settings"."profile_id" and "profiles"."user_id" = (select auth.uid())
  )) WITH CHECK (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_editor_settings"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));--> statement-breakpoint
CREATE POLICY "users delete own editor settings" ON "profile_editor_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (
    select 1 from "profiles"
    where "profiles"."id" = "profile_editor_settings"."profile_id" and "profiles"."user_id" = (select auth.uid())
  ));