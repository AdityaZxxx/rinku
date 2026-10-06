"use client";

import type { Link as LinkData, Profile } from "@/lib/db/schema";

import { useLinksQuery } from "@/components/links/use-links-query";
import { useEditorDraft } from "./editor-draft-context";
import { ProfilePreviewContent } from "./profile-preview-content";
import { useProfileQuery } from "./use-profile-query";

export function ProfilePreview({
  username,
  profileId,
  initialProfile,
  initialLinks,
}: {
  username: string;
  profileId: string;
  initialProfile: Profile;
  initialLinks: LinkData[];
}) {
  const { profile } = useProfileQuery(username, initialProfile);
  const { links } = useLinksQuery(profileId, initialLinks);
  const draft = useEditorDraft();

  // In manual mode the preview shows the staged draft, so what the editor shows
  // is what will publish. Outside a draft provider this is the published row.
  const previewProfile = draft
    ? {
        ...profile,
        ...draft.profileDraft,
        ...draft.appearanceDraft,
      }
    : profile;

  return (
    <ProfilePreviewContent profile={previewProfile} links={links} interactive={false} />
  );
}
