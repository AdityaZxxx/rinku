-- ADD VALUE cannot share a transaction with anything that uses the new
-- label, so the CHECK below casts kind to text instead of comparing enum
-- literals.
ALTER TYPE "public"."link_kind" ADD VALUE 'music';--> statement-breakpoint
ALTER TABLE "links" DROP CONSTRAINT "links_social_platform";--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_social_platform" CHECK (("links"."kind"::text = 'social' and "links"."platform" is not null) or ("links"."kind"::text = 'custom' and "links"."platform" is null) or ("links"."kind"::text = 'music' and "links"."platform" is null and "links"."metadata" is not null));
