ALTER TABLE "appearance_drafts" ADD COLUMN "button_umbra_color" text DEFAULT '#111111' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "button_umbra_color" text DEFAULT '#111111' NOT NULL;--> statement-breakpoint
-- The hard umbra used to read its edge from title_color; seed the new column
-- from there so no published page changes rendering.
UPDATE "appearance_drafts" SET "button_umbra_color" = "title_color";--> statement-breakpoint
UPDATE "profiles" SET "button_umbra_color" = "title_color";