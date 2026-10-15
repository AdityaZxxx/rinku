"use server";

import { updateTag } from "next/cache";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import * as z from "zod";

import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { links } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { profileIdSchema } from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";

const linkIdSchema = z.object({ id: z.uuid() });
const linkIdsSchema = z.object({ ids: z.array(z.uuid()).min(1) });

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

/** One round trip for the selection dock's bulk archive. */
export async function archiveLinks(input: {
  ids: string[];
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = linkIdsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "These links could not be archived." };
  }

  const archived = await withUserDb(user.id, (tx) =>
    tx
      .update(links)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(inArray(links.id, parsed.data.ids))
      .returning({ id: links.id }),
  );
  if (archived.length === 0) {
    return { error: "These links could not be archived." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

/**
 * Undo for an archive: the row keeps its old id and position, which the sparse
 * position column preserves through the archive. Nothing shifts.
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

// Permanent delete stays reachable only through the archive: the editor's own
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

/** Empties the archive: every archived link of the profile, one round trip. */
export async function deleteArchivedLinks(input: {
  profileId: string;
}): Promise<{ count: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  if (!profileIdSchema.safeParse(input).success) {
    return { error: "The archive could not be emptied." };
  }

  const deleted = await withUserDb(user.id, (tx) =>
    tx
      .delete(links)
      .where(and(eq(links.profileId, input.profileId), isNotNull(links.archivedAt)))
      .returning({ id: links.id }),
  );
  if (deleted.length === 0) {
    return { error: "The archive is already empty." };
  }
  return { count: deleted.length };
}
