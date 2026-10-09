import { notFound } from "next/navigation";

import { LinksEditor } from "@/components/links/links-editor";
import { EditorShell } from "@/components/profile/editor-shell";
import { MobilePreviewSheet } from "@/components/profile/mobile-dock";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { getUserId } from "@/lib/auth";
import { getLinksByProfile } from "@/lib/db/links";
import { getProfileByUsername } from "@/lib/db/profile";

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
        <MobilePreviewSheet
          username={username}
          preview={
            <ProfilePreview
              username={username}
              profileId={profile.id}
              initialProfile={profile}
              initialLinks={initialLinks}
            />
          }
        />
      }
    >
      <LinksEditor
        profileId={profile.id}
        username={username}
        initialLinks={initialLinks}
      />
    </EditorShell>
  );
}
