import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

export const profiles = pgTable(
  "profiles",
  {
    // The profile's own permanent identity, referenced by links and the
    // username history. Keying anything off `username` instead would let a
    // handle change orphan rows.
    id: uuid("id").primaryKey().defaultRandom().notNull(),

    // The owning account. One account may hold many profiles; this column is
    // the only ownership boundary — never a URL identity.
    userId: uuid("user_id").notNull(),

    // A cache, not the source of truth. `profile_usernames` is authoritative; a
    // trigger keeps the two in step, so treat this column as read-only.
    username: text("username").notNull(),

    displayName: text("display_name"),
    bio: text("bio"),

    // Object path rather than a full URL, so moving to another CDN or domain
    // does not mean rewriting rows.
    avatarPath: text("avatar_path"),
    bannerPath: text("banner_path"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.userId],
      foreignColumns: [authUsers.id],
      name: "profiles_user_id_fkey",
    }).onDelete("cascade"),

    // Mutable, yet still unique: the public page resolves a handle in one lookup.
    uniqueIndex("profiles_username_key").on(t.username),
    // Keep the quotes inline. Interpolating a hoisted `sql` constant emits the
    // pattern unquoted, and the breakage only surfaces when the migration runs.
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

    // Everything here is world-readable, which is why there is no email column.
    // Do not add one.
    pgPolicy("profiles are public", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
    pgPolicy("users insert own profile", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${t.userId}`,
    }),
    pgPolicy("users update own profile", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
      withCheck: sql`${authUid} = ${t.userId}`,
    }),
    pgPolicy("users delete own profile", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
    }),
  ],
);

/**
 * Append-only ownership history for every handle a profile has ever held.
 *
 * A handle recurs here, so `username` is not unique on its own. Recycling is
 * intended: after the cooldown lapses another profile may claim the handle, and
 * old links to it will resolve to that new owner. If that trade is ever
 * revisited, the history here is what a redirect feature would read.
 */
export const profileUsernames = pgTable(
  "profile_usernames",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    username: text("username").notNull(),
    profileId: uuid("profile_id").notNull(),

    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),

    // Null while held. Set on rename, which is also when the cooldown starts.
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId],
      foreignColumns: [profiles.id],
      name: "profile_usernames_profile_id_fkey",
    }).onDelete("cascade"),

    // One holder at a time, enforced by the database rather than by the trigger.
    uniqueIndex("profile_usernames_active_key")
      .on(t.username)
      .where(sql`${t.releasedAt} is null`),
    // Backs the cooldown lookup: given a handle, when was it last given up?
    index("profile_usernames_username_idx").on(t.username),
  ],
);

// No policy by design: past handles are private, so every access path is a
// trigger or a SECURITY DEFINER function. RLS is enabled by an explicit ALTER in
// the custom migration, because Drizzle only emits it for tables that have a
// policy — and a GRANT alone would leave this history readable by anyone.

// Timestamped page views, mirroring link_clicks: the owner reads them for the
// insights page; a SECURITY DEFINER function records them on render.
export const profileVisits = pgTable(
  "profile_visits",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    profileId: uuid("profile_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId],
      foreignColumns: [profiles.id],
      name: "profile_visits_profile_id_fkey",
    }).onDelete("cascade"),
    index("profile_visits_profile_id_created_at_idx").on(t.profileId, t.createdAt),
    pgPolicy("users read own visits", {
      for: "select",
      to: [authenticatedRole],
      using: sql`exists (
        select 1 from ${profiles}
        where ${profiles.id} = ${t.profileId} and ${profiles.userId} = ${authUid}
      )`,
    }),
  ],
);
