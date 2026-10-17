"use client";

import { useEffect, useState, type ComponentType } from "react";
// Deep paths, never the barrel: `@phosphor-icons/react` re-exports its whole
// SSR namespace, so any single named import keeps all 1,512 icon modules
// live, and this component renders on the public page.
import { BehanceLogoIcon } from "@phosphor-icons/react/dist/csr/BehanceLogo";
import { DiscordLogoIcon } from "@phosphor-icons/react/dist/csr/DiscordLogo";
import { DribbbleLogoIcon } from "@phosphor-icons/react/dist/csr/DribbbleLogo";
import { FacebookLogoIcon } from "@phosphor-icons/react/dist/csr/FacebookLogo";
import { FigmaLogoIcon } from "@phosphor-icons/react/dist/csr/FigmaLogo";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/csr/GithubLogo";
import { InstagramLogoIcon } from "@phosphor-icons/react/dist/csr/InstagramLogo";
import { LinkedinLogoIcon } from "@phosphor-icons/react/dist/csr/LinkedinLogo";
import { MediumLogoIcon } from "@phosphor-icons/react/dist/csr/MediumLogo";
import { PinterestLogoIcon } from "@phosphor-icons/react/dist/csr/PinterestLogo";
import { RedditLogoIcon } from "@phosphor-icons/react/dist/csr/RedditLogo";
import { SnapchatLogoIcon } from "@phosphor-icons/react/dist/csr/SnapchatLogo";
import { SpotifyLogoIcon } from "@phosphor-icons/react/dist/csr/SpotifyLogo";
import { TelegramLogoIcon } from "@phosphor-icons/react/dist/csr/TelegramLogo";
import { ThreadsLogoIcon } from "@phosphor-icons/react/dist/csr/ThreadsLogo";
import { TiktokLogoIcon } from "@phosphor-icons/react/dist/csr/TiktokLogo";
import { TwitchLogoIcon } from "@phosphor-icons/react/dist/csr/TwitchLogo";
import { WhatsappLogoIcon } from "@phosphor-icons/react/dist/csr/WhatsappLogo";
import { XLogoIcon } from "@phosphor-icons/react/dist/csr/XLogo";
import { YoutubeLogoIcon } from "@phosphor-icons/react/dist/csr/YoutubeLogo";

import { iconMediaId, isIconMedia, type PlatformIconId } from "@/lib/links/media";

type IconComponent = ComponentType<{ className?: string }>;

// The ids platformIconMedia can assign, which is what an auto-picked brand
// glyph resolves to. Everything else is a user choice and loads on demand.
// `satisfies` fails the build if a platform is added to PLATFORM_ICONS
// without a matching component here, which would render nothing publicly.
const BRAND_ICONS = {
  BehanceLogo: BehanceLogoIcon,
  DiscordLogo: DiscordLogoIcon,
  DribbbleLogo: DribbbleLogoIcon,
  FacebookLogo: FacebookLogoIcon,
  FigmaLogo: FigmaLogoIcon,
  GithubLogo: GithubLogoIcon,
  InstagramLogo: InstagramLogoIcon,
  LinkedinLogo: LinkedinLogoIcon,
  MediumLogo: MediumLogoIcon,
  PinterestLogo: PinterestLogoIcon,
  RedditLogo: RedditLogoIcon,
  SnapchatLogo: SnapchatLogoIcon,
  SpotifyLogo: SpotifyLogoIcon,
  TelegramLogo: TelegramLogoIcon,
  ThreadsLogo: ThreadsLogoIcon,
  TiktokLogo: TiktokLogoIcon,
  TwitchLogo: TwitchLogoIcon,
  WhatsappLogo: WhatsappLogoIcon,
  XLogo: XLogoIcon,
  YoutubeLogo: YoutubeLogoIcon,
} satisfies Record<PlatformIconId, IconComponent>;

type BrandId = keyof typeof BRAND_ICONS;

function isBrandId(id: string): id is BrandId {
  return Object.hasOwn(BRAND_ICONS, id);
}

const cache = new Map<string, Promise<IconComponent | null>>();

function loadIcon(id: string): Promise<IconComponent | null> {
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }
  // SAFETY: a deep module's component export is named `<id>Icon`; a miss
  // resolves to null and renders nothing instead of throwing.
  const request = import(`@phosphor-icons/react/dist/csr/${id}`)
    .then((mod) => (mod as Record<string, IconComponent>)[`${id}Icon`] ?? null)
    .catch(() => null);
  cache.set(id, request);
  return request;
}

function PickedIcon({ id, className }: { id: string; className?: string }) {
  const [icon, setIcon] = useState<IconComponent | null>(() =>
    isBrandId(id) ? BRAND_ICONS[id] : null,
  );

  useEffect(() => {
    if (isBrandId(id)) {
      return;
    }
    let live = true;
    void loadIcon(id).then((loaded) => {
      if (live && loaded) {
        // Wrapping in a function because the value is itself a function;
        // passing it bare would run it as a state updater.
        setIcon(() => loaded);
      }
      return loaded;
    });
    return () => {
      live = false;
    };
  }, [id]);

  const Icon = icon;
  return Icon ? <Icon className={className} /> : null;
}

export function MediaIcon({
  imageUrl,
  className,
}: {
  imageUrl: string | null | undefined;
  className?: string;
}) {
  if (!isIconMedia(imageUrl) || imageUrl == null) return null;
  return <PickedIcon id={iconMediaId(imageUrl)} className={className} />;
}
