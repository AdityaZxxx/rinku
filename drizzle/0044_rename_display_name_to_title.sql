ALTER TABLE "profiles" RENAME COLUMN "display_name" TO "title";--> statement-breakpoint
ALTER TABLE "profiles" RENAME CONSTRAINT "profiles_display_name_length" TO "profiles_title_length";--> statement-breakpoint
ALTER TABLE "profile_drafts" RENAME COLUMN "display_name" TO "title";--> statement-breakpoint
ALTER TABLE "profile_drafts" RENAME CONSTRAINT "profile_drafts_display_name_length" TO "profile_drafts_title_length";
