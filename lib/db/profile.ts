import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { profiles } from "@/lib/db/schema";
import { withAnonDb, withUserDb } from "@/lib/db/with-user";

export const getProfiles = cache(async (userId: string) => {
  return withUserDb(userId, (tx) =>
    tx
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .orderBy(asc(profiles.createdAt)),
  );
});

export const getProfileByUsername = cache(async (userId: string, username: string) => {
  const [profile] = await withUserDb(userId, (tx) =>
    tx.select().from(profiles).where(eq(profiles.username, username)).limit(1),
  );
  return profile ?? null;
});

export const getPublicProfileByUsername = unstable_cache(
  async (username: string) => {
    const [profile] = await withAnonDb((tx) =>
      tx.select().from(profiles).where(eq(profiles.username, username)).limit(1),
    );
    return profile ?? null;
  },
  ["public-profile-by-username"],
  { tags: [PUBLIC_PROFILE_TAG] },
);
