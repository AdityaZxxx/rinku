import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Profile } from "@/lib/db/schema";
import type { EmbedMetadata } from "@/lib/links/embeds";
import type { LinkMetadata } from "@/lib/links/music";
import type { VideoMetadata } from "@/lib/links/video";

import { FontStylesheet } from "@/components/appearance/font-stylesheet";
import { WallpaperLayer } from "@/components/appearance/wallpaper-layer";
import { Favicon } from "@/components/favicon";
import { BlockEmbed } from "@/components/links/block-embed";
import { MusicEmbed } from "@/components/links/music-embed";
import { VideoEmbed } from "@/components/links/video-embed";
import { MediaIcon } from "@/components/media-icon";
import { AgeGateLink, AgeBadge } from "@/components/profile/age-gate-link";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ShareLinkMenu } from "@/components/profile/share-link-menu";
import { isEmbedMetadata } from "@/lib/links/embeds";
import { isIconMedia } from "@/lib/links/media";
import { faviconUrl, scheduleStatus } from "@/lib/links/model";
import { isVideoMetadata } from "@/lib/links/video";
import { resolveAppearance } from "@/lib/profiles/appearance";
import {
  buttonBodyStyle,
  buttonContourClass,
  featuredContourClass,
} from "@/lib/profiles/appearance-buttons";
import { mutedFor } from "@/lib/profiles/appearance-colors";
import { fontStack } from "@/lib/profiles/appearance-fonts";
import {
  entranceMotion,
  type LinkEntrance,
  type LinkHover,
} from "@/lib/profiles/appearance-options";
import { gatedThumbUrl } from "@/lib/supabase/storage";
import { cn, type CssVariables } from "@/lib/utils";

export interface PreviewLink {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  variant: "classic" | "featured";
  isActive: boolean;
  archivedAt: Date | null;
  visibleFrom: Date | null;
  visibleUntil: Date | null;
  minAge?: number | null;
  /** Locked gated link that has a thumbnail: render the blurred derivative. */
  hasPreview?: boolean;
  /**
   * For a locked typed link the page withholds `metadata`, so the rendering
   * style (embed/classic/featured) is passed on its own.
   */
  gatedStyle?: "embed" | "classic" | "featured" | null;
  kind?: "custom" | "social" | "music" | "video" | "embed" | "heading";
  platform?: string | null;
  metadata?: LinkMetadata | VideoMetadata | EmbedMetadata | null;
}

function isGated(link: PreviewLink): boolean {
  return link.minAge != null && link.minAge > 0 && link.url === "";
}

/**
 * Staggered entrance style for one link row. Under prefers-reduced-motion the
 * keyframes in globals.css degrade to an opacity-only fade while this stagger
 * keeps the list legible.
 */
function entranceStyle(entrance: LinkEntrance, index: number): CSSProperties {
  if (entrance === "none") {
    return {};
  }
  const motion = entranceMotion[entrance];
  return {
    animationName: `rinku-entrance-${entrance}`,
    animationDuration: motion.duration,
    animationDelay: `${index * 60}ms`,
    animationTimingFunction: motion.easing,
    animationFillMode: "backwards",
  };
}

/**
 * Visitor-pointing personality for a link. The shadow effects carry `!`
 * because the resting umbra shadow is an inline style, and an ordinary class
 * can never supersede one; the transform effects need no marker.
 */
function hoverClass(hover: LinkHover): string {
  switch (hover) {
    case "lift":
      return "pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-md!";
    case "scale":
      return "pointer-fine:hover:scale-[1.02]";
    case "glow":
      return "pointer-fine:hover:shadow-[0_4px_24px_-6px_var(--link-glow)]!";
    default:
      return "";
  }
}

