"use client";

import {
  GithubLogoIcon,
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
} satisfies Record<string, typeof XLogoIcon>;

export function SocialIcon({ id, className }: { id: string; className?: string }) {
  // SAFETY: platform ids come from the fixed PLATFORMS list; unknown ids miss
  // the record and are handled by the fallback below.
  const Icon = ICONS[id as keyof typeof ICONS];
  if (!Icon) return null;
  return <Icon className={className} />;
}
