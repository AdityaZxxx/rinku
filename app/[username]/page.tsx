import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

import { WallpaperLayer } from "@/components/appearance/wallpaper-layer";
import { ProfilePreviewContent } from "@/components/profile/profile-preview-content";
import { resolveAppearance } from "@/lib/appearance";
import { getUserId } from "@/lib/auth";
import { getPublicLinksByProfile } from "@/lib/db/links";
import { getPublicProfileByUsername } from "@/lib/db/profile";
import { withAnonDb } from "@/lib/db/with-user";
import { avatarUrl, bannerUrl } from "@/lib/storage";

const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|ahrefs|semrush|mj12|dotbot|petal|gptbot|claudebot|ccbot|bytespider|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|pinterest|slackbot|discordbot|telegrambot|whatsapp|headless|phantomjs|selenium/i;

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

  let viewerId: string | null = null;
  try {
    viewerId = await getUserId();
  } catch {
    viewerId = null;
  }

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  if (viewerId !== profile.userId && !BOT_PATTERN.test(userAgent)) {
    const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const visitorHash = createHash("sha256")
      .update(`${forwarded}:${userAgent}`)
      .digest("hex");
    await withAnonDb((tx) =>
      tx.execute(sql`select public.record_profile_visit(${profile.id}, ${visitorHash})`),
    );
  }

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
    </main>
  );
}
