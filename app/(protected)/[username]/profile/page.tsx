import { notFound } from "next/navigation";

import { EditorDraftProvider } from "@/components/profile/editor-draft-context";
import { EditorShell } from "@/components/profile/editor-shell";
import { MobilePreviewSheet } from "@/components/profile/mobile-dock";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { getUserId } from "@/lib/auth";
import { getProfileDraft, getSaveMode } from "@/lib/db/editor";
import { getLinksByProfile } from "@/lib/db/links";
import { getProfileByUsername } from "@/lib/db/profile";
import { profileDraftFromRow } from "@/lib/profiles/editor-draft";

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

  const [initialLinks, mode, draftRow] = await Promise.all([
    getLinksByProfile(userId, profile.id),
    getSaveMode(userId, profile.id, "profile"),
    getProfileDraft(userId, profile.id),
  ]);
  const initialDraft =
    mode === "manual" && draftRow ? profileDraftFromRow(draftRow) : null;

  return (
    <EditorDraftProvider initialProfileDraft={initialDraft}>
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
        <ProfileEditor
          username={username}
          initialProfile={profile}
          mode={mode}
          initialDraft={initialDraft}
        />
      </EditorShell>
    </EditorDraftProvider>
  );
}
