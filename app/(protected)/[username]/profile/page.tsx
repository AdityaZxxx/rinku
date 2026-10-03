import { notFound } from "next/navigation";

import { EditorShell } from "@/components/profile/editor-shell";
import { MobileDock } from "@/components/profile/mobile-dock";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { getUserId } from "@/lib/auth";
import { getLinksByProfile } from "@/lib/db/links";
import { getProfileByUsername } from "@/lib/db/profile";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ params }: PageProps<"/[username]/profile">) {
  const { username } = await params;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const profile = await getProfileByUsername(userId, username);
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  const initialLinks = await getLinksByProfile(userId, profile.id);

  return (
    <EditorShell
      preview={
        <ProfilePreview
          username={username}
          profileId={profile.id}
          initialProfile={profile}
          initialLinks={initialLinks}
        />
      }
      username={username}
      mobilePreview={
        <MobileDock
          username={username}
          profileId={profile.id}
          initialProfile={profile}
          initialLinks={initialLinks}
        />
      }
    >
      <ProfileEditor username={username} initialProfile={profile} />
    </EditorShell>
  );
}
