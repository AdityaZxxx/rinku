import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

import { profiles } from "./profiles";

/** Owner-only predicate shared by every private editor table below. */
function ownsProfile(profileIdColumn: AnyPgColumn) {
  return sql`exists (
    select 1 from ${profiles}
    where ${profiles.id} = ${profileIdColumn} and ${profiles.userId} = ${authUid}
  )`;
}

/**
 * Per-profile editor preferences: which sections save automatically and which
 * wait for an explicit publish. One row per profile; a missing row reads as
 * all-auto, so existing profiles need no backfill.
 *
 * Private by design: the public `profiles` row is world-readable, and editor
 * preferences have no business being there.
 */
export const profileEditorSettings = pgTable(
  "profile_editor_settings",
  {
    profileId: uuid("profile_id").primaryKey(),
    linksSaveMode: text("links_save_mode").notNull().default("auto"),
    profileSaveMode: text("profile_save_mode").notNull().default("auto"),
    appearanceSaveMode: text("appearance_save_mode").notNull().default("auto"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId],
      foreignColumns: [profiles.id],
      name: "profile_editor_settings_profile_id_fkey",
    }).onDelete("cascade"),

    check(
      "profile_editor_settings_links_save_mode",
      sql`${t.linksSaveMode} in ('auto', 'manual')`,
    ),
    check(
      "profile_editor_settings_profile_save_mode",
      sql`${t.profileSaveMode} in ('auto', 'manual')`,
    ),
    check(
      "profile_editor_settings_appearance_save_mode",
      sql`${t.appearanceSaveMode} in ('auto', 'manual')`,
    ),

    pgPolicy("users read own editor settings", {
      for: "select",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
    }),
    pgPolicy("users insert own editor settings", {
      for: "insert",
      to: [authenticatedRole],
      withCheck: ownsProfile(t.profileId),
    }),
    pgPolicy("users update own editor settings", {
      for: "update",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
      withCheck: ownsProfile(t.profileId),
    }),
    pgPolicy("users delete own editor settings", {
      for: "delete",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
    }),
  ],
);

/**
 * The not-yet-live copy of a profile's text basics (name, bio, header style).
 *
 * `profiles` keeps the published values, so every public read path and its RLS
 * policy stay exactly as they were; publishing copies this row over the
 * profile. A row exists only while the Profile section is in manual mode with
 * pending changes.
 *
 * Split from `appearance_drafts` so publishing one section never disturbs the
 * other's pending changes.
 */
export const profileDrafts = pgTable(
  "profile_drafts",
  {
    profileId: uuid("profile_id").primaryKey(),
    displayName: text("display_name"),
    bio: text("bio"),
    headerStyle: text("header_style").notNull().default("classic"),

    // Staged photo/banner. Uploaded to storage immediately (a file has to live
    // somewhere), but not written onto `profiles` until publish. The live
    // object survives until then and can be discarded.
    avatarPath: text("avatar_path"),
    bannerPath: text("banner_path"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId],
      foreignColumns: [profiles.id],
      name: "profile_drafts_profile_id_fkey",
    }).onDelete("cascade"),

    check(
      "profile_drafts_header_style",
      sql`${t.headerStyle} in ('classic', 'hero', 'banner', 'cutout', 'minimal', 'left', 'statement')`,
    ),
    check(
      "profile_drafts_display_name_length",
      sql`${t.displayName} is null or char_length(${t.displayName}) <= 80`,
    ),
    check(
      "profile_drafts_bio_length",
      sql`${t.bio} is null or char_length(${t.bio}) <= 200`,
    ),

    pgPolicy("users read own profile draft", {
      for: "select",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
    }),
    pgPolicy("users insert own profile draft", {
      for: "insert",
      to: [authenticatedRole],
      withCheck: ownsProfile(t.profileId),
    }),
    pgPolicy("users update own profile draft", {
      for: "update",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
      withCheck: ownsProfile(t.profileId),
    }),
    pgPolicy("users delete own profile draft", {
      for: "delete",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
    }),
  ],
);

/**
 * The not-yet-live copy of a profile's appearance. Sibling of `profile_drafts`,
 * deliberately separate so the two sections publish independently. Columns and
 * checks mirror the published ones on `profiles`.
 */
export const appearanceDrafts = pgTable(
  "appearance_drafts",
  {
    profileId: uuid("profile_id").primaryKey(),

    themeId: text("theme_id").notNull().default("air"),
    buttonContour: text("button_shape").notNull().default("pill"),
    buttonVariant: text("button_style").notNull().default("fill"),
    buttonUmbra: text("button_umbra").notNull().default("soft"),
    buttonColor: text("button_color").notNull().default("#111111"),
    buttonTextColor: text("button_text_color").notNull().default("#ffffff"),
    fontId: text("font_id").notNull().default("inter"),
    titleColor: text("title_color").notNull().default("#111111"),
    bodyColor: text("body_color").notNull().default("#6e6e6e"),
    wallpaperKind: text("wallpaper_kind").notNull().default("fill"),
    wallpaperColor: text("wallpaper_color").notNull().default("#ffffff"),
    wallpaperColorB: text("wallpaper_color_b").notNull().default("#f5f3ff"),
    wallpaperPattern: text("wallpaper_pattern").notNull().default("dots"),
    wallpaperImagePath: text("wallpaper_image_path"),
    wallpaperVideoPath: text("wallpaper_video_path"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId],
      foreignColumns: [profiles.id],
      name: "appearance_drafts_profile_id_fkey",
    }).onDelete("cascade"),

    check(
      "appearance_drafts_theme_id",
      sql`${t.themeId} in ('air', 'charcoal', 'cream', 'mint', 'sky', 'sunset', 'custom')`,
    ),
    check(
      "appearance_drafts_button_shape",
      sql`${t.buttonContour} in ('sharp', 'soft', 'round', 'pill')`,
    ),
    check(
      "appearance_drafts_button_style",
      sql`${t.buttonVariant} in ('fill', 'outline', 'soft', 'glass')`,
    ),
    check(
      "appearance_drafts_button_umbra",
      sql`${t.buttonUmbra} in ('none', 'soft', 'lift', 'hard')`,
    ),
    check(
      "appearance_drafts_font_id",
      sql`${t.fontId} in ('inter', 'noto-sans', 'plus-jakarta-sans', 'work-sans', 'dm-sans', 'karla', 'nunito', 'figtree', 'merriweather', 'playfair-display', 'lora', 'cormorant-garamond', 'source-serif-4', 'ibm-plex-mono', 'space-grotesk', 'fraunces')`,
    ),
    check(
      "appearance_drafts_wallpaper_kind",
      sql`${t.wallpaperKind} in ('fill', 'gradient', 'blur', 'pattern', 'image', 'video')`,
    ),
    check(
      "appearance_drafts_wallpaper_pattern",
      sql`${t.wallpaperPattern} in ('dots', 'grid', 'lines', 'waves')`,
    ),

    pgPolicy("users read own appearance draft", {
      for: "select",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
    }),
    pgPolicy("users insert own appearance draft", {
      for: "insert",
      to: [authenticatedRole],
      withCheck: ownsProfile(t.profileId),
    }),
    pgPolicy("users update own appearance draft", {
      for: "update",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
      withCheck: ownsProfile(t.profileId),
    }),
    pgPolicy("users delete own appearance draft", {
      for: "delete",
      to: [authenticatedRole],
      using: ownsProfile(t.profileId),
    }),
  ],
);
