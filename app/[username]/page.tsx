import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WallpaperLayer } from "@/components/appearance/wallpaper-layer";
import { ProfilePreviewContent } from "@/components/profile/profile-preview-content";
import { VisitBeacon } from "@/components/profile/visit-beacon";
import { resolveAppearance } from "@/lib/appearance";
import { getPublicLinksByProfile } from "@/lib/db/links";
import { getPublicProfileByUsername } from "@/lib/db/profile";
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
  const look = resolveAppearance(profile);

  return (
    <main className="relative flex min-h-dvh w-full flex-1 flex-col">
      <WallpaperLayer
        kind={look.wallpaper}
        color={look.wallpaperColor}
        colorB={look.wallpaperColorB}
        pattern={look.pattern}
        imagePath={look.wallpaperImagePath}
        videoPath={look.wallpaperVideoPath}
        titleColor={look.titleColor}
      />
      <ProfilePreviewContent profile={profile} links={links} interactive bare />
      <VisitBeacon username={username} profileId={profile.id} />
    </main>
  );
}
