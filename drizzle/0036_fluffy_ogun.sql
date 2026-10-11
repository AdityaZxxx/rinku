ALTER TABLE "links" DROP CONSTRAINT "links_title_length";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_display_name_length";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_bio_length";--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_title_length" CHECK (char_length(btrim("links"."title")) between 1 and 100);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_display_name_length" CHECK ("profiles"."display_name" is null or char_length("profiles"."display_name") <= 50);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_bio_length" CHECK ("profiles"."bio" is null or char_length("profiles"."bio") <= 150);