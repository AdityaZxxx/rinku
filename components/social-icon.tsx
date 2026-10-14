"use client";

import {
  GithubLogoIcon,
  GlobeIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  TiktokLogoIcon,
  XLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react";

const ICONS = {
  instagram: InstagramLogoIcon,
  x: XLogoIcon,
  github: GithubLogoIcon,
  youtube: YoutubeLogoIcon,
  tiktok: TiktokLogoIcon,
  linkedin: LinkedinLogoIcon,
} satisfies Record<string, typeof GlobeIcon>;

export function SocialIcon({ id, className }: { id: string; className?: string }) {
  // A platform that left the catalog still has rows in the database, so an
  // unknown id falls back to a globe rather than an empty icon button.
  // SAFETY: the miss cannot select a wrong icon; the fallback is the globe.
  const Icon = ICONS[id as keyof typeof ICONS] ?? GlobeIcon;
  return <Icon className={className} />;
}
