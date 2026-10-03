import Image from "next/image";
import type { PreviewLink } from "@/components/profile/profile-preview-content";

import { SocialIcon } from "@/components/social-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { platformById } from "@/lib/platforms";
import { avatarUrl, bannerUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type ProfileHeaderVariant =
  | "classic"
  | "hero"
  | "banner"
  | "cutout"
  | "minimal"
  | "left"
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
}: {
  variant: ProfileHeaderVariant;
  displayName: string | null;
  username: string;
  bio: string | null;
  avatarPath: string | null;
  bannerPath: string | null;
  socialLinks: PreviewLink[];
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 px-6 pt-6 pb-6",
        variant === "left" ? "items-start" : "items-center",
      )}
    >
      {variant === "banner" ? (
        <div className="bg-muted relative -mx-6 h-28 w-[calc(100%+3rem)]">
          {bannerPath ? (
            <Image
              src={bannerUrl(bannerPath)}
              alt=""
              fill
              className="object-cover"
              sizes="448px"
            />
          ) : null}
        </div>
      ) : null}

      {variant === "hero" ? (
        <div className="bg-muted relative -mx-6 h-80 w-[calc(100%+3rem)]">
          {avatarPath ? (
            <Image
              src={avatarUrl(avatarPath)}
              alt=""
              fill
              className="[mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] object-cover"
              sizes="448px"
            />
          ) : null}
          <div className="to-background absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent" />
        </div>
      ) : null}

      {variant === "cutout" ? (
        <div className="bg-muted relative aspect-square w-4/5 overflow-hidden rounded-3xl">
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

      {variant !== "minimal" &&
      variant !== "statement" &&
      variant !== "hero" &&
      variant !== "cutout" ? (
        <Avatar
          className={cn(
            "border-background size-18 border-4",
            variant === "banner" && "-mt-12",
          )}
        >
          <AvatarImage src={avatarPath ? avatarUrl(avatarPath) : undefined} />
          <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ) : null}

      {variant === "statement" ? (
        <div className="flex w-full flex-col items-center gap-3 py-2 text-center">
          <p className="font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {bio?.trim()
              ? bio.trim()
              : displayName?.trim()
                ? displayName.trim()
                : username}
          </p>
          <p className="text-muted-foreground text-sm">
            — {displayName?.trim() ? displayName.trim() : username}
          </p>
          <p className="text-muted-foreground text-sm">@{username}</p>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-1",
            variant === "left" ? "items-start" : "items-center text-center",
            variant === "hero" && "-mt-2",
          )}
        >
          <p className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            {displayName?.trim() ? displayName : username}
          </p>
          <p className="text-muted-foreground text-sm">@{username}</p>
          {bio?.trim() && variant !== "left" ? (
            <p className="text-muted-foreground max-w-prose text-sm">{bio}</p>
          ) : null}
          {bio?.trim() && variant === "left" ? (
            <p className="text-muted-foreground max-w-prose text-sm whitespace-pre-line">
              {bio}
            </p>
          ) : null}
        </div>
      )}

      {socialLinks.length > 0 ? (
        <div
          className={cn(
            "flex items-center gap-2.5",
            variant === "left" ? "justify-start" : "justify-center",
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
                className="border-input bg-card hover:bg-accent text-foreground inline-flex size-10 items-center justify-center rounded-full border shadow-sm transition-colors duration-150"
              >
                <SocialIcon id={link.platform ?? ""} className="size-5" />
              </a>
            ) : (
              <div
                key={link.id}
                aria-label={Platform?.label ?? link.title}
                className="border-input bg-card text-foreground inline-flex size-10 items-center justify-center rounded-full border shadow-sm"
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
