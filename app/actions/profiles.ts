"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { appearanceSchema } from "@/lib/appearance";
import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { profiles, type Profile } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import {
  imageExtension,
  imageMaxBytes,
  profileBasicsSchema,
  usernameSchema,
  videoExtension,
} from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export async function renameProfile(input: {
  username: string;
  newUsername: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({ username: z.string(), newUsername: usernameSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That username is not valid." };
  }

  let renamed: { id: string }[];
  try {
    renamed = await withUserDb(user.id, (tx) =>
      tx
        .update(profiles)
        .set({ username: parsed.data.newUsername, updatedAt: new Date() })
        .where(
          and(eq(profiles.username, parsed.data.username), eq(profiles.userId, user.id)),
        )
        .returning({ id: profiles.id }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("reserved")) {
      return { error: "That username is reserved." };
    }
    if (message.includes("taken or still in cooldown")) {
      return { error: "That username is taken or still in cooldown." };
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
