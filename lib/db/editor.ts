import { cache } from "react";
import type { EditorArea, SaveMode } from "@/lib/profiles";
import { eq } from "drizzle-orm";

import {
  appearanceDrafts,
  profileDrafts,
  profileEditorSettings,
  type AppearanceDraft,
  type ProfileDraft,
  type ProfileEditorSettings,
} from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

/** All-auto, the shape a profile has before it grows a settings row. */
export const defaultEditorSettings = {
  linksSaveMode: "auto",
  profileSaveMode: "auto",
  appearanceSaveMode: "auto",
} as const satisfies Record<string, SaveMode>;

export const getEditorSettings = cache(
  async (userId: string, profileId: string): Promise<ProfileEditorSettings> => {
    const [row] = await withUserDb(userId, (tx) =>
      tx
        .select()
        .from(profileEditorSettings)
        .where(eq(profileEditorSettings.profileId, profileId))
        .limit(1),
    );
    return (
      row ?? {
        profileId,
        linksSaveMode: defaultEditorSettings.linksSaveMode,
        profileSaveMode: defaultEditorSettings.profileSaveMode,
        appearanceSaveMode: defaultEditorSettings.appearanceSaveMode,
        updatedAt: new Date(0),
      }
    );
  },
);

/** The mode for one area of the editor. */
export async function getSaveMode(
  userId: string,
  profileId: string,
  area: EditorArea,
): Promise<SaveMode> {
  const settings = await getEditorSettings(userId, profileId);
  switch (area) {
    case "links":
      // SAFETY: links_save_mode is constrained to this union by a database
      // CHECK and saveModeSchema, so the stored value narrows safely.
      return settings.linksSaveMode as SaveMode;
    case "profile":
      // SAFETY: profile_save_mode is constrained to this union by a database
      // CHECK and saveModeSchema, so the stored value narrows safely.
      return settings.profileSaveMode as SaveMode;
    default:
      // SAFETY: appearance_save_mode is constrained to this union by a database
      // CHECK and saveModeSchema, so the stored value narrows safely.
      return settings.appearanceSaveMode as SaveMode;
  }
}

/** The pending Profile draft, or null when nothing is staged. */
export const getProfileDraft = cache(
  async (userId: string, profileId: string): Promise<ProfileDraft | null> => {
    const [row] = await withUserDb(userId, (tx) =>
      tx
        .select()
        .from(profileDrafts)
        .where(eq(profileDrafts.profileId, profileId))
        .limit(1),
    );
    return row ?? null;
  },
);

/** The pending Appearance draft, or null when nothing is staged. */
export const getAppearanceDraft = cache(
  async (userId: string, profileId: string): Promise<AppearanceDraft | null> => {
    const [row] = await withUserDb(userId, (tx) =>
      tx
        .select()
        .from(appearanceDrafts)
        .where(eq(appearanceDrafts.profileId, profileId))
        .limit(1),
    );
    return row ?? null;
  },
);
