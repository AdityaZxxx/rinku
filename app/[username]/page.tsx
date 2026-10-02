import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";

import { ProfilePreviewContent } from "@/components/profile/profile-preview-content";
import { getPublicLinksByProfile } from "@/lib/db/links";
import { getPublicProfileByUsername } from "@/lib/db/profile";
import { withAnonDb } from "@/lib/db/with-user";
import { avatarUrl, bannerUrl } from "@/lib/storage";

export async function generateMetadata({
  params,
}: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) {
    return { title: "Not found" };
  }

  const displayName = profile.displayName?.trim() ? profile.displayName : username;
  return {
    title: `${displayName} (@${username})`,
    description: profile.bio ?? undefined,
    openGraph: {
      title: `${displayName} (@${username})`,
      description: profile.bio ?? undefined,
      images: profile.bannerPath
        ? [bannerUrl(profile.bannerPath)]
        : profile.avatarPath
          ? [avatarUrl(profile.avatarPath)]
          : undefined,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps<"/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const links = await getPublicLinksByProfile(profile.id);

  await withAnonDb((tx) =>
    tx.execute(sql`select public.record_profile_visit(${profile.id})`),
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <ProfilePreviewContent
        displayName={profile.displayName}
        username={profile.username}
        bio={profile.bio}
        avatarPath={profile.avatarPath}
        bannerPath={profile.bannerPath}
        links={links}
        interactive
      />
    </main>
  );
}
