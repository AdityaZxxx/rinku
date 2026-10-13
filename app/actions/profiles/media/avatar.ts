"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { getSaveMode } from "@/lib/db/editor";
import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { profileDrafts, profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import { imageMaxBytes, validateMediaUpload } from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";

export async function uploadProfileImage(
  formData: FormData,
): Promise<{ path: string; target: "avatar" } | { error: string }> {
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
      target: z.literal("avatar"),
    })
    .safeParse({
      profileId: formData.get("profileId"),
      file: formData.get("file"),
      target: formData.get("target"),
    });
  if (!parsed.success) {
    return { error: "Image upload failed. Try again." };
  }
  const { profileId, file } = parsed.data;

  const upload = validateMediaUpload(file, "image", imageMaxBytes.avatar);
  if (!upload.ok) {
    return { error: upload.error };
  }
  const { extension } = upload;

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({
        id: profiles.id,
        avatarPath: profiles.avatarPath,
      })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const bucket = "avatars";
  const path = `${profileId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    log.error("profiles", "uploadProfileImage avatar failed", uploadError.message);
    return { error: "Image upload failed. Try again." };
  }

  // Manual mode stages the new path on the draft and leaves the live object and
  // `profiles` row untouched, so an undo or a discard never destroyed a live
  // photo. Publishing writes the path and deletes the superseded object.
  const manual = (await getSaveMode(user.id, profileId, "profile")) === "manual";
  if (manual) {
    await withUserDb(user.id, (tx) =>
      tx
        .insert(profileDrafts)
        .values({ profileId, avatarPath: path })
        .onConflictDoUpdate({
          target: profileDrafts.profileId,
          set: { avatarPath: path, updatedAt: new Date() },
        }),
    );
    return { path, target: "avatar" };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({ avatarPath: path, updatedAt: new Date() })
      .where(eq(profiles.id, profileId))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "Image upload failed. Try again." };
  }

  if (profile.avatarPath) {
    const { error } = await supabase.storage.from(bucket).remove([profile.avatarPath]);
    if (error) {
      log.error(
        "profiles",
        "uploadProfileImage old avatar cleanup failed",
        error.message,
      );
    }
  }

  updateTag(PUBLIC_PROFILE_TAG);
  return { path, target: "avatar" };
}
