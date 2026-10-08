import type { EmbedMetadata } from "@/lib/links/embeds";
import type { LinkMetadata } from "@/lib/links/music";
import type { VideoMetadata } from "@/lib/links/video";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUid } from "drizzle-orm/supabase";

import { profiles } from "./profiles";

export const linkVariant = pgEnum("link_variant", ["classic", "featured"]);

export const linkKind = pgEnum("link_kind", [
  "custom",
  "social",
  "music",
  "video",
  "embed",
  "heading",
]);

/**
 * The ordered list of buttons on a public profile page.
 *
 * `variant` picks the display: `classic` renders a standard row, `featured` a
 * large card with its thumbnail. `kind` splits custom links from social ones;
 * social rows carry a `platform` and render as icons on the profile page.
 */
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    profileId: uuid("profile_id").notNull(),

    title: text("title").notNull(),
    url: text("url").notNull(),

    kind: linkKind("kind").notNull().default("custom"),
    // Set for social rows; the platform fixes the icon and the URL shape.
    platform: text("platform"),

    // Kind-specific payload: provider/id for music and video embeds today,
    // room for more typed blocks later. Null for plain custom/social rows.
    metadata: jsonb("metadata").$type<LinkMetadata | VideoMetadata | EmbedMetadata>(),

    // Remote URL stored as-is: no storage, no download, so the origin keeps
    // serving the bytes and Rinku never mirrors them.
    imageUrl: text("image_url"),
    variant: linkVariant("variant").notNull().default("classic"),
    isActive: boolean("is_active").notNull().default(true),

    // Null means no bound: visible_from in the future hides the link until
    // then, visible_until in the past hides it after. Both null is always
    // visible (subject to isActive/archivedAt).
    visibleFrom: timestamp("visible_from", { withTimezone: true }),
    visibleUntil: timestamp("visible_until", { withTimezone: true }),

    // Null means open to everyone. When set, the public page withholds the URL
    // and visitors confirm they are at least this age before /go redirects.
    minAge: integer("min_age"),

    // Null while on the list. Set on archive, which keeps the position for
    // when the link comes back.
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    // Owner-facing activity metric; incremented by /go/:id, not by the editor.
    clickCount: integer("click_count").notNull().default(0),

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
    check(
      "links_url_length",
      sql`(${t.kind}::text = 'heading' and char_length(${t.url}) = 0) or (${t.kind}::text <> 'heading' and char_length(${t.url}) between 1 and 2048)`,
    ),
    check(
      "links_social_platform",
      sql`(${t.kind}::text = 'social' and ${t.platform} is not null) or (${t.kind}::text = 'custom' and ${t.platform} is null) or (${t.kind}::text in ('music', 'video', 'embed') and ${t.platform} is null and ${t.metadata} is not null) or (${t.kind}::text = 'heading' and ${t.platform} is null and ${t.metadata} is null)`,
    ),
    check(
      "links_visible_window",
      sql`${t.visibleFrom} is null or ${t.visibleUntil} is null or ${t.visibleFrom} <= ${t.visibleUntil}`,
    ),
    check("links_min_age", sql`${t.minAge} is null or (${t.minAge} between 13 and 99)`),

    // Deactivated means draft; archived means off the list but kept for
    // restore; outside its schedule means not yet live or expired. All three
    // are withheld from visitors at the database rather than filtered out in
    // the app where a direct read would still expose them.
    // Ownership goes through the parent profile: one account may hold many
    // profiles, so profile_id no longer equals the user id.
    pgPolicy("active links are public", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`(${t.isActive} and ${t.archivedAt} is null
          and (${t.visibleFrom} is null or ${t.visibleFrom} <= now())
          and (${t.visibleUntil} is null or ${t.visibleUntil} > now())) or exists (
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

// The timestamped rows behind the click counter: the denormalized
// `links.click_count` answers "how many" instantly; this table answers
// "when" for the insights chart. Both are written by record_click.
export const linkClicks = pgTable(
  "link_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    linkId: uuid("link_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.linkId],
      foreignColumns: [links.id],
      name: "link_clicks_link_id_fkey",
    }).onDelete("cascade"),
    index("link_clicks_link_id_created_at_idx").on(t.linkId, t.createdAt),
    pgPolicy("users read own link clicks", {
      for: "select",
      to: [authenticatedRole],
      using: sql`exists (
        select 1 from ${links}
          join ${profiles} on ${profiles.id} = ${links.profileId}
        where ${links.id} = ${t.linkId} and ${profiles.userId} = ${authUid}
      )`,
    }),
  ],
);
