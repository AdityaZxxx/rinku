"use client";

import type { Link as LinkData, Profile } from "@/lib/db/schema";

import { useLinksQuery } from "@/components/links/use-links-query";
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

  return <ProfilePreviewContent profile={profile} links={links} interactive={false} />;
}
