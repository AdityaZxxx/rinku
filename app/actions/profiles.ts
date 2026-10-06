"use server";

import { updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";

import { appearanceSchema } from "@/lib/appearance";
import { getSaveMode } from "@/lib/db/editor";
import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import {
  appearanceDrafts,
  profileDrafts,
  profileEditorSettings,
  profiles,
  type Profile,
} from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { appearanceDraftFromProfile } from "@/lib/editor-draft";
import { log } from "@/lib/log";
import {
  imageExtension,
  imageMaxBytes,
  profileBasicsSchema,
  editorAreas,
  saveModeSchema,
  usernameSchema,
  videoExtension,
  type EditorArea,
  type ReservedUsername,
} from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

/**
 * Best-effort removal of storage objects a draft superseded. Failures are
 * logged, never surfaced: the publish already committed, and an orphaned
 * object is a storage concern, not a correctness one.
 */
async function cleanupSupersededImages(
  entries: Array<{ bucket: string; path: string }>,
): Promise<void> {
  const supabase = await createClient();
  const byBucket = new Map<string, string[]>();
  for (const { bucket, path } of entries) {
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  }
  await Promise.all(
    [...byBucket].map(async ([bucket, paths]) => {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        log.error("profiles", `cleanupSupersededImages ${bucket} failed`, error.message);
      }
    }),
  );
}

