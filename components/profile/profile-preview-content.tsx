import Image from "next/image";

import { MediaIcon, isIconMedia } from "@/components/media-icon";
import { SocialIcon } from "@/components/social-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { faviconUrl } from "@/lib/links";
import { platformById } from "@/lib/platforms";
import { avatarUrl, bannerUrl } from "@/lib/storage";

export interface PreviewLink {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  variant: "classic" | "featured";
  isActive: boolean;
  archivedAt: Date | null;
  kind?: "custom" | "social";
  platform?: string | null;
}

function LinkContent({ link }: { link: PreviewLink }) {
  const favicon = faviconUrl(link.url);
  return (
    <>
      {isIconMedia(link.imageUrl) ? (
        <span className="bg-muted inline-flex size-10 items-center justify-center rounded-full">
          <MediaIcon imageUrl={link.imageUrl} className="size-5" />
        </span>
      ) : link.imageUrl && link.imageUrl !== "" ? (
        <Image
          src={link.imageUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
          unoptimized
        />
      ) : link.imageUrl === null && favicon ? (
        // Tiny renderer favicons: next/image would proxy each host, and the
        // user's list changes hosts often enough that the optimizer cache
        // never earns its keep.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="size-5 rounded-full" />
      ) : null}
      <span className="truncate">{link.title}</span>
    </>
  );
}

function FeaturedCardImage({ link }: { link: PreviewLink }) {
  if (!link.imageUrl) {
    return <div className="bg-muted aspect-[1200/630] w-full" />;
  }
  if (isIconMedia(link.imageUrl)) {
    return (
      <div className="bg-muted grid aspect-[1200/630] w-full place-items-center">
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
  displayName,
  username,
  bio,
  avatarPath,
  bannerPath,
  links,
  interactive = true,
}: {
  displayName: string | null;
  username: string;
  bio: string | null;
  avatarPath: string | null;
  bannerPath: string | null;
  links: PreviewLink[];
  interactive?: boolean;
}) {
  const visibleLinks = links.filter((link) => link.isActive && link.archivedAt === null);
  const socialLinks = visibleLinks.filter((link) => link.kind === "social");
  const customLinks = visibleLinks.filter((link) => link.kind !== "social");

  return (
    <div className="bg-background flex w-full flex-col">
      <div className="bg-muted relative h-28 w-full">
        {bannerPath ? (
          <Image
            src={bannerUrl(bannerPath)}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-3 px-6 pb-8">
        <Avatar className="border-background -mt-9 size-18 border-4">
          <AvatarImage src={avatarPath ? avatarUrl(avatarPath) : undefined} />
          <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-lg leading-tight font-semibold">
            {displayName?.trim() ? displayName : username}
          </p>
          <p className="text-muted-foreground text-sm">@{username}</p>
          {bio?.trim() ? (
            <p className="text-muted-foreground max-w-prose text-sm">{bio}</p>
          ) : null}
        </div>

        {socialLinks.length > 0 ? (
          <div className="flex items-center justify-center gap-2.5">
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
                  className="border-input bg-card hover:bg-accent text-foreground inline-flex size-10 items-center justify-center rounded-full border shadow-sm transition"
                >
                  {link.platform ? (
                    <SocialIcon id={link.platform} className="size-5" />
                  ) : (
                    link.title
                  )}
                </a>
              ) : (
                <div
                  key={link.id}
                  aria-label={Platform?.label ?? link.title}
                  className="border-input bg-card text-foreground inline-flex size-10 items-center justify-center rounded-full border shadow-sm"
                >
                  {link.platform ? (
                    <SocialIcon id={link.platform} className="size-5" />
                  ) : (
                    link.title
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-2 flex w-full flex-col gap-2">
          {customLinks.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">
              {socialLinks.length === 0 ? "No links yet." : null}
            </p>
          ) : (
            customLinks.map((link) =>
              interactive ? (
                <a
                  key={link.id}
                  href={`/go/${link.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    link.variant === "featured"
                      ? "border-input bg-card hover:bg-accent flex w-full flex-col overflow-hidden rounded-xl border text-left text-sm shadow-sm transition"
                      : "border-input bg-card hover:bg-accent flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-sm transition"
                  }
                >
                  {link.variant === "featured" ? (
                    <>
                      <FeaturedCardImage link={link} />
                      <span className="px-3 py-2.5 font-medium">{link.title}</span>
                    </>
                  ) : (
                    <LinkContent link={link} />
                  )}
                </a>
              ) : (
                <div
                  key={link.id}
                  className={
                    link.variant === "featured"
                      ? "border-input bg-card flex w-full flex-col overflow-hidden rounded-xl border text-left text-sm shadow-sm"
                      : "border-input bg-card flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-sm"
                  }
                >
                  {link.variant === "featured" ? (
                    <>
                      <FeaturedCardImage link={link} />
                      <span className="px-3 py-2.5 font-medium">{link.title}</span>
                    </>
                  ) : (
                    <LinkContent link={link} />
                  )}
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
