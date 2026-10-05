import Image from "next/image";
import Link from "next/link";
import type { Profile } from "@/lib/db/schema";
import type { LinkMetadata } from "@/lib/music";
import type { VideoMetadata } from "@/lib/video";

import { FontStylesheet } from "@/components/appearance/font-stylesheet";
import { WallpaperLayer } from "@/components/appearance/wallpaper-layer";
import { MusicEmbed } from "@/components/links/music-embed";
import { VideoEmbed } from "@/components/links/video-embed";
import { MediaIcon } from "@/components/media-icon";
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
import { faviconUrl } from "@/lib/links";
import { isIconMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

export interface PreviewLink {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  variant: "classic" | "featured";
  isActive: boolean;
  archivedAt: Date | null;
  kind?: "custom" | "social" | "music" | "video";
  platform?: string | null;
  metadata?: LinkMetadata | VideoMetadata | null;
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
        // Tiny renderer favicons: next/image would proxy each host, and the
        // user's list changes hosts often enough that the optimizer cache
        // never earns its keep.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="size-5 shrink-0 rounded-full" />
      ) : null}
      <span className="line-clamp-2">{link.title}</span>
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
  const visibleLinks = links.filter((link) => link.isActive && link.archivedAt === null);
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
                const style =
                  (link.kind === "music" || link.kind === "video") && link.metadata
                    ? (link.metadata.style ?? "embed")
                    : null;
                if (style === "embed" && link.metadata) {
                  return (
                    <div key={link.id} className="w-full">
                      {link.metadata.provider === "youtube" ||
                      link.metadata.provider === "vimeo" ? (
                        <VideoEmbed metadata={link.metadata} />
                      ) : (
                        <MusicEmbed metadata={link.metadata} />
                      )}
                    </div>
                  );
                }
                // Classic/featured music links render exactly like custom ones.
                const variant: PreviewLink["variant"] =
                  style !== null && style !== "embed" ? style : link.variant;
                const classicClass = cn(
                  "flex w-full items-center border text-sm font-medium transition hover:brightness-95",
                  contour,
                );
                const featuredClass = cn(
                  "flex w-full flex-col overflow-hidden border text-left text-sm transition hover:brightness-95",
                  featuredContour,
                );
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
