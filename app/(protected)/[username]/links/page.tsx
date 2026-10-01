import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { LinksEditor } from "@/components/links/links-editor";
import { getUserId } from "@/lib/auth";
import { getProfileByUsername } from "@/lib/db/profile";
import { links } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

export const metadata = { title: "Links" };

export default async function LinksPage({ params }: PageProps<"/[username]/links">) {
  const { username } = await params;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const profile = await getProfileByUsername(userId, username);
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  const initialLinks = await withUserDb(userId, (tx) =>
    tx
      .select()
      .from(links)
      .where(eq(links.profileId, profile.id))
      .orderBy(asc(links.position), asc(links.createdAt)),
  );

  return <LinksEditor profileId={profile.id} initialLinks={initialLinks} />;
}
