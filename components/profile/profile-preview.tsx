"use client";

import type { Link as LinkData, Profile } from "@/lib/db/schema";

import { useAppearanceScrub } from "@/components/appearance/appearance-scrub-context";
import { useLinksQuery } from "@/components/links/use-links-query";
import { useEditorDraft } from "./editor-draft-context";
import { ProfilePreviewContent } from "./profile-preview-content";
import { useProfileQuery } from "./use-profile-query";

export function ProfilePreview({
  username,
  profileId,
  initialProfile,
  initialLinks,
  fontsPreloaded = false,
}: {
  username: string;
  profileId: string;
  initialProfile: Profile;
  initialLinks: LinkData[];
  fontsPreloaded?: boolean;
}) {
  const { profile } = useProfileQuery(username, initialProfile);
  const { links } = useLinksQuery(profileId, initialLinks);
  const draft = useEditorDraft();
  const scrub = useAppearanceScrub();

  // Layering, tightest scope last: the published row, then staged drafts,
  // then the hover-scrub preview. Spreading the possibly-null overlays
  // no-ops, so this reads correctly in every mode.
  const previewProfile = {
    ...profile,
    ...draft?.profileDraft,
    ...draft?.appearanceDraft,
    ...scrub,
  };

  return (
    <ProfilePreviewContent
      profile={previewProfile}
      links={links}
      interactive={false}
      fontsPreloaded={fontsPreloaded}
    />
  );
}
