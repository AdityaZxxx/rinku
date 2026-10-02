import { cache } from "react";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { links } from "@/lib/db/schema";
import { withAnonDb, withUserDb } from "@/lib/db/with-user";

export const getLinksByProfile = cache(async (userId: string, profileId: string) => {
  return withUserDb(userId, (tx) =>
    tx
      .select()
      .from(links)
      .where(and(eq(links.profileId, profileId), isNull(links.archivedAt)))
      .orderBy(asc(links.position), asc(links.createdAt)),
  );
});

export const getArchivedLinksByProfile = cache(
  async (userId: string, profileId: string) => {
    return withUserDb(userId, (tx) =>
      tx
        .select()
        .from(links)
        .where(and(eq(links.profileId, profileId), isNotNull(links.archivedAt)))
        .orderBy(desc(links.archivedAt)),
    );
  },
);

export const getPublicLinksByProfile = cache(async (profileId: string) => {
  return withAnonDb((tx) =>
    tx
      .select()
      .from(links)
      .where(eq(links.profileId, profileId))
      .orderBy(asc(links.position), asc(links.createdAt)),
  );
});
