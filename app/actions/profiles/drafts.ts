"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { appearanceDrafts, profileDrafts, profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import { appearanceSchema } from "@/lib/profiles/appearance";
import { profileBasicsSchema, profileIdSchema } from "@/lib/profiles/schema";
import { cleanupSupersededImages } from "@/lib/profiles/storage-cleanup";
import { createClient } from "@/lib/supabase/server";

export async function saveProfileDraft(input: {
  profileId: string;
  title: string;
  bio: string;
  avatarPath?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = profileBasicsSchema
    .extend({
      profileId: z.uuid(),
      avatarPath: z.string().max(512).nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  // A field left out of the payload keeps its staged value; an explicit null
  // clears it. Text fields are always sent.
  const paths: Partial<typeof profileDrafts.$inferInsert> = {};
  if (parsed.data.avatarPath !== undefined) {
    paths.avatarPath = parsed.data.avatarPath;
  }

  try {
    await withUserDb(user.id, (tx) =>
      tx
        .insert(profileDrafts)
        .values({
          profileId: parsed.data.profileId,
          title: parsed.data.title.trim() || null,
          bio: parsed.data.bio.trim() || null,
          ...paths,
        })
        .onConflictDoUpdate({
          target: profileDrafts.profileId,
          set: {
            title: parsed.data.title.trim() || null,
            bio: parsed.data.bio.trim() || null,
            ...paths,
            updatedAt: new Date(),
          },
        }),
    );
  } catch (error) {
    log.error(
      "profiles",
      "saveProfileDraft failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Saving this draft failed. Try again." };
  }
  return { ok: true };
}

/** Stages the Appearance section. Owner-only via RLS. */
export async function saveAppearanceDraft(
  input: { profileId: string } & z.infer<typeof appearanceSchema>,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = appearanceSchema.extend({ profileId: z.uuid() }).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }
  const { profileId, ...values } = parsed.data;

  try {
    await withUserDb(user.id, (tx) =>
      tx
        .insert(appearanceDrafts)
        .values({ profileId, ...values })
        .onConflictDoUpdate({
          target: appearanceDrafts.profileId,
          set: { ...values, updatedAt: new Date() },
        }),
    );
  } catch (error) {
    log.error(
      "profiles",
      "saveAppearanceDraft failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Saving this draft failed. Try again." };
  }
  return { ok: true };
}

/**
 * Copies the Profile draft onto the live profile and clears it. A no-op when
 * there is no draft, so Publish is always safe to call.
 */
export async function publishProfileSection(input: {
  profileId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = profileIdSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Publishing failed. Try again." };
  }

  try {
    await withUserDb(user.id, async (tx) => {
      const [draft] = await tx
        .select()
        .from(profileDrafts)
        .where(eq(profileDrafts.profileId, parsed.data.profileId))
        .limit(1);
      if (!draft) {
        return;
      }
      // Read the old path first: the object it points at becomes obsolete the
      // moment the draft's path goes live.
      const [live] = await tx
        .select({ avatarPath: profiles.avatarPath })
        .from(profiles)
        .where(eq(profiles.id, parsed.data.profileId))
        .limit(1);

      // Only overwrite a path when the draft carries one, so publishing text
      // edits does not clear a photo that was never staged.
      const published: Partial<typeof profiles.$inferInsert> = {
        title: draft.title,
        bio: draft.bio,
        updatedAt: new Date(),
      };
      if (draft.avatarPath !== null) {
        published.avatarPath = draft.avatarPath;
      }
      await tx
        .update(profiles)
        .set(published)
        .where(eq(profiles.id, parsed.data.profileId));
      await tx
        .delete(profileDrafts)
        .where(eq(profileDrafts.profileId, parsed.data.profileId));

      // Delete only the object the draft superseded; anything else on disk is
      // still referenced (an abandoned upload keeps its file for storage
      // cleanup to sweep later).
      const superseded = [
        draft.avatarPath !== null &&
        live?.avatarPath &&
        live.avatarPath !== draft.avatarPath
          ? { bucket: "avatars", path: live.avatarPath }
          : null,
      ].filter((entry): entry is { bucket: string; path: string } => entry !== null);
      if (superseded.length > 0) {
        await cleanupSupersededImages(superseded);
      }
    });
  } catch (error) {
    log.error(
      "profiles",
      "publishProfileSection failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Publishing failed. Try again." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

export async function publishAppearanceSection(input: {
  profileId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = profileIdSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Publishing failed. Try again." };
  }

  try {
    await withUserDb(user.id, async (tx) => {
      const [draft] = await tx
        .select()
        .from(appearanceDrafts)
        .where(eq(appearanceDrafts.profileId, parsed.data.profileId))
        .limit(1);
      if (!draft) {
        return;
      }
      // Read the old paths first: the storage objects they point at become
      // obsolete the moment the draft's paths go live.
      const [live] = await tx
        .select({
          wallpaperImagePath: profiles.wallpaperImagePath,
          wallpaperVideoPath: profiles.wallpaperVideoPath,
          bannerPath: profiles.bannerPath,
        })
        .from(profiles)
        .where(eq(profiles.id, parsed.data.profileId))
        .limit(1);
      await tx
        .update(profiles)
        .set({
          themeId: draft.themeId,
          headerStyle: draft.headerStyle,
          bannerPath: draft.bannerPath,
          buttonContour: draft.buttonContour,
          buttonVariant: draft.buttonVariant,
          buttonUmbra: draft.buttonUmbra,
          buttonUmbraColor: draft.buttonUmbraColor,
          buttonColor: draft.buttonColor,
          buttonTextColor: draft.buttonTextColor,
          fontId: draft.fontId,
          titleColor: draft.titleColor,
          bodyColor: draft.bodyColor,
          wallpaperKind: draft.wallpaperKind,
          wallpaperColor: draft.wallpaperColor,
          wallpaperColorB: draft.wallpaperColorB,
          wallpaperPattern: draft.wallpaperPattern,
          wallpaperPatternSpacing: draft.wallpaperPatternSpacing,
          wallpaperPatternThickness: draft.wallpaperPatternThickness,
          linkEntrance: draft.linkEntrance,
          linkHover: draft.linkHover,
          pageAlignment: draft.pageAlignment,
          showUsername: draft.showUsername,
          wallpaperImagePath: draft.wallpaperImagePath,
          wallpaperVideoPath: draft.wallpaperVideoPath,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, parsed.data.profileId));
      await tx
        .delete(appearanceDrafts)
        .where(eq(appearanceDrafts.profileId, parsed.data.profileId));

      // Delete only the media the draft superseded: a replaced file, or a live
      // file whose staged removal just went public. Anything the draft kept
      // is still referenced.
      const superseded = [
        live?.wallpaperImagePath && draft.wallpaperImagePath !== live.wallpaperImagePath
          ? { bucket: "wallpapers", path: live.wallpaperImagePath }
          : null,
        live?.wallpaperVideoPath && draft.wallpaperVideoPath !== live.wallpaperVideoPath
          ? { bucket: "wallpapers", path: live.wallpaperVideoPath }
          : null,
        live?.bannerPath && draft.bannerPath !== live.bannerPath
          ? { bucket: "banners", path: live.bannerPath }
          : null,
      ].filter((entry): entry is { bucket: string; path: string } => entry !== null);
      if (superseded.length > 0) {
        await cleanupSupersededImages(superseded);
      }
    });
  } catch (error) {
    log.error(
      "profiles",
      "publishAppearanceSection failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Publishing failed. Try again." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}
