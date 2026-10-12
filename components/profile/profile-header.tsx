import Image from "next/image";
import type { PreviewLink } from "@/components/profile/profile-preview-content";

import { SocialIcon } from "@/components/social-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { platformById } from "@/lib/links/platforms";
import {
  buttonBodyStyle,
  fontStack,
  mutedFor,
  type ResolvedAppearance,
} from "@/lib/profiles/appearance";
import { profileInitials } from "@/lib/profiles/initials";
import { avatarUrl, bannerUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

export type ProfileHeaderVariant =
  | "classic"
  | "hero"
  | "banner"
  | "cutout"
  | "minimal"
  | "statement";

export function ProfileHeader({
  variant,
  displayName,
  username,
  bio,
  avatarPath,
  bannerPath,
  socialLinks,
  interactive = true,
  look,
}: {
  variant: ProfileHeaderVariant;
  displayName: string | null;
  username: string;
  bio: string | null;
  avatarPath: string | null;
  bannerPath: string | null;
  socialLinks: PreviewLink[];
  interactive?: boolean;
  look: ResolvedAppearance;
}) {
  const muted = mutedFor(look.bodyColor);
  const fontFamily = fontStack(look.font);
  const left = look.pageAlignment === "left";
  const socialStyle = buttonBodyStyle({
    color: look.buttonColor,
    textColor: look.buttonTextColor,
    variant: look.variant,
    umbra: look.umbra,
    edge: look.titleColor,
  });
  // Each layout is a complete recipe, Linktree-style: the avatar is identity
  // and never replaced, and the banner is media that renders only in the
  // "banner" recipe, fading into the wallpaper so the page stays composed.
  const bannerSrc = bannerPath ? bannerUrl(bannerPath) : null;
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 px-6 pt-6 pb-6",
        left ? "items-start" : "items-center",
      )}
      style={{ fontFamily }}
    >
      {variant === "banner" && bannerSrc ? (
        <div
          className="relative -mx-6 -mt-6 h-44 w-[calc(100%+3rem)]"
          style={{ backgroundColor: muted }}
        >
          <Image src={bannerSrc} alt="" fill className="object-cover" sizes="448px" />
          <div
            className="absolute inset-x-0 bottom-0 h-16"
            style={{
              background: `linear-gradient(to bottom, transparent, ${look.wallpaperColor})`,
            }}
          />
        </div>
      ) : null}

      {variant === "hero" ? (
        <div
          className="relative -mx-6 -mt-6 h-80 w-[calc(100%+3rem)]"
          style={{ backgroundColor: muted }}
        >
          {avatarPath ? (
            <Image
              src={avatarUrl(avatarPath)}
              alt=""
              fill
              className="mask-[linear-gradient(to_bottom,black_60%,transparent_100%)] object-cover"
              sizes="448px"
            />
          ) : null}
          <div
            className="absolute inset-x-0 bottom-0 h-16"
            style={{
              background: `linear-gradient(to bottom, transparent, ${look.wallpaperColor})`,
            }}
          />
        </div>
      ) : null}

      {variant === "cutout" ? (
        <div
          className="relative aspect-square w-4/5 overflow-hidden rounded-3xl"
          style={{ backgroundColor: muted }}
        >
          {avatarPath ? (
            <Image
              src={avatarUrl(avatarPath)}
              alt=""
              fill
              className="object-cover"
              sizes="360px"
            />
          ) : null}
        </div>
      ) : null}

      {variant === "classic" || variant === "banner" ? (
        <Avatar
          className={cn("size-18 border-4", variant === "banner" && "-mt-12")}
          style={{ borderColor: look.wallpaperColor }}
        >
          <AvatarImage src={avatarPath ? avatarUrl(avatarPath) : undefined} />
          <AvatarFallback>{profileInitials(displayName, username)}</AvatarFallback>
        </Avatar>
      ) : null}

      {variant === "statement" ? (
        <div
          className={cn(
            "flex w-full flex-col gap-3 py-2",
            left ? "items-start text-left" : "items-center text-center",
          )}
        >
          <p
            className="line-clamp-4 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
            style={{ color: look.titleColor }}
          >
            {bio?.trim()
              ? bio.trim()
              : displayName?.trim()
                ? displayName.trim()
                : username}
          </p>
          <p className="text-sm" style={{ color: muted }}>
            {displayName?.trim() ? displayName.trim() : username}
          </p>
          <p className="text-sm" style={{ color: muted }}>
            @{username}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-1",
            left ? "items-start text-left" : "items-center text-center",
            variant === "hero" && "-mt-2",
          )}
        >
          <p
            className="text-2xl leading-tight font-semibold tracking-tight"
            style={{ color: look.titleColor }}
          >
            {displayName?.trim() ? displayName : username}
          </p>
          <p className="text-sm" style={{ color: muted }}>
            @{username}
          </p>
          {bio?.trim() ? (
            <p
              className={cn("max-w-prose text-sm", left && "whitespace-pre-line")}
              style={{ color: look.bodyColor }}
            >
              {bio}
            </p>
          ) : null}
        </div>
      )}

      {socialLinks.length > 0 ? (
        <div
          className={cn(
            // No flex-wrap pushed icons off both edges of a narrow page: six
            // platform icons at 50px already overflow a 360px frame.
            "flex flex-wrap items-center gap-2.5",
            left ? "justify-start" : "justify-center",
          )}
        >
          {socialLinks.map((link) => {
            const Platform = platformById(link.platform);
            return interactive ? (
              <a
                key={link.id}
                href={`/go/${link.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={Platform?.label ?? link.title}
                title={Platform?.label ?? link.title}
                className="inline-flex size-10 items-center justify-center rounded-full border transition hover:brightness-95"
                style={socialStyle}
              >
                <SocialIcon id={link.platform ?? ""} className="size-5" />
              </a>
            ) : (
              <div
                key={link.id}
                aria-label={Platform?.label ?? link.title}
                className="inline-flex size-10 items-center justify-center rounded-full border"
                style={socialStyle}
              >
                <SocialIcon id={link.platform ?? ""} className="size-5" />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
