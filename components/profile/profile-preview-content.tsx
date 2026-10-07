import Image from "next/image";
import Link from "next/link";
import type { Profile } from "@/lib/db/schema";
import type { EmbedMetadata } from "@/lib/embeds";
import type { LinkMetadata } from "@/lib/music";
import type { VideoMetadata } from "@/lib/video";

import { FontStylesheet } from "@/components/appearance/font-stylesheet";
import { WallpaperLayer } from "@/components/appearance/wallpaper-layer";
import { BlockEmbed } from "@/components/links/block-embed";
import { MusicEmbed } from "@/components/links/music-embed";
import { VideoEmbed } from "@/components/links/video-embed";
import { MediaIcon } from "@/components/media-icon";
import { AgeGateLink, AgeBadge } from "@/components/profile/age-gate-link";
import {
  ProfileHeader,
  type ProfileHeaderVariant,
} from "@/components/profile/profile-header";
import { ShareLinkMenu } from "@/components/profile/share-link-menu";
import {
  buttonBodyStyle,
  buttonContourClass,
  featuredContourClass,
  fontStack,
  mutedFor,
  resolveAppearance,
} from "@/lib/appearance";
import { faviconUrl, scheduleStatus } from "@/lib/links";
import { isIconMedia } from "@/lib/media";
import { gatedThumbUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

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

function LinkContent({ link }: { link: PreviewLink }) {
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
        // eslint-disable-next-line @next/next/no-img-element -- tiny cross-host favicon: next/image would proxy each host and the optimizer cache never earns its keep
        <img src={favicon} alt="" className="size-5 shrink-0 rounded-full" />
      ) : null}
      <span className="line-clamp-2">{link.title}</span>
      {link.minAge && link.minAge > 0 ? <AgeBadge minAge={link.minAge} /> : null}
    </>
  );
}

function FeaturedCardImage({ link, muted }: { link: PreviewLink; muted: string }) {
  if (!link.imageUrl) {
    return (
      <div className="aspect-[1200/630] w-full" style={{ backgroundColor: muted }} />
    );
  }
  if (isIconMedia(link.imageUrl)) {
    return (
      <div className="grid aspect-[1200/630] w-full place-items-center">
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
      className="aspect-[1200/630] w-full object-cover"
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
    edge: look.titleColor,
  });
  const muted = mutedFor(look.bodyColor);
  const fontFamily = fontStack(look.font);

  // SAFETY: headerStyle is constrained to this union by the database
  // CHECK and the zod schema, so the persisted value narrows safely.
  const headerVariant = profile.headerStyle as ProfileHeaderVariant;

  return (
    <div
      className="relative flex min-h-full w-full flex-1 flex-col"
      style={{ fontFamily }}
    >
      <FontStylesheet font={look.font} />
      {bare ? null : (
        <WallpaperLayer
          kind={look.wallpaper}
          color={look.wallpaperColor}
          colorB={look.wallpaperColorB}
          pattern={look.pattern}
          imagePath={look.wallpaperImagePath}
          videoPath={look.wallpaperVideoPath}
          titleColor={look.titleColor}
        />
      )}
      <div
        className="relative mx-auto flex w-full max-w-md flex-1 flex-col"
        style={{ color: look.bodyColor }}
      >
        <ProfileHeader
          variant={headerVariant}
          displayName={profile.displayName}
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
              <p className="text-center text-sm" style={{ color: muted }}>
                {socialLinks.length === 0 ? "No links yet." : null}
              </p>
            ) : (
              customLinks.map((link) => {
                if (link.kind === "heading") {
                  return (
                    <h2
                      key={link.id}
                      className="mt-4 text-sm font-semibold tracking-wide"
                      style={{ color: muted }}
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
                  "flex w-full items-center border text-sm font-medium transition hover:brightness-95",
                  contour,
                );
                const featuredClass = cn(
                  "flex w-full flex-col overflow-hidden border text-left text-sm transition hover:brightness-95",
                  featuredContour,
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
                      style={bodyStyle}
                    />
                  );
                }
                if (style === "embed" && link.metadata) {
                  return (
                    <div key={link.id} className="w-full">
                      {link.kind === "video" ? (
                        // SAFETY: kind === "video" implies VideoMetadata shape.
                        <VideoEmbed metadata={link.metadata as VideoMetadata} />
                      ) : link.kind === "embed" ? (
                        // SAFETY: kind === "embed" implies EmbedMetadata shape.
                        <BlockEmbed metadata={link.metadata as EmbedMetadata} />
                      ) : (
                        // SAFETY: only music left.
                        <MusicEmbed metadata={link.metadata as LinkMetadata} />
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
                    style={bodyStyle}
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
                            className="line-clamp-2 min-w-0 flex-1 font-medium"
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
                          className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-2.5"
                        >
                          <LinkContent link={link} />
                        </a>
                        <ShareLinkMenu link={link} className="mr-1.5" />
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    key={link.id}
                    className={variant === "featured" ? featuredClass : classicClass}
                    style={bodyStyle}
                  >
                    {variant === "featured" ? (
                      <>
                        <FeaturedCardImage link={link} muted={muted} />
                        <span className="line-clamp-2 px-3 py-2.5 font-medium">
                          {link.title}
                        </span>
                      </>
                    ) : (
                      <span className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5">
                        <LinkContent link={link} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <footer
          className="relative mt-auto flex justify-center gap-3 pt-8 pb-6 text-xs"
          style={{ color: muted }}
        >
          <Link href="/terms" className="transition hover:opacity-70">
            Terms
          </Link>
          <Link href="/privacy" className="transition hover:opacity-70">
            Privacy
          </Link>
        </footer>
      </div>
    </div>
  );
}
