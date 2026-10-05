-- ADD VALUE cannot share a transaction with anything that uses the new
-- label; the CHECK below casts kind to text, which is why both can sit
-- in one migration.
ALTER TYPE "public"."link_kind" ADD VALUE 'video';--> statement-breakpoint
ALTER TABLE "links" DROP CONSTRAINT "links_social_platform";--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_social_platform" CHECK (("links"."kind"::text = 'social' and "links"."platform" is not null) or ("links"."kind"::text = 'custom' and "links"."platform" is null) or ("links"."kind"::text in ('music', 'video') and "links"."platform" is null and "links"."metadata" is not null));