"use server";

import { updateTag } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import * as z from "zod";

import { getArchivedLinksByProfile, getLinksByProfile } from "@/lib/db/links";
import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { links, profiles, type Link } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { parseEmbedUrl, type EmbedMetadata, embedMetadataSchema } from "@/lib/embeds";
import {
  httpUrlSchema,
  linkInputSchema,
  linkScheduleSchema,
  linkUrlSchema,
  linkVariantSchema,
  linkTitleSchema,
  normalizeUrl,
  positionAfter,
} from "@/lib/links";
import { log } from "@/lib/log";
import { linkMetadataSchema, parseMusicUrl, type LinkMetadata } from "@/lib/music";
import { imageExtension, imageMaxBytes } from "@/lib/profiles";
import { linkImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { fetchPageMetadata } from "@/lib/url-metadata";
import { parseVideoUrl, type VideoMetadata, videoMetadataSchema } from "@/lib/video";

/** Thumbnails derived server-side when the row carries no image of its own. */
async function videoThumbnail(url: string, video: VideoMetadata): Promise<string | null> {
  if (video.provider === "youtube") {
    // Static per-id render of the video's poster frame; no request needed.
    return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  }
  // Vimeo's public oEmbed resolves the poster for a given watch URL.
  const response = await fetch(
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    { next: { revalidate: 3600 } },
  );
  if (!response.ok) {
    return null;
  }
  // SAFETY: thumbnail_url is optional; a malformed body narrows to undefined.
  const data = (await response.json()) as { thumbnail_url?: string };
  return data.thumbnail_url ?? null;
}

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

  // Featured cards render link.imageUrl; for video links with no image of
  // their own, derive one so the card isn't a muted block.
  const createdMusic = parsed.data.platform ? null : parseMusicUrl(parsed.data.url);
  const createdVideo =
    !createdMusic && !parsed.data.platform ? parseVideoUrl(parsed.data.url) : null;
  const fallbackImage =
    createdVideo && parsed.data.imageUrl == null
      ? await videoThumbnail(parsed.data.url, createdVideo)
      : null;

  let created: Link | undefined;
  try {
    created = await withUserDb(user.id, async (tx) => {
      const [aggregate] = await tx
        .select({ maxPosition: max(links.position) })
        .from(links)
        .where(eq(links.profileId, parsed.data.profileId));
      const [row] = await tx
        .insert(links)
        .values(
          (() => {
            const music = parsed.data.platform ? null : parseMusicUrl(parsed.data.url);
            const video =
              music || parsed.data.platform ? null : parseVideoUrl(parsed.data.url);
            const embed =
              music || video || parsed.data.platform
                ? null
                : parseEmbedUrl(parsed.data.url);
            return {
              profileId: parsed.data.profileId,
              title: parsed.data.title,
              url: parsed.data.url,
              imageUrl: parsed.data.imageUrl ?? fallbackImage,
              variant: parsed.data.variant,
              kind: parsed.data.platform
                ? ("social" as const)
                : music
                  ? ("music" as const)
                  : video
                    ? ("video" as const)
                    : embed
                      ? ("embed" as const)
                      : ("custom" as const),
              platform: parsed.data.platform ?? null,
              metadata: music ?? video ?? embed,
              position: positionAfter(aggregate?.maxPosition),
            };
          })(),
        )
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
  updateTag(PUBLIC_PROFILE_TAG);
  return created;
}

export async function createSectionHeading(input: {
  profileId: string;
  title: string;
}): Promise<Link | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({ profileId: z.uuid(), title: linkTitleSchema })
    .safeParse(input);
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
          url: "",
          variant: "classic",
          kind: "heading",
          platform: null,
          metadata: null,
          position: positionAfter(aggregate?.maxPosition),
        })
        .returning();
      return row;
    });
  } catch (error) {
    log.error(
      "links",
      "createSectionHeading failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Adding a heading failed. Try again." };
  }

  if (!created) {
    return { error: "Adding a heading failed. Try again." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
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
  updateTag(PUBLIC_PROFILE_TAG);
  return { url };
}

export async function updateLink(input: {
  id: string;
  title: string;
  url: string;
  variant: "classic" | "featured";
  isActive: boolean;
  imageUrl?: string | null;
  metadata?: LinkMetadata | VideoMetadata | EmbedMetadata | null;
  visibleFrom?: Date | null;
  visibleUntil?: Date | null;
  minAge?: number | null;
}): Promise<
  | {
      ok: true;
      kind: Link["kind"];
      platform: string | null;
      metadata: LinkMetadata | VideoMetadata | EmbedMetadata | null;
    }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = linkInputSchema
    .extend({
      id: z.uuid(),
      // Heading rows carry no URL.
      url: z.union([linkInputSchema.shape.url, z.literal("")]),
      metadata: z
        .union([linkMetadataSchema, videoMetadataSchema, embedMetadataSchema])
        .nullable()
        .optional(),
    })
    // Absent bounds leave the row's schedule untouched; the refine rejects a
    // backwards window the database check would also reject.
    .and(linkScheduleSchema)
    .and(
      z.object({
        minAge: z.number().int().min(13).max(99).nullable().optional(),
      }),
    )
    .safeParse(input);
  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const updated = await withUserDb(user.id, async (tx) => {
    const [existing] = await tx
      .select({ kind: links.kind, platform: links.platform, metadata: links.metadata })
      .from(links)
      .where(eq(links.id, parsed.data.id));
    if (!existing) {
      return [];
    }

    // A heading stays a heading as long as it carries no URL; giving it one
    // promotes it into a real link.
    if (existing.kind === "heading" && parsed.data.url.trim() === "") {
      return tx
        .update(links)
        .set({
          title: parsed.data.title,
          url: "",
          variant: parsed.data.variant,
          isActive: parsed.data.isActive,
          kind: "heading",
          platform: null,
          metadata: null,
          imageUrl: "imageUrl" in input ? (parsed.data.imageUrl ?? null) : undefined,
          minAge: "minAge" in input ? (parsed.data.minAge ?? null) : undefined,
          visibleFrom:
            "visibleFrom" in input ? (parsed.data.visibleFrom ?? null) : undefined,
          visibleUntil:
            "visibleUntil" in input ? (parsed.data.visibleUntil ?? null) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(links.id, parsed.data.id))
        .returning({
          id: links.id,
          kind: links.kind,
          platform: links.platform,
          metadata: links.metadata,
        });
    }

    // Reclassify on URL change: pasting a music or video link into a plain
    // row turns it into that embed; a social row keeps its platform unless
    // the new URL is a music/video one.
    const music = parseMusicUrl(parsed.data.url);
    const video = music ? null : parseVideoUrl(parsed.data.url);
    const embed = music || video ? null : parseEmbedUrl(parsed.data.url);
    const typed = music ?? video ?? embed;
    const social = !typed && existing.platform !== null;
    // Embed style carries across saves: the editor sends it explicitly, a
    // URL-only edit keeps what the row already had.
    const style = parsed.data.metadata?.style ?? existing.metadata?.style;
    const metadata = typed && style ? { ...typed, style } : typed;

    return tx
      .update(links)
      .set({
        title: parsed.data.title,
        url: parsed.data.url,
        variant: parsed.data.variant,
        isActive: parsed.data.isActive,
        kind: music
          ? ("music" as const)
          : video
            ? ("video" as const)
            : embed
              ? ("embed" as const)
              : social
                ? ("social" as const)
                : ("custom" as const),
        platform: social ? existing.platform : null,
        metadata,
        imageUrl:
          "imageUrl" in input
            ? (parsed.data.imageUrl ??
              (video ? await videoThumbnail(parsed.data.url, video) : null))
            : undefined,
        visibleFrom:
          "visibleFrom" in input ? (parsed.data.visibleFrom ?? null) : undefined,
        visibleUntil:
          "visibleUntil" in input ? (parsed.data.visibleUntil ?? null) : undefined,
        minAge: "minAge" in input ? (parsed.data.minAge ?? null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(links.id, parsed.data.id))
      .returning({
        id: links.id,
        kind: links.kind,
        platform: links.platform,
        metadata: links.metadata,
      });
  });
  const [row] = updated;
  if (!row) {
    return { error: "This link could not be saved." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true, kind: row.kind, platform: row.platform, metadata: row.metadata };
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
  updateTag(PUBLIC_PROFILE_TAG);
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
  updateTag(PUBLIC_PROFILE_TAG);
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
  updateTag(PUBLIC_PROFILE_TAG);
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

  try {
    await withUserDb(user.id, async (tx) => {
      // One statement per moved row rather than a single unnest-with-array-params
      // query: drizzle expands JS arrays in sql`` into `($1, $2)::uuid[]`,
      // which Postgres cannot cast. Runs in parallel; only rows that actually
      // moved are updated, so the batch is small.
      await Promise.all(
        parsed.data.updates.map((update) =>
          tx
            .update(links)
            .set({ position: update.position })
            .where(
              and(eq(links.id, update.id), eq(links.profileId, parsed.data.profileId)),
            ),
        ),
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
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}
