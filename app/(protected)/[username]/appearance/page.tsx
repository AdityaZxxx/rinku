import { notFound } from "next/navigation";

import { AppearanceEditor } from "@/components/appearance/appearance-editor";
import { EditorDraftProvider } from "@/components/profile/editor-draft-context";
import { EditorShell } from "@/components/profile/editor-shell";
import { MobileDock } from "@/components/profile/mobile-dock";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { getUserId } from "@/lib/auth";
import { getAppearanceDraft, getSaveMode } from "@/lib/db/editor";
import { getLinksByProfile } from "@/lib/db/links";
import { getProfileByUsername } from "@/lib/db/profile";
import { appearanceDraftFromRow } from "@/lib/profiles/editor-draft";

export const metadata = { title: "Appearance" };

export default async function AppearancePage({
  params,
}: PageProps<"/[username]/appearance">) {
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
    getSaveMode(userId, profile.id, "appearance"),
    getAppearanceDraft(userId, profile.id),
  ]);
  const initialDraft =
    mode === "manual" && draftRow ? appearanceDraftFromRow(draftRow) : null;

  return (
    <EditorDraftProvider initialAppearanceDraft={initialDraft}>
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
        <AppearanceEditor
          username={username}
          initialProfile={profile}
          mode={mode}
          initialDraft={initialDraft}
        />
      </EditorShell>
    </EditorDraftProvider>
  );
}
