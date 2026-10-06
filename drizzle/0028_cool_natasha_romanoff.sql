ALTER TABLE "links" ADD COLUMN "min_age" integer;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_min_age" CHECK ("links"."min_age" is null or ("links"."min_age" between 13 and 99));