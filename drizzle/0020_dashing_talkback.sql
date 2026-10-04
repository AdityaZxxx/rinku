ALTER TABLE "profiles" ADD COLUMN "theme_id" text DEFAULT 'air' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "button_shape" text DEFAULT 'pill' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "button_style" text DEFAULT 'fill' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_theme_id" CHECK ("profiles"."theme_id" in ('air', 'charcoal', 'cream', 'mint', 'sky', 'sunset'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_button_shape" CHECK ("profiles"."button_shape" in ('pill', 'rounded', 'sharp'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_button_style" CHECK ("profiles"."button_style" in ('fill', 'outline', 'soft', 'shadow'));