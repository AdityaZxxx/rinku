"use server";

import * as z from "zod";

import { profileEditorSettings } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import { editorAreas, saveModeSchema, type EditorArea } from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Sets one area's save mode. Upserts because a profile only grows a settings
 * row the first time it leaves the all-auto default.
 */
export async function updateSaveMode(input: {
  profileId: string;
  area: EditorArea;
  saveMode: "auto" | "manual";
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
      area: z.enum(editorAreas),
      saveMode: saveModeSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  // Column name is derived from the validated area, never from raw input.
  const column =
    parsed.data.area === "links"
      ? "linksSaveMode"
      : parsed.data.area === "profile"
        ? "profileSaveMode"
        : "appearanceSaveMode";

  try {
    await withUserDb(user.id, (tx) =>
      tx
        .insert(profileEditorSettings)
        .values({ profileId: parsed.data.profileId, [column]: parsed.data.saveMode })
        .onConflictDoUpdate({
          target: profileEditorSettings.profileId,
          set: { [column]: parsed.data.saveMode, updatedAt: new Date() },
        }),
    );
  } catch (error) {
    log.error(
      "profiles",
      "updateSaveMode failed",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Saving this setting failed. Try again." };
  }
  return { ok: true };
}
