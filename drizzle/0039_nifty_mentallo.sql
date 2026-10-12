-- The DROPs are IF EXISTS because the live database has drifted from the
-- journal before (profiles_theme_id was missing while __drizzle_migrations
-- claimed every migration ran). The ADDs below restore the authoritative
-- state either way.
ALTER TABLE "appearance_drafts" DROP CONSTRAINT IF EXISTS "appearance_drafts_wallpaper_pattern_intensity";--> statement-breakpoint
ALTER TABLE "appearance_drafts" DROP CONSTRAINT IF EXISTS "appearance_drafts_theme_id";--> statement-breakpoint
ALTER TABLE "profile_drafts" DROP CONSTRAINT IF EXISTS "profile_drafts_header_style";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_wallpaper_pattern_intensity";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_header_style";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_theme_id";--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD COLUMN "wallpaper_pattern_spacing" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD COLUMN "link_entrance" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD COLUMN "link_hover" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD COLUMN "page_alignment" text DEFAULT 'center' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_pattern_spacing" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "link_entrance" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "link_hover" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "page_alignment" text DEFAULT 'center' NOT NULL;--> statement-breakpoint
ALTER TABLE "appearance_drafts" DROP COLUMN "wallpaper_pattern_intensity";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "wallpaper_pattern_intensity";--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_wallpaper_pattern_spacing" CHECK ("appearance_drafts"."wallpaper_pattern_spacing" between 1 and 4);--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_link_entrance" CHECK ("appearance_drafts"."link_entrance" in ('none', 'fade', 'rise', 'pop', 'slide'));--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_link_hover" CHECK ("appearance_drafts"."link_hover" in ('none', 'lift', 'scale', 'glow'));--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_page_alignment" CHECK ("appearance_drafts"."page_alignment" in ('center', 'left'));--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_theme_id" CHECK ("appearance_drafts"."theme_id" in ('air', 'charcoal', 'cream', 'mint', 'sky', 'sunset', 'ink', 'paper', 'candy', 'forest', 'ocean', 'lavender', 'coral', 'midnight', 'sand', 'berry', 'custom'));--> statement-breakpoint
-- The "left" and "banner" header layouts dissolved: "left" became the
-- page_alignment toggle and "banner" became classic-with-a-banner, so their
-- rows move to classic before the tightened CHECKs re-attach.
UPDATE "profile_drafts" SET "header_style" = 'classic' WHERE "header_style" in ('left', 'banner');--> statement-breakpoint
ALTER TABLE "profile_drafts" ADD CONSTRAINT "profile_drafts_header_style" CHECK ("profile_drafts"."header_style" in ('classic', 'hero', 'cutout', 'minimal', 'statement'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_wallpaper_pattern_spacing" CHECK ("profiles"."wallpaper_pattern_spacing" between 1 and 4);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_link_entrance" CHECK ("profiles"."link_entrance" in ('none', 'fade', 'rise', 'pop', 'slide'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_link_hover" CHECK ("profiles"."link_hover" in ('none', 'lift', 'scale', 'glow'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_page_alignment" CHECK ("profiles"."page_alignment" in ('center', 'left'));--> statement-breakpoint
UPDATE "profiles" SET "page_alignment" = 'left' WHERE "header_style" = 'left';--> statement-breakpoint
UPDATE "profiles" SET "header_style" = 'classic' WHERE "header_style" in ('left', 'banner');--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_header_style" CHECK ("profiles"."header_style" in ('classic', 'hero', 'cutout', 'minimal', 'statement'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_theme_id" CHECK ("profiles"."theme_id" in ('air', 'charcoal', 'cream', 'mint', 'sky', 'sunset', 'ink', 'paper', 'candy', 'forest', 'ocean', 'lavender', 'coral', 'midnight', 'sand', 'berry', 'custom'));