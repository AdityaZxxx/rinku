ALTER TABLE "profile_drafts" DROP CONSTRAINT "profile_drafts_display_name_length";--> statement-breakpoint
ALTER TABLE "profile_drafts" DROP CONSTRAINT "profile_drafts_bio_length";--> statement-breakpoint
ALTER TABLE "profile_drafts" ADD CONSTRAINT "profile_drafts_display_name_length" CHECK ("profile_drafts"."display_name" is null or char_length("profile_drafts"."display_name") <= 50);--> statement-breakpoint
ALTER TABLE "profile_drafts" ADD CONSTRAINT "profile_drafts_bio_length" CHECK ("profile_drafts"."bio" is null or char_length("profile_drafts"."bio") <= 150);