"use client";

import type { ProfileHeaderVariant } from "./profile-header";
import type { Link as LinkData, Profile } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";

import { getLinks } from "@/app/actions/links";
import { getProfile } from "@/app/actions/profiles";
import { ProfilePreviewContent } from "./profile-preview-content";

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
  const profileQuery = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const result = await getProfile({ username });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    initialData: initialProfile,
  });

  const linksQuery = useQuery({
    queryKey: ["links", profileId],
    queryFn: async () => {
      const result = await getLinks(profileId);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    initialData: initialLinks,
  });

  const profile =
    profileQuery.data && !("error" in profileQuery.data)
      ? profileQuery.data
      : initialProfile;
  const links = Array.isArray(linksQuery.data) ? linksQuery.data : [];

  return (
    <ProfilePreviewContent
      displayName={profile.displayName}
      username={profile.username}
      bio={profile.bio}
      avatarPath={profile.avatarPath}
      bannerPath={profile.bannerPath}
      // SAFETY: headerStyle is constrained to this union by the database
      // CHECK and the zod schema, so the persisted value narrows safely.
      headerStyle={profile.headerStyle as ProfileHeaderVariant}
      links={links}
      interactive={false}
    />
  );
}
