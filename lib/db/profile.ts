import { cache } from "react";
import { asc, eq } from "drizzle-orm";

import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

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
