"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { links } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

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
      updates: z.array(z.object({ id: z.uuid(), position: z.number().int() })).max(500),
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
