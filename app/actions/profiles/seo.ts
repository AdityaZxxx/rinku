"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import {
  imageMaxBytes,
  profileIdSchema,
  seoSchema,
  validateMediaUpload,
} from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves the crawler-facing overrides. Empty strings become null so the public
 * page falls back to its derived title/description, and clearing a field is
 * how a user reverts to the default.
 */
export async function updateSeo(input: {
  profileId: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  searchIndexing: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = seoSchema.extend({ profileId: z.uuid() }).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({
        metaTitle: parsed.data.metaTitle.trim() || null,
        metaDescription: parsed.data.metaDescription.trim() || null,
        keywords: parsed.data.keywords.trim() || null,
        searchIndexing: parsed.data.searchIndexing,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, parsed.data.profileId))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "This profile could not be saved." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

/**
 * Uploads the profile's social share image. Settings saves immediately, so the
 * new object goes live on upload and the one it replaces is deleted after.
 */
export async function uploadSeoImage(
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
    .object({ profileId: z.uuid(), file: z.instanceof(File) })
    .safeParse({ profileId: formData.get("profileId"), file: formData.get("file") });
  if (!parsed.success) {
    return { error: "Image upload failed. Try again." };
  }
  const { profileId, file } = parsed.data;

  const upload = validateMediaUpload(file, "image", imageMaxBytes.ogImage);
  if (!upload.ok) {
    return { error: upload.error };
  }
  const { extension } = upload;

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({ id: profiles.id, ogImagePath: profiles.ogImagePath })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const path = `${profileId}/og-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("og-images")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    log.error("profiles", "uploadSeoImage failed", uploadError.message);
    return { error: "Image upload failed. Try again." };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({ ogImagePath: path, updatedAt: new Date() })
      .where(eq(profiles.id, profileId))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "Image upload failed. Try again." };
  }

  if (profile.ogImagePath) {
    const { error } = await supabase.storage
      .from("og-images")
      .remove([profile.ogImagePath]);
    if (error) {
      log.error("profiles", "uploadSeoImage old cleanup failed", error.message);
    }
  }

  updateTag(PUBLIC_PROFILE_TAG);
  return { path };
}

/** Clears the custom share image so the public page falls back to banner/avatar. */
export async function removeSeoImage(input: {
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
      .select({ id: profiles.id, ogImagePath: profiles.ogImagePath })
      .from(profiles)
      .where(and(eq(profiles.id, parsed.data.profileId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  if (profile.ogImagePath) {
    const { error } = await supabase.storage
      .from("og-images")
      .remove([profile.ogImagePath]);
    if (error) {
      log.error("profiles", "removeSeoImage cleanup failed", error.message);
    }
  }
  await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({ ogImagePath: null, updatedAt: new Date() })
      .where(eq(profiles.id, parsed.data.profileId)),
  );
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}
