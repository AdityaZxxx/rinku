import Image from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { faviconUrl } from "@/lib/links";
import { avatarUrl, bannerUrl } from "@/lib/storage";

export interface PreviewLink {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  variant: "classic" | "featured";
  isActive: boolean;
  archivedAt: Date | null;
}

function LinkContent({ link }: { link: PreviewLink }) {
  const favicon = faviconUrl(link.url);
  return (
    <>
      {link.imageUrl ? (
        <Image
          src={link.imageUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-md object-cover"
          unoptimized
        />
      ) : favicon ? (
        // Tiny renderer favicons: next/image would proxy each host, and the
        // user's list changes hosts often enough that the optimizer cache
        // never earns its keep.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="size-5 rounded-sm" />
      ) : null}
      <span className="truncate">{link.title}</span>
    </>
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

        <div className="mt-2 flex w-full flex-col gap-2">
          {visibleLinks.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">No links yet.</p>
          ) : (
            visibleLinks.map((link) =>
              interactive ? (
                <a
                  key={link.id}
                  href={`/go/${link.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    link.variant === "featured"
                      ? "border-input bg-card hover:bg-accent flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm shadow-sm transition"
                      : "border-input bg-card hover:bg-accent flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-sm transition"
                  }
                >
                  <LinkContent link={link} />
                </a>
              ) : (
                <div
                  key={link.id}
                  className={
                    link.variant === "featured"
                      ? "border-input bg-card flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm shadow-sm"
                      : "border-input bg-card flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm shadow-sm"
                  }
                >
                  <LinkContent link={link} />
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
