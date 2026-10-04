ALTER TABLE "profiles" DROP CONSTRAINT "profiles_theme_id";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_button_shape";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_button_style";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "button_umbra" text DEFAULT 'soft' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "button_color" text DEFAULT '#111111' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "button_text_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "font_id" text DEFAULT 'inter' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "title_color" text DEFAULT '#111111' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "body_color" text DEFAULT '#6e6e6e' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_kind" text DEFAULT 'fill' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_color_b" text DEFAULT '#f5f3ff' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_pattern" text DEFAULT 'dots' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_image_path" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wallpaper_video_path" text;--> statement-breakpoint
UPDATE "profiles" SET "button_shape" = 'round' WHERE "button_shape" = 'rounded';--> statement-breakpoint
UPDATE "profiles" SET "button_style" = 'fill', "button_umbra" = 'hard' WHERE "button_style" = 'shadow';--> statement-breakpoint
UPDATE "profiles" SET "button_color" = '#fafafa', "button_text_color" = '#101010', "title_color" = '#fafafa', "body_color" = '#a8a8a8', "wallpaper_kind" = 'fill', "wallpaper_color" = '#101010', "wallpaper_color_b" = '#262626' WHERE "theme_id" = 'charcoal';--> statement-breakpoint
UPDATE "profiles" SET "button_color" = '#1c1917', "button_text_color" = '#faf6ee', "font_id" = 'merriweather', "title_color" = '#1c1917', "body_color" = '#78716c', "wallpaper_kind" = 'fill', "wallpaper_color" = '#faf6ee', "wallpaper_color_b" = '#efe6d8' WHERE "theme_id" = 'cream';--> statement-breakpoint
UPDATE "profiles" SET "button_color" = '#0d3b2e', "button_text_color" = '#eafff5', "font_id" = 'nunito', "title_color" = '#0d3b2e', "body_color" = '#4a7a6c', "wallpaper_kind" = 'fill', "wallpaper_color" = '#d9f2e6', "wallpaper_color_b" = '#bfe6d4' WHERE "theme_id" = 'mint';--> statement-breakpoint
UPDATE "profiles" SET "button_color" = '#0f172a', "button_text_color" = '#ffffff', "title_color" = '#0f172a', "body_color" = '#5b6b85', "wallpaper_kind" = 'gradient', "wallpaper_color" = '#e0f2ff', "wallpaper_color_b" = '#f5f3ff' WHERE "theme_id" = 'sky';--> statement-breakpoint
UPDATE "profiles" SET "button_color" = '#ffffff', "button_text_color" = '#2b1055', "button_umbra" = 'hard', "title_color" = '#ffffff', "body_color" = '#f1e4ff', "wallpaper_kind" = 'gradient', "wallpaper_color" = '#ff9a7a', "wallpaper_color_b" = '#7a5cff' WHERE "theme_id" = 'sunset';--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_button_umbra" CHECK ("profiles"."button_umbra" in ('none', 'soft', 'lift', 'hard'));--> statement-breakpoint
UPDATE "profiles" SET "font_id" = 'inter' WHERE "font_id" = 'sans';--> statement-breakpoint
UPDATE "profiles" SET "font_id" = 'merriweather' WHERE "font_id" = 'serif';--> statement-breakpoint
UPDATE "profiles" SET "font_id" = 'nunito' WHERE "font_id" = 'round';--> statement-breakpoint
UPDATE "profiles" SET "font_id" = 'ibm-plex-mono' WHERE "font_id" = 'mono';--> statement-breakpoint
UPDATE "profiles" SET "font_id" = 'nunito' WHERE "theme_id" = 'mint' AND "font_id" IN ('inter', 'sans');--> statement-breakpoint
UPDATE "profiles" SET "font_id" = 'merriweather' WHERE "theme_id" = 'cream' AND "font_id" IN ('inter', 'sans');--> statement-breakpoint
UPDATE "profiles" SET "font_id" = 'fraunces' WHERE "font_id" = 'display';--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_font_id" CHECK ("profiles"."font_id" in ('inter', 'noto-sans', 'plus-jakarta-sans', 'work-sans', 'dm-sans', 'karla', 'nunito', 'figtree', 'merriweather', 'playfair-display', 'lora', 'cormorant-garamond', 'source-serif-4', 'ibm-plex-mono', 'space-grotesk', 'fraunces'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_wallpaper_kind" CHECK ("profiles"."wallpaper_kind" in ('fill', 'gradient', 'blur', 'pattern', 'image', 'video'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_wallpaper_pattern" CHECK ("profiles"."wallpaper_pattern" in ('dots', 'grid', 'lines', 'waves'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_theme_id" CHECK ("profiles"."theme_id" in ('air', 'charcoal', 'cream', 'mint', 'sky', 'sunset', 'custom'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_button_shape" CHECK ("profiles"."button_shape" in ('sharp', 'soft', 'round', 'pill'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_button_style" CHECK ("profiles"."button_style" in ('fill', 'outline', 'soft', 'glass'));