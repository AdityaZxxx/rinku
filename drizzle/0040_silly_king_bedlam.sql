ALTER TABLE "profile_drafts" DROP CONSTRAINT "profile_drafts_header_style";--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD COLUMN "header_style" text DEFAULT 'classic' NOT NULL;--> statement-breakpoint
-- Header choices staged on the Profile draft move to the Appearance draft,
-- where the setting now lives. Only rows with both drafts can carry a staged
-- choice; the rest keep their live header_style, which is already valid.
UPDATE "appearance_drafts" SET "header_style" = "profile_drafts"."header_style" FROM "profile_drafts" WHERE "appearance_drafts"."profile_id" = "profile_drafts"."profile_id";--> statement-breakpoint
ALTER TABLE "profile_drafts" DROP COLUMN "header_style";--> statement-breakpoint
ALTER TABLE "appearance_drafts" ADD CONSTRAINT "appearance_drafts_header_style" CHECK ("appearance_drafts"."header_style" in ('classic', 'hero', 'cutout', 'minimal', 'statement'));