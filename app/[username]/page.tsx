import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ProfileHeaderVariant } from "@/components/profile/profile-header";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

import { ProfilePreviewContent } from "@/components/profile/profile-preview-content";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
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
        interactive
      />
    </main>
  );
}
