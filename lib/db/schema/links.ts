import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUid } from "drizzle-orm/supabase";

import { profiles } from "./profiles";

/**
 * The ordered list of buttons on a public profile page.
 *
 * No `kind` discriminator, because nothing sets one yet. Vertical-specific
 * embeds would need it, and adding it later is a single-column migration with a
 * default.
 */
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    profileId: uuid("profile_id").notNull(),

    title: text("title").notNull(),
    url: text("url").notNull(),
    isActive: boolean("is_active").notNull().default(true),

    // Sparse on purpose: reordering rewrites only the rows that moved, so a
    // dense 0..n sequence would churn the whole table on every drag.
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.profileId],
      foreignColumns: [profiles.id],
      name: "links_profile_id_fkey",
    }).onDelete("cascade"),
    index("links_profile_id_position_idx").on(t.profileId, t.position),
    check("links_title_length", sql`char_length(${t.title}) between 1 and 100`),
    check("links_url_length", sql`char_length(${t.url}) between 1 and 2048`),

    // Deactivated means draft, so the row is withheld at the database rather
    // than filtered out in the app where a direct read would still expose it.
    // Ownership goes through the parent profile: one account may hold many
    // profiles, so profile_id no longer equals the user id.
    pgPolicy("active links are public", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`${t.isActive} or exists (
        select 1 from ${profiles}
        where ${profiles.id} = ${t.profileId} and ${profiles.userId} = ${authUid}
      )`,
    }),
    pgPolicy("users insert own links", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (
        select 1 from ${profiles}
        where ${profiles.id} = ${t.profileId} and ${profiles.userId} = ${authUid}
      )`,
    }),
    pgPolicy("users update own links", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from ${profiles}
        where ${profiles.id} = ${t.profileId} and ${profiles.userId} = ${authUid}
      )`,
      withCheck: sql`exists (
        select 1 from ${profiles}
        where ${profiles.id} = ${t.profileId} and ${profiles.userId} = ${authUid}
      )`,
    }),
    pgPolicy("users delete own links", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from ${profiles}
        where ${profiles.id} = ${t.profileId} and ${profiles.userId} = ${authUid}
      )`,
    }),
  ],
);
