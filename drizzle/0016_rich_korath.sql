CREATE TYPE "link_kind" AS ENUM ('custom', 'social');--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "kind" "link_kind" DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_social_platform" CHECK (("links"."kind" = 'social' and "links"."platform" is not null) or ("links"."kind" = 'custom' and "links"."platform" is null));