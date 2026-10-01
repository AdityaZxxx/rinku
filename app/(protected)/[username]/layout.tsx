import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { getUserId } from "@/lib/auth";
import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

/**
 * Owns nothing and renders nothing: it gates every edit page under a username.
 * The profile read is world-readable, so ownership is checked in the app, a
 * non-owner or a username nobody holds gets a 404 instead of someone else's
 * editor.
 */
export default async function ProfileEditLayout({
  children,
  params,
}: LayoutProps<"/[username]">) {
  const { username } = await params;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const [profile] = await withUserDb(userId, (tx) =>
    tx.select().from(profiles).where(eq(profiles.username, username)).limit(1),
  );
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  return children;
}
