import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

/**
 * Rinku schema.
 *
 * Read the policies at the bottom of each table before adding a query: with RLS
 * active the database, not this file, decides which rows a statement can touch.
 * A missing `WHERE user_id = ...` in application code is therefore not a data
 * leak, but a silently empty result.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Paths that belong to the app itself, so a profile cannot shadow `/login` or
 * `/dashboard` and break the auth flow.
 *
 * This list is the source for the `username_is_reserved` trigger in the custom
 * migration. It is deliberately *not* mirrored into a CHECK constraint here: a
 * second copy is a second thing to forget, and a bound-parameter array cannot be
 * emitted as DDL anyway.
 */
export const RESERVED_USERNAMES = [
  "admin",
  "api",
  "about",
  "account",
  "auth",
  "blog",
  "dashboard",
  "help",
  "login",
  "logout",
  "me",
  "pricing",
  "privacy",
  "settings",
  "signin",
  "signout",
  "signup",
  "support",
  "terms",
  "www",
] as const;

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    bio: text("bio"),

    // Storage object paths (`<user_id>/<file>`), not full URLs, so a future
    // CDN or domain change does not require rewriting rows.
    avatarPath: text("avatar_path"),
    backgroundPath: text("background_path"),

    theme: text("theme").notNull().default("minimal"),
    accentColor: text("accent_color").notNull().default("#6366f1"),
    backgroundType: text("background_type").notNull().default("gradient"),
    backgroundValue: text("background_value")
      .notNull()
      .default("from-indigo-500 via-purple-500 to-pink-500"),
    font: text("font").notNull().default("inter"),
    buttonStyle: text("button_style").notNull().default("rounded"),

    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
    uniqueIndex("profiles_username_key").on(t.username),
    // Lowercase is enforced by a trigger as well; this is the cheap first line
    // of defence that keeps a bad value from ever being written.
    check(
      "profiles_username_format",
      sql`${t.username} ~ '^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$'`,
    ),
    check("profiles_username_length", sql`char_length(${t.username}) between 3 and 30`),
    check(
      "profiles_display_name_length",
      sql`${t.displayName} is null or char_length(${t.displayName}) <= 80`,
    ),
    check("profiles_bio_length", sql`${t.bio} is null or char_length(${t.bio}) <= 200`),
    check("profiles_accent_color_format", sql`${t.accentColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check(
      "profiles_theme_valid",
      sql`${t.theme} in ('minimal', 'gradient', 'card', 'glass', 'bold')`,
    ),
    check(
      "profiles_font_valid",
      sql`${t.font} in ('inter', 'poppins', 'space-grotesk', 'playfair', 'jetbrains')`,
    ),
    check(
      "profiles_button_style_valid",
      sql`${t.buttonStyle} in ('rounded', 'pill', 'square', 'outline', 'soft')`,
    ),
    check(
      "profiles_background_type_valid",
      sql`${t.backgroundType} in ('gradient', 'solid', 'image')`,
    ),

    // A profile page is public by definition, which is why this table is
    // world-readable. Note there is no `email` column: anything readable here
    // is readable by every visitor.
    pgPolicy("profiles are public", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
    pgPolicy("users insert own profile", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${t.id}`,
    }),
    pgPolicy("users update own profile", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.id}`,
      withCheck: sql`${authUid} = ${t.id}`,
    }),
    pgPolicy("users delete own profile", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.id}`,
    }),
  ],
);

export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    isActive: boolean("is_active").notNull().default(true),

    // Sparse on purpose: reordering rewrites only the rows that moved, so a
    // dense 0..n sequence would churn the whole table on every drag.
    position: integer("position").notNull().default(0),

    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.userId],
      foreignColumns: [profiles.id],
      name: "links_user_id_fkey",
    }).onDelete("cascade"),
    index("links_user_id_position_idx").on(t.userId, t.position),
    check("links_title_length", sql`char_length(${t.title}) between 1 and 100`),
    check("links_url_length", sql`char_length(${t.url}) between 1 and 2048`),

    // A deactivated link is a draft, so it stays private rather than merely
    // hidden by a filter. Otherwise a draft URL is readable by anyone who knows
    // the row id.
    pgPolicy("active links are public", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`${t.isActive} or ${authUid} = ${t.userId}`,
    }),
    pgPolicy("users insert own links", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${t.userId}`,
    }),
    pgPolicy("users update own links", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
      withCheck: sql`${authUid} = ${t.userId}`,
    }),
    pgPolicy("users delete own links", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
    }),
  ],
);

/**
 * Analytics are event rows rather than counters. A `bigint` count column is
 * cheaper, but it cannot answer "which day did traffic spike" or "where did
 * these clicks come from", and history cannot be reconstructed after the fact.
 * Roll up with a materialized view if the tables ever get large.
 */
const visitorContext = {
  country: text("country"),
  device: text("device"),
  referrerHost: text("referrer_host"),
};

export const linkClicks = pgTable(
  "link_clicks",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
    linkId: uuid("link_id").notNull(),
    userId: uuid("user_id").notNull(),
    ...visitorContext,
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.linkId],
      foreignColumns: [links.id],
      name: "link_clicks_link_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.userId],
      foreignColumns: [profiles.id],
      name: "link_clicks_user_id_fkey",
    }).onDelete("cascade"),
    index("link_clicks_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("link_clicks_link_created_idx").on(t.linkId, t.createdAt.desc()),

    // Reads are owner-only. There is deliberately no anon policy: clicks arrive
    // through the `record_click` function, which runs as the table owner and
    // derives ownership from the link row instead of trusting the caller.
    pgPolicy("users read own clicks", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
    }),
  ],
);

export const profileViews = pgTable(
  "profile_views",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    ...visitorContext,
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.userId],
      foreignColumns: [profiles.id],
      name: "profile_views_user_id_fkey",
    }).onDelete("cascade"),
    index("profile_views_user_created_idx").on(t.userId, t.createdAt.desc()),

    pgPolicy("users read own views", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
    }),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type ProfileTheme = Profile["theme"];
export type ProfileFont = Profile["font"];
export type ButtonStyle = Profile["buttonStyle"];
export type BackgroundType = Profile["backgroundType"];

export const schema = { profiles, links, linkClicks, profileViews };
