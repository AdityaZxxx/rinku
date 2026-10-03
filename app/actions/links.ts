"use server";

import { and, eq, max, sql } from "drizzle-orm";
import * as z from "zod";

import { getArchivedLinksByProfile, getLinksByProfile } from "@/lib/db/links";
import { links, profiles, type Link } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import {
  httpUrlSchema,
  linkInputSchema,
  linkUrlSchema,
  linkVariantSchema,
  linkTitleSchema,
  normalizeUrl,
  positionAfter,
} from "@/lib/links";
import { log } from "@/lib/log";
import { imageExtension, imageMaxBytes } from "@/lib/profiles";
import { linkImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { fetchPageMetadata } from "@/lib/url-metadata";

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "That input was not valid.";
}

const createLinkSchema = z.object({
  profileId: z.uuid(),
  title: linkTitleSchema,
  url: linkUrlSchema,
  variant: linkVariantSchema,
  imageUrl: httpUrlSchema.nullable().optional(),
  platform: z.string().min(1).max(50).nullable().optional(),
});

const linkIdSchema = z.object({ id: z.uuid() });

export async function getLinks(profileId: string): Promise<Link[] | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  if (!z.uuid().safeParse(profileId).success) {
    return { error: "Profile not found." };
  }

  return getLinksByProfile(user.id, profileId);
}

export async function getArchivedLinks(
  profileId: string,
): Promise<Link[] | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  if (!z.uuid().safeParse(profileId).success) {
    return { error: "Profile not found." };
  }

  return getArchivedLinksByProfile(user.id, profileId);
}

export async function fetchUrlMetadata(input: {
  url: string;
}): Promise<{ title: string; imageUrl: string | null } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z.object({ url: z.url() }).safeParse(input);
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const metadata = await fetchPageMetadata(normalizeUrl(parsed.data.url));
  if (!metadata || !metadata.title) {
    return { error: "Couldn't fetch details for that URL." };
  }
  return metadata;
}

export async function createLink(input: {
  profileId: string;
  title: string;
  url: string;
  variant: "classic" | "featured";
  imageUrl?: string | null;
  platform?: string | null;
}): Promise<Link | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = createLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  let created: Link | undefined;
  try {
    created = await withUserDb(user.id, async (tx) => {
      const [aggregate] = await tx
        .select({ maxPosition: max(links.position) })
        .from(links)
        .where(eq(links.profileId, parsed.data.profileId));
      const [row] = await tx
        .insert(links)
        .values({
          profileId: parsed.data.profileId,
          title: parsed.data.title,
          url: parsed.data.url,
          imageUrl: parsed.data.imageUrl ?? null,
          variant: parsed.data.variant,
          kind: parsed.data.platform ? "social" : "custom",
          platform: parsed.data.platform ?? null,
          position: positionAfter(aggregate?.maxPosition),
        })
        .returning();
      return row;
    });
  } catch (error) {
    // An insert into a profile the account does not own dies on the RLS
    // with-check; the same catch covers a network drop.
    log.error(
      "links",
      "createLink failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Adding this link failed. Try again." };
  }

  if (!created) {
    return { error: "Adding this link failed. Try again." };
  }
  return created;
}

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

  const extension = imageExtension(file.type);
  const maxBytes = imageMaxBytes.link;
  if (file.size === 0) {
    return { error: "That file is empty." };
  }
  if (extension === null || file.size > maxBytes) {
    return {
      error: `Upload a JPEG, PNG, WebP, or AVIF image up to ${maxBytes / (1024 * 1024)} MB.`,
    };
  }

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
  return { url };
}

export async function updateLink(input: {
  id: string;
  title: string;
  url: string;
  variant: "classic" | "featured";
  isActive: boolean;
  imageUrl?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = linkInputSchema.extend({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(links)
      .set({
        title: parsed.data.title,
        url: parsed.data.url,
        variant: parsed.data.variant,
        isActive: parsed.data.isActive,
        imageUrl: "imageUrl" in input ? (parsed.data.imageUrl ?? null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(links.id, parsed.data.id))
      .returning({ id: links.id }),
  );
  if (updated.length === 0) {
    return { error: "This link could not be saved." };
  }
  return { ok: true };
}

export async function archiveLink(input: {
  id: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  if (!linkIdSchema.safeParse(input).success) {
    return { error: "This link could not be archived." };
  }

  const archived = await withUserDb(user.id, (tx) =>
    tx
      .update(links)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(links.id, input.id))
      .returning({ id: links.id }),
  );
  if (archived.length === 0) {
    return { error: "This link could not be archived." };
  }
  return { ok: true };
}

/**
 * Undo for an archive: the row keeps its old id and position, which the sparse
 * position column preserves through the archive — nothing shifts.
 */
export async function restoreLink(input: {
  id: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  if (!linkIdSchema.safeParse(input).success) {
    return { error: "This link could not be restored." };
  }

  const restored = await withUserDb(user.id, (tx) =>
    tx
      .update(links)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(links.id, input.id))
      .returning({ id: links.id }),
  );
  if (restored.length === 0) {
    return { error: "This link could not be restored." };
  }
  return { ok: true };
}

// Permanent delete stays reachable only through the archive — the editor's own
// remove is the reversible archive.
export async function deleteLink(input: {
  id: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  if (!linkIdSchema.safeParse(input).success) {
    return { error: "This link could not be deleted." };
  }

  const deleted = await withUserDb(user.id, (tx) =>
    tx.delete(links).where(eq(links.id, input.id)).returning({ id: links.id }),
  );
  if (deleted.length === 0) {
    return { error: "This link could not be deleted." };
  }
  return { ok: true };
}

export async function reorderLinks(input: {
  profileId: string;
  updates: Array<{ id: string; position: number }>;
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
      updates: z
        .array(z.object({ id: z.uuid(), position: z.number().int().min(0) }))
        .max(500),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: "Reordering failed. Try again." };
  }

  const ids = parsed.data.updates.map((update) => update.id);
  const positions = parsed.data.updates.map((update) => update.position);

  try {
    await withUserDb(user.id, async (tx) => {
      await tx.execute(
        sql`update links set position = data.position
            from unnest(${ids}::uuid[], ${positions}::int[]) as data(id, position)
            where links.id = data.id and links.profile_id = ${parsed.data.profileId}`,
      );
    });
  } catch (error) {
    log.error(
      "links",
      "reorderLinks failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Reordering failed. Try again." };
  }
  return { ok: true };
}