export async function renameProfile(input: {
  username: string;
  newUsername: string;
  // When true the outgoing handle is reserved for the owner for the cooldown
  // window; otherwise it is freed immediately. Defaults to freeing immediately.
  keepOldUsername?: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({
      username: z.string(),
      newUsername: usernameSchema,
      keepOldUsername: z.boolean().optional().default(false),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That username is not valid." };
  }

  let renamed: { id: string }[];
  try {
    renamed = await withUserDb(user.id, async (tx) => {
      // The history trigger reads this to decide whether to reserve the
      // outgoing handle. Transaction-local (`true`), so it cannot leak to the
      // next request on a pooled connection.
      await tx.execute(
        sql`select set_config('rinku.keep_old_username', ${String(parsed.data.keepOldUsername)}, true)`,
      );
      return tx
        .update(profiles)
        .set({ username: parsed.data.newUsername, updatedAt: new Date() })
        .where(
          and(eq(profiles.username, parsed.data.username), eq(profiles.userId, user.id)),
        )
        .returning({ id: profiles.id });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("reserved")) {
      return { error: "That username is reserved." };
    }
    if (message.includes("taken")) {
      return { error: "That username is taken." };
    }
    log.error("profiles", "renameProfile failed", message);
    return { error: "Renaming failed. Try again." };
  }
  if (renamed.length === 0) {
    return { error: "Profile not found." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

export async function getProfile(input: {
  username: string;
}): Promise<Profile | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx.select().from(profiles).where(eq(profiles.username, input.username)).limit(1),
  );
  if (!profile || profile.userId !== user.id) {
    return { error: "Profile not found." };
  }
  return profile;
}

export async function updateProfile(input: {
  username: string;
  displayName: string;
  bio: string;
  headerStyle:
    | "classic"
    | "hero"
    | "banner"
    | "cutout"
    | "minimal"
    | "left"
    | "statement";
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = profileBasicsSchema.extend({ username: z.string() }).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({
        displayName: parsed.data.displayName.trim() || null,
        bio: parsed.data.bio.trim() || null,
        headerStyle: parsed.data.headerStyle,
        updatedAt: new Date(),
      })
      .where(eq(profiles.username, parsed.data.username))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "This profile could not be saved." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

/**
 * Sets one area's save mode. Upserts because a profile only grows a settings
 * row the first time it leaves the all-auto default.
 */
export async function updateSaveMode(input: {
  profileId: string;
  area: EditorArea;
  saveMode: "auto" | "manual";
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({
      profileId: z.uuid(),
      area: z.enum(editorAreas),
      saveMode: saveModeSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  // Column name is derived from the validated area, never from raw input.
  const column =
    parsed.data.area === "links"
      ? "linksSaveMode"
      : parsed.data.area === "profile"
        ? "profileSaveMode"
        : "appearanceSaveMode";

  try {
    await withUserDb(user.id, (tx) =>
      tx
        .insert(profileEditorSettings)
        .values({ profileId: parsed.data.profileId, [column]: parsed.data.saveMode })
        .onConflictDoUpdate({
          target: profileEditorSettings.profileId,
          set: { [column]: parsed.data.saveMode, updatedAt: new Date() },
        }),
    );
  } catch (error) {
    log.error(
      "profiles",
      "updateSaveMode failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Saving this setting failed. Try again." };
  }
  return { ok: true };
}

/** Stages the Profile section's text basics and any uploaded photo/banner. */
export async function saveProfileDraft(input: {
  profileId: string;
  displayName: string;
  bio: string;
  headerStyle: string;
  avatarPath?: string | null;
  bannerPath?: string | null;
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
      bannerPath: z.string().max(512).nullable().optional(),
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
  if (parsed.data.bannerPath !== undefined) {
    paths.bannerPath = parsed.data.bannerPath;
  }

  try {
    await withUserDb(user.id, (tx) =>
      tx
        .insert(profileDrafts)
        .values({
          profileId: parsed.data.profileId,
          displayName: parsed.data.displayName.trim() || null,
          bio: parsed.data.bio.trim() || null,
          headerStyle: parsed.data.headerStyle,
          ...paths,
        })
        .onConflictDoUpdate({
          target: profileDrafts.profileId,
          set: {
            displayName: parsed.data.displayName.trim() || null,
            bio: parsed.data.bio.trim() || null,
            headerStyle: parsed.data.headerStyle,
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

  const parsed = z.object({ profileId: z.uuid() }).safeParse(input);
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
      // Read the old paths first: the objects they point at become obsolete the
      // moment the draft's paths go live.
      const [live] = await tx
        .select({ avatarPath: profiles.avatarPath, bannerPath: profiles.bannerPath })
        .from(profiles)
        .where(eq(profiles.id, parsed.data.profileId))
        .limit(1);

      // Only overwrite a path when the draft carries one, so publishing text
      // edits does not clear a photo that was never staged.
      const published: Partial<typeof profiles.$inferInsert> = {
        displayName: draft.displayName,
        bio: draft.bio,
        headerStyle: draft.headerStyle,
        updatedAt: new Date(),
      };
      if (draft.avatarPath !== null) {
        published.avatarPath = draft.avatarPath;
      }
      if (draft.bannerPath !== null) {
        published.bannerPath = draft.bannerPath;
      }
      await tx
        .update(profiles)
        .set(published)
        .where(eq(profiles.id, parsed.data.profileId));
      await tx
        .delete(profileDrafts)
        .where(eq(profileDrafts.profileId, parsed.data.profileId));

      // Delete only the objects the draft superseded; anything else on disk is
      // still referenced (an abandoned upload keeps its file for storage
      // cleanup to sweep later).
      const superseded = [
        draft.avatarPath !== null &&
        live?.avatarPath &&
        live.avatarPath !== draft.avatarPath
          ? { bucket: "avatars", path: live.avatarPath }
          : null,
        draft.bannerPath !== null &&
        live?.bannerPath &&
        live.bannerPath !== draft.bannerPath
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
      "publishProfileSection failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Publishing failed. Try again." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

/** Copies the Appearance draft onto the live profile and clears it. */
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

  const parsed = z.object({ profileId: z.uuid() }).safeParse(input);
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
      await tx
        .update(profiles)
        .set({
          themeId: draft.themeId,
          buttonContour: draft.buttonContour,
          buttonVariant: draft.buttonVariant,
          buttonUmbra: draft.buttonUmbra,
          buttonColor: draft.buttonColor,
          buttonTextColor: draft.buttonTextColor,
          fontId: draft.fontId,
          titleColor: draft.titleColor,
          bodyColor: draft.bodyColor,
          wallpaperKind: draft.wallpaperKind,
          wallpaperColor: draft.wallpaperColor,
          wallpaperColorB: draft.wallpaperColorB,
          wallpaperPattern: draft.wallpaperPattern,
          wallpaperImagePath: draft.wallpaperImagePath,
          wallpaperVideoPath: draft.wallpaperVideoPath,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, parsed.data.profileId));
      await tx
        .delete(appearanceDrafts)
        .where(eq(appearanceDrafts.profileId, parsed.data.profileId));
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

export async function updateAppearance(input: {
  username: string;
  themeId: string;
  buttonContour: string;
  buttonVariant: string;
  buttonUmbra: string;
  buttonColor: string;
  buttonTextColor: string;
  fontId: string;
  titleColor: string;
  bodyColor: string;
  wallpaperKind: string;
  wallpaperColor: string;
  wallpaperColorB: string;
  wallpaperPattern: string;
  wallpaperImagePath: string | null;
  wallpaperVideoPath: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = appearanceSchema.extend({ username: z.string() }).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({
        themeId: parsed.data.themeId,
        buttonContour: parsed.data.buttonContour,
        buttonVariant: parsed.data.buttonVariant,
        buttonUmbra: parsed.data.buttonUmbra,
        buttonColor: parsed.data.buttonColor,
        buttonTextColor: parsed.data.buttonTextColor,
        fontId: parsed.data.fontId,
        titleColor: parsed.data.titleColor,
        bodyColor: parsed.data.bodyColor,
        wallpaperKind: parsed.data.wallpaperKind,
        wallpaperColor: parsed.data.wallpaperColor,
        wallpaperColorB: parsed.data.wallpaperColorB,
        wallpaperPattern: parsed.data.wallpaperPattern,
        wallpaperImagePath: parsed.data.wallpaperImagePath,
        wallpaperVideoPath: parsed.data.wallpaperVideoPath,
        updatedAt: new Date(),
      })
      .where(eq(profiles.username, parsed.data.username))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "This profile could not be saved." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

export async function checkUsernameAvailability(input: {
  candidate: string;
}): Promise<{ available: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = usernameSchema.safeParse(input.candidate);
  if (!parsed.success) {
    return { available: false };
  }

  const { data, error } = await supabase.rpc("is_username_available", {
    candidate: parsed.data,
  });
  if (error) {
    log.error("profiles", "checkUsernameAvailability failed", error.message);
    return { error: "Checking this username failed. Try again." };
  }
  return { available: data === true };
}

export async function getUsernameHistory(input: {
  profileId: string;
}): Promise<ReservedUsername[] | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z.object({ profileId: z.uuid() }).safeParse(input);
  if (!parsed.success) {
    return { error: "Profile not found." };
  }

  const { data, error } = await supabase.rpc("list_username_history", {
    p_profile_id: parsed.data.profileId,
  });
  if (error) {
    log.error("profiles", "getUsernameHistory failed", error.message);
    return { error: "Loading your username history failed. Try again." };
  }

  // The RPC is untyped at this boundary; the shape is the function's RETURNS
  // table, declared in migration 0034.
  const rows: Array<{
    username: string;
    released_at: string | null;
    reserved_until: string | null;
  }> = data ?? [];
  return rows.map((row) => ({
    username: row.username,
    releasedAt: row.released_at,
    reservedUntil: row.reserved_until,
  }));
}

/**
 * Reclaims one of the caller's own past handles. The rename trigger allows it
 * because availability ignores rows owned by the profile doing the renaming, so
 * a still-reserved handle can come back. `username` is the handle to take over;
 * `currentUsername` is the profile's handle right now.
 */
export async function reclaimUsername(input: {
  currentUsername: string;
  username: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({ currentUsername: z.string(), username: usernameSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That username is not valid." };
  }

  let reclaimed: { id: string }[];
  try {
    reclaimed = await withUserDb(user.id, (tx) =>
      tx
        .update(profiles)
        .set({ username: parsed.data.username, updatedAt: new Date() })
        .where(
          and(
            eq(profiles.username, parsed.data.currentUsername),
            eq(profiles.userId, user.id),
          ),
        )
        .returning({ id: profiles.id }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("taken")) {
      return { error: "That username is no longer available." };
    }
    log.error("profiles", "reclaimUsername failed", message);
    return { error: "Reclaiming that username failed. Try again." };
  }
  if (reclaimed.length === 0) {
    return { error: "Profile not found." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

export async function uploadProfileImage(
  formData: FormData,
): Promise<{ path: string; target: "avatar" | "banner" } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({
      profileId: z.uuid(),
      file: z.instanceof(File),
      target: z.enum(["avatar", "banner"]),
    })
    .safeParse({
      profileId: formData.get("profileId"),
      file: formData.get("file"),
      target: formData.get("target"),
    });
  if (!parsed.success) {
    return { error: "Image upload failed. Try again." };
  }
  const { profileId, file, target } = parsed.data;

  const extension = imageExtension(file.type);
  const maxBytes = imageMaxBytes[target];
  if (file.size === 0) {
    return { error: "That file is empty." };
  }
  if (extension === null || file.size > maxBytes) {
    return {
      error: `Upload a JPEG, PNG, WebP, or AVIF image up to ${maxBytes / (1024 * 1024)} MB.`,
    };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({
        id: profiles.id,
        avatarPath: profiles.avatarPath,
        bannerPath: profiles.bannerPath,
      })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const bucket = target === "avatar" ? "avatars" : "banners";
  const path = `${profileId}/${target}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    log.error("profiles", `uploadProfileImage ${target} failed`, uploadError.message);
    return { error: "Image upload failed. Try again." };
  }

  // Manual mode stages the new path on the draft and leaves the live object and
  // `profiles` row untouched, so an undo or a discard never destroyed a live
  // photo. Publishing writes the path and deletes the superseded object.
  const manual = (await getSaveMode(user.id, profileId, "profile")) === "manual";
  if (manual) {
    const column = target === "avatar" ? "avatarPath" : "bannerPath";
    await withUserDb(user.id, (tx) =>
      tx
        .insert(profileDrafts)
        .values({ profileId, [column]: path })
        .onConflictDoUpdate({
          target: profileDrafts.profileId,
          set: { [column]: path, updatedAt: new Date() },
        }),
    );
    return { path, target };
  }

  const updated =
    target === "avatar"
      ? await withUserDb(user.id, (tx) =>
          tx
            .update(profiles)
            .set({ avatarPath: path, updatedAt: new Date() })
            .where(eq(profiles.id, profileId))
            .returning({ id: profiles.id }),
        )
      : await withUserDb(user.id, (tx) =>
          tx
            .update(profiles)
            .set({ bannerPath: path, updatedAt: new Date() })
            .where(eq(profiles.id, profileId))
            .returning({ id: profiles.id }),
        );
  if (updated.length === 0) {
    return { error: "Image upload failed. Try again." };
  }

  const oldPath = target === "avatar" ? profile.avatarPath : profile.bannerPath;
  if (oldPath) {
    const { error } = await supabase.storage.from(bucket).remove([oldPath]);
    if (error) {
      log.error(
        "profiles",
        `uploadProfileImage old ${target} cleanup failed`,
        error.message,
      );
    }
  }

  updateTag(PUBLIC_PROFILE_TAG);
  return { path, target };
}

export async function uploadWallpaper(
  formData: FormData,
): Promise<
  { path: string; target: "wallpaper-image" | "wallpaper-video" } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({
      profileId: z.uuid(),
      file: z.instanceof(File),
      target: z.enum(["wallpaper-image", "wallpaper-video"]),
    })
    .safeParse({
      profileId: formData.get("profileId"),
      file: formData.get("file"),
      target: formData.get("target"),
    });
  if (!parsed.success) {
    return { error: "Upload failed. Try again." };
  }
  const { profileId, file, target } = parsed.data;
  const isVideo = target === "wallpaper-video";

  const extension = isVideo ? videoExtension(file.type) : imageExtension(file.type);
  const maxBytes = isVideo ? imageMaxBytes.wallpaperVideo : imageMaxBytes.wallpaperImage;
  if (file.size === 0) {
    return { error: "That file is empty." };
  }
  if (extension === null || file.size > maxBytes) {
    return {
      error: isVideo
        ? `Upload an MP4 or WebM video up to ${maxBytes / (1024 * 1024)} MB.`
        : `Upload a JPEG, PNG, WebP, or AVIF image up to ${maxBytes / (1024 * 1024)} MB.`,
    };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({
        id: profiles.id,
        wallpaperImagePath: profiles.wallpaperImagePath,
        wallpaperVideoPath: profiles.wallpaperVideoPath,
      })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const path = `${profileId}/${target}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("wallpapers")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    log.error("profiles", `uploadWallpaper ${target} failed`, uploadError.message);
    return { error: "Upload failed. Try again." };
  }

  // Manual mode stages the path on the appearance draft; the live wallpaper
  // object and `profiles` row are untouched until publish.
  const manual = (await getSaveMode(user.id, profileId, "appearance")) === "manual";
  if (manual) {
    const [full] = await withUserDb(user.id, (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, profileId)).limit(1),
    );
    if (!full) {
      return { error: "Profile not found." };
    }
    const next = {
      ...appearanceDraftFromProfile(full),
      wallpaperKind: isVideo ? "video" : "image",
      themeId: "custom" as const,
      ...(isVideo ? { wallpaperVideoPath: path } : { wallpaperImagePath: path }),
    };
    await withUserDb(user.id, (tx) =>
      tx
        .insert(appearanceDrafts)
        .values({ profileId, ...next })
        .onConflictDoUpdate({
          target: appearanceDrafts.profileId,
          set: { ...next, updatedAt: new Date() },
        }),
    );
    return { path, target };
  }

  const column = isVideo ? "wallpaperVideoPath" : "wallpaperImagePath";
  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({ [column]: path, updatedAt: new Date() })
      .where(eq(profiles.id, profileId))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "Upload failed. Try again." };
  }

  const oldPath = isVideo ? profile.wallpaperVideoPath : profile.wallpaperImagePath;
  if (oldPath) {
    const { error } = await supabase.storage.from("wallpapers").remove([oldPath]);
    if (error) {
      log.error(
        "profiles",
        `uploadWallpaper old ${target} cleanup failed`,
        error.message,
      );
    }
  }

  updateTag(PUBLIC_PROFILE_TAG);
  return { path, target };
}

export async function removeWallpaperMedia(input: {
  profileId: string;
  target: "wallpaper-image" | "wallpaper-video";
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({
      profileId: z.uuid(),
      target: z.enum(["wallpaper-image", "wallpaper-video"]),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: "Removing failed. Try again." };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({
        id: profiles.id,
        wallpaperImagePath: profiles.wallpaperImagePath,
        wallpaperVideoPath: profiles.wallpaperVideoPath,
      })
      .from(profiles)
      .where(and(eq(profiles.id, parsed.data.profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const isVideo = parsed.data.target === "wallpaper-video";

  // Manual mode stages the removal on the draft and keeps the live object, so a
  // discard restores it; publish clears the live path and deletes the file.
  const manual =
    (await getSaveMode(user.id, parsed.data.profileId, "appearance")) === "manual";
  if (manual) {
    const [full] = await withUserDb(user.id, (tx) =>
      tx.select().from(profiles).where(eq(profiles.id, parsed.data.profileId)).limit(1),
    );
    if (!full) {
      return { error: "Profile not found." };
    }
    const next = {
      ...appearanceDraftFromProfile(full),
      themeId: "custom" as const,
      wallpaperKind: "fill" as const,
      ...(isVideo ? { wallpaperVideoPath: null } : { wallpaperImagePath: null }),
    };
    await withUserDb(user.id, (tx) =>
      tx
        .insert(appearanceDrafts)
        .values({ profileId: parsed.data.profileId, ...next })
        .onConflictDoUpdate({
          target: appearanceDrafts.profileId,
          set: { ...next, updatedAt: new Date() },
        }),
    );
    return { ok: true };
  }

  const oldPath = isVideo ? profile.wallpaperVideoPath : profile.wallpaperImagePath;
  if (oldPath) {
    const { error } = await supabase.storage.from("wallpapers").remove([oldPath]);
    if (error) {
      log.error("profiles", "removeWallpaperMedia cleanup failed", error.message);
    }
  }
  const column = isVideo ? "wallpaperVideoPath" : "wallpaperImagePath";
  await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({ [column]: null, updatedAt: new Date() })
      .where(eq(profiles.id, parsed.data.profileId)),
  );
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

export async function createProfile(input: {
  username: string;
  displayName?: string;
}): Promise<{ username: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const { error } = await supabase.from("profiles").insert({
    user_id: user.id,
    username: input.username,
    display_name: input.displayName?.trim() || null,
  });

  if (error) {
    log.error("profiles", "createProfile failed", error.message);
    return { error: error.message };
  }

  updateTag(PUBLIC_PROFILE_TAG);
  return { username: input.username };
}

export async function deleteProfile(input: {
  username: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.username, input.username))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const failures = await Promise.all(
    (["avatars", "banners", "wallpapers"] as const).map(async (bucket) => {
      const { data: objects, error: listError } = await supabase.storage
        .from(bucket)
        .list(profile.id);
      if (listError) {
        return listError.message;
      }
      if (objects.length === 0) {
        return null;
      }
      const { error } = await supabase.storage
        .from(bucket)
        .remove(objects.map((object) => `${profile.id}/${object.name}`));
      return error ? error.message : null;
    }),
  );
  const failure = failures.find((message) => message !== null);
  if (failure) {
    log.error("profiles", "deleteProfile storage cleanup failed", failure);
    return { error: "Deleting this profile's files failed. Try again." };
  }

  const deleted = await withUserDb(user.id, (tx) =>
    tx.delete(profiles).where(eq(profiles.id, profile.id)).returning({ id: profiles.id }),
  );
  if (deleted.length === 0) {
    return { error: "Profile not found." };
  }

  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}
