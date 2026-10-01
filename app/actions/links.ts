"use server";

import { asc, eq, max, sql } from "drizzle-orm";
import * as z from "zod";

import { links, type Link } from "@/lib/db/schema";
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
});

const restoreLinkSchema = linkInputSchema.extend({
  id: z.uuid(),
  profileId: z.uuid(),
  imageUrl: httpUrlSchema.nullable(),
  position: z.number().int().min(0),
});

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

  return withUserDb(user.id, (tx) =>
    tx
      .select()
      .from(links)
      .where(eq(links.profileId, profileId))
      .orderBy(asc(links.position), asc(links.createdAt)),
  );
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
          position: positionAfter(aggregate?.maxPosition),
        })
        .returning();
      return row;
    });
  } catch {
    // An insert into a profile the account does not own dies on the RLS
    // with-check; the same catch covers a network drop.
    return { error: "Adding this link failed. Try again." };
  }

  if (!created) {
    return { error: "Adding this link failed. Try again." };
  }
  return created;
}

export async function updateLink(input: {
  id: string;
  title: string;
  url: string;
  variant: "classic" | "featured";
  isActive: boolean;
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

export async function deleteLink(input: {
  id: string;
}): Promise<Link | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  if (!z.uuid().safeParse(input.id).success) {
    return { error: "This link could not be deleted." };
  }

  const [deleted] = await withUserDb(user.id, (tx) =>
    tx.delete(links).where(eq(links.id, input.id)).returning(),
  );
  if (!deleted) {
    return { error: "This link could not be deleted." };
  }
  return deleted;
}

/**
 * Undo for a delete: the row goes back with its old id and position, which the
 * sparse position column makes possible without shifting anything.
 */
export async function restoreLink(input: {
  id: string;
  profileId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  variant: "classic" | "featured";
  isActive: boolean;
  position: number;
}): Promise<Link | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = restoreLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Restoring this link failed." };
  }

  let restored: Link | undefined;
  try {
    restored = await withUserDb(user.id, async (tx) => {
      const [row] = await tx
        .insert(links)
        .values({
          id: parsed.data.id,
          profileId: parsed.data.profileId,
          title: parsed.data.title,
          url: parsed.data.url,
          imageUrl: parsed.data.imageUrl,
          variant: parsed.data.variant,
          isActive: parsed.data.isActive,
          position: parsed.data.position,
        })
        .returning();
      return row;
    });
  } catch {
    return { error: "Restoring this link failed. Try again." };
  }
  if (!restored) {
    return { error: "Restoring this link failed. Try again." };
  }
  return restored;
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
  } catch {
    return { error: "Reordering failed. Try again." };
  }
  return { ok: true };
}
