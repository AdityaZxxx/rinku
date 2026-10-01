import { eq } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";

import { db } from "./client";
import "server-only";

export async function deleteAuthUser(userId: string): Promise<void> {
  await db.delete(authUsers).where(eq(authUsers.id, userId));
}
