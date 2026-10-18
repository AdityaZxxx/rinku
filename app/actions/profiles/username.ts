"use server";

import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";

import { expirePublicProfileCache } from "@/lib/db/public-cache";
import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import { usernameSchema, type ReservedUsername } from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";

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
  expirePublicProfileCache();
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
  expirePublicProfileCache();
  return { ok: true };
}