function LinkContent({ link, left }: { link: PreviewLink; left: boolean }) {
  const favicon = faviconUrl(link.url);
  return (
    <>
      {isIconMedia(link.imageUrl) ? (
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full">
          <MediaIcon imageUrl={link.imageUrl} className="size-5" />
        </span>
      ) : link.imageUrl && link.imageUrl !== "" ? (
        <Image
          src={link.imageUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-full object-cover"
          unoptimized
        />
      ) : link.imageUrl === null && favicon ? (
        <Favicon url={favicon} className="size-5 shrink-0 rounded-full" />
      ) : null}
      <span
        className={cn("line-clamp-2 leading-snug", left ? "text-left" : "text-center")}
      >
        {link.title}
      </span>
      {link.minAge && link.minAge > 0 ? <AgeBadge minAge={link.minAge} /> : null}
    </>
  );
}

function FeaturedCardImage({ link, muted }: { link: PreviewLink; muted: string }) {
  if (!link.imageUrl) {
    return <div className="aspect-1200/630 w-full" style={{ backgroundColor: muted }} />;
  }
  if (isIconMedia(link.imageUrl)) {
    return (
      <div className="grid aspect-1200/630 w-full place-items-center">
        <MediaIcon imageUrl={link.imageUrl} className="size-16" />
      </div>
    );
  }
  return (
    <Image
      src={link.imageUrl}
      alt=""
      width={1200}
      height={630}
      className="aspect-1200/630 w-full object-cover"
      unoptimized
    />
  );
}

export function ProfilePreviewContent({
  profile,
  links,
  interactive = true,
  bare = false,
}: {
  profile: Profile;
  links: PreviewLink[];
  interactive?: boolean;
  bare?: boolean;
}) {
  // Mirrors the public RLS window: scheduled-but-not-live and expired rows
  // stay out of the visitor view and out of the owner's preview of it.
  const visibleLinks = links.filter(
    (link) =>
      link.isActive && link.archivedAt === null && scheduleStatus(link) === "live",
  );
  const socialLinks = visibleLinks.filter((link) => link.kind === "social");
  const customLinks = visibleLinks.filter((link) => link.kind !== "social");
  const look = resolveAppearance(profile);
  const contour = buttonContourClass(look.contour);
  const featuredContour = featuredContourClass(look.contour);
  const bodyStyle = buttonBodyStyle({
    color: look.buttonColor,
    textColor: look.buttonTextColor,
    variant: look.variant,
    umbra: look.umbra,
    edge: look.buttonUmbraColor,
  });
  const muted = mutedFor(look.bodyColor);
  const fontFamily = fontStack(look.font);
  const left = look.pageAlignment === "left";
  const hover = hoverClass(look.linkHover);
  // Marks entrance rows for the reduced-motion carve-out in globals.css.
  const entranceClass = look.linkEntrance === "none" ? "" : "rinku-entrance";
  const headerStyle: CssVariables = { fontFamily, "--link-glow": look.buttonColor };

  const headerVariant = profile.headerStyle;

  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col" style={headerStyle}>
      <FontStylesheet font={look.font} />
      {bare ? null : (
        <WallpaperLayer
          kind={look.wallpaper}
          color={look.wallpaperColor}
          colorB={look.wallpaperColorB}
          pattern={look.pattern}
          patternSpacing={look.wallpaperPatternSpacing}
          patternThickness={look.wallpaperPatternThickness}
          imagePath={look.wallpaperImagePath}
          videoPath={look.wallpaperVideoPath}
        />
      )}
      <div
        className="relative mx-auto flex w-full max-w-md flex-1 flex-col"
        style={{ color: look.bodyColor }}
      >
        <ProfileHeader
          variant={headerVariant}
          title={profile.title}
          username={profile.username}
          bio={profile.bio}
          avatarPath={profile.avatarPath}
          bannerPath={profile.bannerPath}
          socialLinks={socialLinks}
          interactive={interactive}
          look={look}
        />
        <div className="flex w-full flex-col px-6 pb-8">
          <div className="mt-2 flex w-full flex-col gap-3">
            {customLinks.length === 0 ? (
              <p
                className={cn("text-sm", left ? "text-left" : "text-center")}
                style={{ color: muted }}
              >
                {socialLinks.length === 0 ? "No links yet." : null}
              </p>
            ) : (
              customLinks.map((link, index) => {
                if (link.kind === "heading") {
                  return (
                    <h2
                      key={link.id}
                      className={cn(
                        "mt-4 text-sm font-semibold tracking-wide wrap-anywhere",
                        left ? "text-left" : "text-center",
                        entranceClass,
                      )}
                      style={{ color: muted, ...entranceStyle(look.linkEntrance, index) }}
                    >
                      {link.title}
                    </h2>
                  );
                }
                const style =
                  (link.kind === "music" ||
                    link.kind === "video" ||
                    link.kind === "embed") &&
                  (link.metadata || link.gatedStyle)
                    ? (link.metadata?.style ?? link.gatedStyle ?? "embed")
                    : null;
                const classicClass = cn(
                  // One height for every classic row: a clamped two-line
                  // title and the 40px thumbnail both fit inside it, so a
                  // long title cannot inflate its pill next to short ones.
                  "flex h-14 w-full items-center border text-sm font-medium transition-[transform,box-shadow,filter] ease-[ease] duration-150 hover:brightness-95",
                  contour,
                  hover,
                  entranceClass,
                );
                const featuredClass = cn(
                  "flex w-full flex-col overflow-hidden border text-left text-sm transition-[transform,box-shadow,filter] ease-[ease] duration-150 hover:brightness-95",
                  featuredContour,
                  hover,
                  entranceClass,
                );
                if (isGated(link)) {
                  const gatedVariant = style ?? link.variant;
                  const asCard = gatedVariant === "featured" || gatedVariant === "embed";
                  return (
                    <AgeGateLink
                      key={link.id}
                      linkId={link.id}
                      title={link.title}
                      minAge={link.minAge ?? 0}
                      presentation={asCard ? "featured" : "classic"}
                      previewSrc={link.hasPreview ? gatedThumbUrl(link.id) : undefined}
                      className={asCard && link.hasPreview ? featuredClass : classicClass}
                      style={{ ...bodyStyle, ...entranceStyle(look.linkEntrance, index) }}
                    />
                  );
                }
                if (style === "embed" && link.metadata) {
                  return (
                    <div
                      key={link.id}
                      className={cn("w-full", entranceClass)}
                      style={entranceStyle(look.linkEntrance, index)}
                    >
                      {isVideoMetadata(link.metadata) ? (
                        <VideoEmbed metadata={link.metadata} />
                      ) : isEmbedMetadata(link.metadata) ? (
                        <BlockEmbed metadata={link.metadata} />
                      ) : (
                        <MusicEmbed metadata={link.metadata} />
                      )}
                    </div>
                  );
                }
                // Classic/featured music links render exactly like custom ones.
                const variant: PreviewLink["variant"] =
                  style !== null && style !== "embed" ? style : link.variant;
                return interactive ? (
                  <div
                    key={link.id}
                    className={variant === "featured" ? featuredClass : classicClass}
                    style={{ ...bodyStyle, ...entranceStyle(look.linkEntrance, index) }}
                  >
                    {variant === "featured" ? (
                      <>
                        <a
                          href={`/go/${link.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <FeaturedCardImage link={link} muted={muted} />
                        </a>
                        <div className="flex items-center gap-2 py-2.5 pr-1.5 pl-3">
                          <a
                            href={`/go/${link.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="line-clamp-2 min-w-0 flex-1 leading-relaxed font-medium"
                          >
                            {link.title}
                          </a>
                          <ShareLinkMenu link={link} />
                        </div>
                      </>
                    ) : (
                      <>
                        <a
                          href={`/go/${link.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2 px-4",
                            left ? "justify-start" : "justify-center",
                          )}
                        >
                          <LinkContent link={link} left={left} />
                        </a>
                        <ShareLinkMenu link={link} className="mr-1.5" />
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    key={link.id}
                    className={variant === "featured" ? featuredClass : classicClass}
                    style={{ ...bodyStyle, ...entranceStyle(look.linkEntrance, index) }}
                  >
                    {variant === "featured" ? (
                      <>
                        <FeaturedCardImage link={link} muted={muted} />
                        <span className="line-clamp-2 px-3 py-2.5 leading-relaxed font-medium">
                          {link.title}
                        </span>
                      </>
                    ) : (
                      <span
                        className={cn(
                          "flex flex-1 items-center gap-2 px-4",
                          left ? "justify-start" : "justify-center",
                        )}
                      >
                        <LinkContent link={link} left={left} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <footer className="relative mt-auto flex justify-center pt-8 pb-6 text-xs">
          {/* Platform chrome, not themed content: the pill carries its own
              contrast and stays centered no matter the page's colors or
              alignment. */}
          <span className="inline-flex items-center gap-3 rounded-full bg-black/55 px-3.5 py-1.5 text-white backdrop-blur-sm">
            <Link href="/terms" className="transition hover:opacity-70">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:opacity-70">
              Privacy
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
