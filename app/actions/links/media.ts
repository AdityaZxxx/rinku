"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { links, profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import { imageMaxBytes, validateMediaUpload } from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";
import { linkImageUrl } from "@/lib/supabase/storage";

export async function uploadLinkImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({ linkId: z.uuid(), file: z.instanceof(File) })
    .safeParse({ linkId: formData.get("linkId"), file: formData.get("file") });
  if (!parsed.success) {
    return { error: "Image upload failed. Try again." };
  }
  const { linkId, file } = parsed.data;

  const upload = validateMediaUpload(file, "image", imageMaxBytes.link);
  if (!upload.ok) {
    return { error: upload.error };
  }
  const { extension } = upload;

  const [owned] = await withUserDb(user.id, (tx) =>
    tx
      .select({ profileId: links.profileId })
      .from(links)
      .innerJoin(profiles, eq(profiles.id, links.profileId))
      .where(and(eq(links.id, linkId), eq(profiles.userId, user.id)))
      .limit(1),
  );
  if (!owned) {
    return { error: "Link not found." };
  }

  const path = `${owned.profileId}/link-${linkId}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("link-images")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    log.error("links", "uploadLinkImage failed", uploadError.message);
    return { error: "Image upload failed. Try again." };
  }

  const url = linkImageUrl(path);
  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(links)
      .set({ imageUrl: url, updatedAt: new Date() })
      .where(eq(links.id, linkId))
      .returning({ id: links.id }),
  );
  if (updated.length === 0) {
    return { error: "Image upload failed. Try again." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { url };
}
