import { notFound } from "next/navigation";

import { ArchiveList } from "@/components/links/archive-list";
import { getUserId } from "@/lib/auth";
import { getArchivedLinksByProfile } from "@/lib/db/links";
import { getProfileByUsername } from "@/lib/db/profile";

export const metadata = { title: "Archive" };

export default async function ArchivePage({
  params,
}: PageProps<"/[username]/links/archive">) {
  const { username } = await params;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const profile = await getProfileByUsername(userId, username);
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  const initialLinks = await getArchivedLinksByProfile(userId, profile.id);

  return (
    <ArchiveList profileId={profile.id} username={username} initialLinks={initialLinks} />
  );
}
