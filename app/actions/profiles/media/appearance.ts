"use server";

import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { getSaveMode } from "@/lib/db/editor";
import { expirePublicProfileCache } from "@/lib/db/public-cache";
import { appearanceDrafts, profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import {
  wallpaperMediaTargetIds,
  type WallpaperMediaTarget,
} from "@/lib/profiles/appearance-options";
import {
  appearanceDraftFromProfile,
  appearanceDraftFromRow,
} from "@/lib/profiles/editor-draft";
import {
  imageMaxBytes,
  profileIdSchema,
  validateMediaUpload,
} from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";

export async function uploadWallpaper(
  formData: FormData,
): Promise<{ path: string; target: WallpaperMediaTarget } | { error: string }> {
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
      target: z.enum(wallpaperMediaTargetIds),
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

  const upload = validateMediaUpload(
    file,
    isVideo ? "video" : "image",
    isVideo ? imageMaxBytes.wallpaperVideo : imageMaxBytes.wallpaperImage,
  );
  if (!upload.ok) {
    return { error: upload.error };
  }
  const { extension } = upload;

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
    // Build on the staged draft when one exists, so an upload never walks
    // back other pending appearance edits.
    const [draftRow] = await withUserDb(user.id, (tx) =>
      tx
        .select()
        .from(appearanceDrafts)
        .where(eq(appearanceDrafts.profileId, profileId))
        .limit(1),
    );
    const base = draftRow
      ? appearanceDraftFromRow(draftRow)
      : appearanceDraftFromProfile(full);
    const next = {
      ...base,
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

  expirePublicProfileCache();
  return { path, target };
}

export async function removeWallpaperMedia(input: {
  profileId: string;
  target: WallpaperMediaTarget;
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
      target: z.enum(wallpaperMediaTargetIds),
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
    // Build on the staged draft when one exists, so a removal never walks
    // back other pending appearance edits.
    const [draftRow] = await withUserDb(user.id, (tx) =>
      tx
        .select()
        .from(appearanceDrafts)
        .where(eq(appearanceDrafts.profileId, parsed.data.profileId))
        .limit(1),
    );
    const base = draftRow
      ? appearanceDraftFromRow(draftRow)
      : appearanceDraftFromProfile(full);
    const next = {
      ...base,
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
  expirePublicProfileCache();
  return { ok: true };
}

/**
 * Uploads the banner: the media the "banner" header recipe renders. Staged on
 * the appearance draft in manual mode; a live swap deletes the replaced object
 * immediately.
 */
export async function uploadBanner(
  formData: FormData,
): Promise<{ path: string } | { error: string }> {
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
    })
    .safeParse({
      profileId: formData.get("profileId"),
      file: formData.get("file"),
    });
  if (!parsed.success) {
    return { error: "Image upload failed. Try again." };
  }
  const { profileId, file } = parsed.data;

  const upload = validateMediaUpload(file, "image", imageMaxBytes.banner);
  if (!upload.ok) {
    return { error: upload.error };
  }
  const { extension } = upload;

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({ id: profiles.id, bannerPath: profiles.bannerPath })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const path = `${profileId}/banner-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    log.error("profiles", "uploadBanner failed", uploadError.message);
    return { error: "Image upload failed. Try again." };
  }

  // Manual mode stages the path on the appearance draft; the live banner and
  // `profiles` row are untouched until publish.
  const manual = (await getSaveMode(user.id, profileId, "appearance")) === "manual";
  if (manual) {
    await stageBannerOnAppearanceDraft(user.id, profileId, path);
    return { path };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({ bannerPath: path, updatedAt: new Date() })
      .where(eq(profiles.id, profileId))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "Image upload failed. Try again." };
  }

  if (profile.bannerPath) {
    const { error } = await supabase.storage.from("banners").remove([profile.bannerPath]);
    if (error) {
      log.error("profiles", "uploadBanner old cleanup failed", error.message);
    }
  }

  expirePublicProfileCache();
  return { path };
}

/**
 * Removes the banner. Manual mode stages the removal on the appearance draft
 * and keeps the live object, so a discard restores it; publish clears the live
 * path and deletes the file.
 */
export async function removeBanner(input: {
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
    return { error: "Removing failed. Try again." };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({ id: profiles.id, bannerPath: profiles.bannerPath })
      .from(profiles)
      .where(and(eq(profiles.id, parsed.data.profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const manual =
    (await getSaveMode(user.id, parsed.data.profileId, "appearance")) === "manual";
  if (manual) {
    await stageBannerOnAppearanceDraft(user.id, parsed.data.profileId, null);
    return { ok: true };
  }

  if (profile.bannerPath) {
    const { error } = await supabase.storage.from("banners").remove([profile.bannerPath]);
    if (error) {
      log.error("profiles", "removeBanner cleanup failed", error.message);
    }
  }
  await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({ bannerPath: null, updatedAt: new Date() })
      .where(eq(profiles.id, parsed.data.profileId)),
  );
  expirePublicProfileCache();
  return { ok: true };
}

/**
 * Writes one banner path onto the appearance draft, building on the staged
 * draft when one exists so a media change never walks back other pending
 * appearance edits.
 */
async function stageBannerOnAppearanceDraft(
  userId: string,
  profileId: string,
  bannerPath: string | null,
): Promise<void> {
  const [full] = await withUserDb(userId, (tx) =>
    tx.select().from(profiles).where(eq(profiles.id, profileId)).limit(1),
  );
  if (!full) {
    return;
  }
  const [draftRow] = await withUserDb(userId, (tx) =>
    tx
      .select()
      .from(appearanceDrafts)
      .where(eq(appearanceDrafts.profileId, profileId))
      .limit(1),
  );
  const base = draftRow
    ? appearanceDraftFromRow(draftRow)
    : appearanceDraftFromProfile(full);
  const next = { ...base, bannerPath };
  await withUserDb(userId, (tx) =>
    tx
      .insert(appearanceDrafts)
      .values({ profileId, ...next })
      .onConflictDoUpdate({
        target: appearanceDrafts.profileId,
        set: { ...next, updatedAt: new Date() },
      }),
  );
}
