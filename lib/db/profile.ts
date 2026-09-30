import { cache } from "react";
import { eq } from "drizzle-orm";

import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

export const getProfile = cache(async (userId: string) => {
  return withUserDb(userId, (tx) =>
    tx.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
  );
});
