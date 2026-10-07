import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { WallpaperLayer } from "@/components/appearance/wallpaper-layer";
import { ProfilePreviewContent } from "@/components/profile/profile-preview-content";
import { VisitBeacon } from "@/components/profile/visit-beacon";
import { AGE_GATE_COOKIE, isAgeGateCleared } from "@/lib/age-gate";
import { resolveAppearance } from "@/lib/appearance";
import { getPublicLinksByProfile } from "@/lib/db/links";
import { getPublicProfileByUsername } from "@/lib/db/profile";
import { avatarUrl, bannerUrl, ogImageUrl } from "@/lib/storage";

export async function generateMetadata({
  params,
}: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) {
    return { title: "Not found" };
  }

  // Each stored override wins; the derived value is the same one the page body
  // shows, so a profile with no SEO edits reads exactly as it did before.
  const displayName = profile.displayName?.trim() ? profile.displayName : username;
  const title = profile.metaTitle?.trim() || `${displayName} (@${username})`;
  const description = profile.metaDescription?.trim() || profile.bio?.trim() || undefined;
  const image = profile.ogImagePath
    ? ogImageUrl(profile.ogImagePath)
    : profile.bannerPath
      ? bannerUrl(profile.bannerPath)
      : profile.avatarPath
        ? avatarUrl(profile.avatarPath)
        : undefined;

  return {
    title,
    description,
    keywords: profile.keywords?.trim() || undefined,
    // Relative values; resolved against `metadataBase` set in the root layout.
    alternates: { canonical: `/${username}` },
    robots: { index: profile.searchIndexing, follow: true },
    openGraph: {
      title,
      description,
      url: `/${username}`,
      siteName: "Rinku",
      type: "profile",
      username,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      // Only summary_large_image when an image exists; a large-image card with
      // no image renders as a bare summary in scrapers anyway, so an imageless
      // profile declares the honest type instead.
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
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

  const gateCookie = (await cookies()).get(AGE_GATE_COOKIE)?.value;
  const gatedLinks = links.map((link) => {
    if (link.minAge !== null && !isAgeGateCleared(gateCookie, link.id, link.minAge)) {
      const hasPreview = link.imageUrl !== null && link.imageUrl.startsWith("https://");
      return Object.assign({}, link, {
        url: "",
        imageUrl: null,
        metadata: null,
        gatedStyle: link.metadata?.style ?? null,
        // `icon:` pseudo-images and http sources can't be fetched by the
        // derivative route, so those fall back to the plain locked button.
        hasPreview,
      });
    }
    return link;
  });

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
      <ProfilePreviewContent profile={profile} links={gatedLinks} interactive bare />
      <VisitBeacon username={username} profileId={profile.id} />
    </main>
  );
}
