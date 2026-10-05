import { cache } from "react";
import { and, eq, gte } from "drizzle-orm";

import { getProfiles } from "@/lib/db/profile";
import { linkClicks, links, profileVisits, type profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { scheduleStatus } from "@/lib/links";
import "server-only";

const recentMs = 30 * 24 * 60 * 60 * 1000;

export interface ProfileSnapshot {
  id: string;
  username: string;
  displayName: string | null;
  hasAvatar: boolean;
  avatarPath: string | null;
  hasBanner: boolean;
  hasBio: boolean;
  totalLinks: number;
  activeLinks: number;
  hiddenLinks: number;
  archivedLinks: number;
  clicks30d: number;
  visits30d: number;
}

function row(
  profile: typeof profiles.$inferSelect,
  linkStats: { total: number; active: number; hidden: number; archived: number },
  counts: { clicks: number; visits: number },
): ProfileSnapshot {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    hasAvatar: profile.avatarPath !== null,
    avatarPath: profile.avatarPath,
    hasBanner: profile.bannerPath !== null,
    hasBio: profile.bio !== null,
    totalLinks: linkStats.total,
    activeLinks: linkStats.active,
    hiddenLinks: linkStats.hidden,
    archivedLinks: linkStats.archived,
    clicks30d: counts.clicks,
    visits30d: counts.visits,
  };
}

/** One compact snapshot per profile the account owns: links, last-30-day
 * clicks and visits. Feeds both the dashboard and the per-profile overview. */
export const getProfileSnapshots = cache(
  async (userId: string): Promise<ProfileSnapshot[]> => {
    const allProfiles = await getProfiles(userId);
    const since = new Date(Date.now() - recentMs);

    return withUserDb(userId, async (tx) => {
      const stats = await Promise.all(
        allProfiles.map(async (profile) => {
          const allLinks = await tx
            .select()
            .from(links)
            .where(eq(links.profileId, profile.id));
          // "Active" means live for visitors right now: inside its schedule
          // window, not merely switched on.
          const active = allLinks.filter(
            (l) => l.archivedAt === null && l.isActive && scheduleStatus(l) === "live",
          );
          const hidden = allLinks.filter(
            (l) => l.archivedAt === null && (!l.isActive || scheduleStatus(l) !== "live"),
          );
          const archived = allLinks.filter((l) => l.archivedAt !== null);

          const [clickRows, visitRows] = await Promise.all([
            tx
              .select({ id: linkClicks.id })
              .from(linkClicks)
              .innerJoin(links, eq(links.id, linkClicks.linkId))
              .where(
                and(eq(links.profileId, profile.id), gte(linkClicks.createdAt, since)),
              ),
            tx
              .select({ id: profileVisits.id })
              .from(profileVisits)
              .where(
                and(
                  eq(profileVisits.profileId, profile.id),
                  gte(profileVisits.createdAt, since),
                ),
              ),
          ]);

          return row(
            profile,
            {
              total: allLinks.length,
              active: active.length,
              hidden: hidden.length,
              archived: archived.length,
            },
            { clicks: clickRows.length, visits: visitRows.length },
          );
        }),
      );

      return stats;
    });
  },
);
