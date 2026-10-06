import type { Appearance } from "@/lib/appearance";
import type { AppearanceDraft, Profile, ProfileDraft } from "@/lib/db/schema";

import { resolveAppearance } from "@/lib/appearance";

/** The Profile section's editable fields (empty string means unset). */
export interface ProfileDraftFields {
  displayName: string;
  bio: string;
  headerStyle: string;
  avatarPath: string | null;
  bannerPath: string | null;
}

/** The Appearance section's editable fields, matching `appearanceSchema`. */
export type AppearanceDraftFields = Appearance;

export function profileDraftFromProfile(profile: Profile): ProfileDraftFields {
  return {
    displayName: profile.displayName ?? "",
    bio: profile.bio ?? "",
    headerStyle: profile.headerStyle,
    avatarPath: profile.avatarPath,
    bannerPath: profile.bannerPath,
  };
}

export function profileDraftFromRow(row: ProfileDraft): ProfileDraftFields {
  return {
    displayName: row.displayName ?? "",
    bio: row.bio ?? "",
    headerStyle: row.headerStyle,
    avatarPath: row.avatarPath,
    bannerPath: row.bannerPath,
  };
}

export function appearanceDraftFromProfile(profile: Profile): AppearanceDraftFields {
  const resolved = resolveAppearance(profile);
  return {
    themeId: resolved.themeId,
    buttonContour: resolved.buttonContour,
    buttonVariant: resolved.buttonVariant,
    buttonUmbra: resolved.buttonUmbra,
    buttonColor: resolved.buttonColor,
    buttonTextColor: resolved.buttonTextColor,
    fontId: resolved.fontId,
    titleColor: resolved.titleColor,
    bodyColor: resolved.bodyColor,
    wallpaperKind: resolved.wallpaperKind,
    wallpaperColor: resolved.wallpaperColor,
    wallpaperColorB: resolved.wallpaperColorB,
    wallpaperPattern: resolved.wallpaperPattern,
    wallpaperImagePath: resolved.wallpaperImagePath,
    wallpaperVideoPath: resolved.wallpaperVideoPath,
  };
}

export function appearanceDraftFromRow(row: AppearanceDraft): AppearanceDraftFields {
  const resolved = resolveAppearance(row);
  return {
    themeId: resolved.themeId,
    buttonContour: resolved.buttonContour,
    buttonVariant: resolved.buttonVariant,
    buttonUmbra: resolved.buttonUmbra,
    buttonColor: resolved.buttonColor,
    buttonTextColor: resolved.buttonTextColor,
    fontId: resolved.fontId,
    titleColor: resolved.titleColor,
    bodyColor: resolved.bodyColor,
    wallpaperKind: resolved.wallpaperKind,
    wallpaperColor: resolved.wallpaperColor,
    wallpaperColorB: resolved.wallpaperColorB,
    wallpaperPattern: resolved.wallpaperPattern,
    wallpaperImagePath: resolved.wallpaperImagePath,
    wallpaperVideoPath: resolved.wallpaperVideoPath,
  };
}

/** Overlays a Profile draft on the live profile, for the preview to render. */
export function profileWithDraft(profile: Profile, draft: ProfileDraftFields): Profile {
  return { ...profile, ...draft };
}
