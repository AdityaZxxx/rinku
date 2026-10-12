ALTER TABLE "appearance_drafts" ADD COLUMN "wallpaper_pattern_intensity" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD COLUMN "wallpaper_pattern_thickness" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_pattern_intensity" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_pattern_thickness" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_wallpaper_pattern_intensity" CHECK ("appearance_drafts"."wallpaper_pattern_intensity" between 0 and 100);--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_wallpaper_pattern_thickness" CHECK ("appearance_drafts"."wallpaper_pattern_thickness" between 1 and 4);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_wallpaper_pattern_intensity" CHECK ("profiles"."wallpaper_pattern_intensity" between 0 and 100);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_wallpaper_pattern_thickness" CHECK ("profiles"."wallpaper_pattern_thickness" between 1 and 4);