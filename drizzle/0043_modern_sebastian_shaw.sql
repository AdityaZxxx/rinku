ALTER TABLE "appearance_drafts" ADD COLUMN "show_username" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_username" boolean DEFAULT false NOT NULL;