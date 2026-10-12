ALTER TABLE "appearance_drafts" DROP CONSTRAINT "appearance_drafts_header_style";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_header_style";--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD COLUMN "banner_path" text;--> statement-breakpoint
-- Banner ownership moves from the Profile draft to the Appearance draft.
-- Staged banners must survive the move: seed an appearance draft (from the
-- live row) where none exists, then copy onto the ones that do.
INSERT INTO "appearance_drafts" ("profile_id", "theme_id", "header_style", "banner_path", "button_shape", "button_style", "button_umbra", "button_color", "button_text_color", "font_id", "title_color", "body_color", "wallpaper_kind", "wallpaper_color", "wallpaper_color_b", "wallpaper_pattern", "wallpaper_pattern_spacing", "wallpaper_pattern_thickness", "link_entrance", "link_hover", "page_alignment", "wallpaper_image_path", "wallpaper_video_path", "updated_at")
SELECT p."id", p."theme_id", p."header_style", pd."banner_path", p."button_shape", p."button_style", p."button_umbra", p."button_color", p."button_text_color", p."font_id", p."title_color", p."body_color", p."wallpaper_kind", p."wallpaper_color", p."wallpaper_color_b", p."wallpaper_pattern", p."wallpaper_pattern_spacing", p."wallpaper_pattern_thickness", p."link_entrance", p."link_hover", p."page_alignment", p."wallpaper_image_path", p."wallpaper_video_path", now()
FROM "profile_drafts" pd
JOIN "profiles" p ON p."id" = pd."profile_id"
WHERE pd."banner_path" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "appearance_drafts" ad WHERE ad."profile_id" = pd."profile_id");--> statement-breakpoint
UPDATE "appearance_drafts" ad SET "banner_path" = pd."banner_path" FROM "profile_drafts" pd WHERE ad."profile_id" = pd."profile_id" AND pd."banner_path" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_drafts" DROP COLUMN "banner_path";--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_header_style" CHECK ("appearance_drafts"."header_style" in ('classic', 'hero', 'banner', 'cutout', 'minimal', 'statement'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_header_style" CHECK ("profiles"."header_style" in ('classic', 'hero', 'banner', 'cutout', 'minimal', 'statement'));--> statement-breakpoint
-- A classic header with a banner renders exactly the new "banner" recipe, so
-- those rows move over and no page changes overnight.
UPDATE "profiles" SET "header_style" = 'banner' WHERE "banner_path" IS NOT NULL AND "header_style" = 'classic';--> statement-breakpoint
UPDATE "appearance_drafts" SET "header_style" = 'banner' WHERE "banner_path" IS NOT NULL AND "header_style" = 'classic';