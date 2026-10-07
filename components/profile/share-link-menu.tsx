"use client";

import { useState } from "react";
import type { PreviewLink } from "./profile-preview-content";
import {
  CheckIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  EnvelopeSimpleIcon,
  FacebookLogoIcon,
  LinkedinLogoIcon,
  RedditLogoIcon,
  ShareNetworkIcon,
  TelegramLogoIcon,
  WhatsappLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { MediaIcon } from "@/components/media-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { faviconUrl } from "@/lib/links";
import { isIconMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface ShareTarget {
  id: string;
  label: string;
  Icon: typeof XLogoIcon;
  href: (url: string, text: string) => string;
}

const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "x",
    label: "X",
    Icon: XLogoIcon,
    href: (url, text) => `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    Icon: FacebookLogoIcon,
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    Icon: WhatsappLogoIcon,
    href: (url, text) => `https://wa.me/?text=${text}%20${url}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    Icon: TelegramLogoIcon,
    href: (url, text) => `https://t.me/share/url?url=${url}&text=${text}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    Icon: LinkedinLogoIcon,
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    Icon: RedditLogoIcon,
    href: (url, text) => `https://www.reddit.com/submit?url=${url}&title=${text}`,
  },
  {
    id: "email",
    label: "Email",
    Icon: EnvelopeSimpleIcon,
    href: (url, text) => `mailto:?subject=${text}&body=${url}`,
  },
];

export function ShareLinkMenu({
  link,
  className,
}: {
  link: PreviewLink;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // DialogContent only mounts on open, so this check runs client-side and
  // can't cause a hydration mismatch.
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  const favicon = link.imageUrl === null ? faviconUrl(link.url) : null;

  function shareUrl(): string {
    return new URL(`/go/${link.id}`, window.location.origin).toString();
  }

  function shareTo(target: ShareTarget) {
    const url = encodeURIComponent(shareUrl());
    const text = encodeURIComponent(link.title);
    const href = target.href(url, text);
    if (target.id === "email") {
      window.location.assign(href);
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
    setOpen(false);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: link.title, url: shareUrl() });
      setOpen(false);
    } catch {
      // User dismissed the sheet or share failed, so leave the dialog open.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Share ${link.title}`}
            className={cn(
              "shrink-0 rounded-full p-1.5 opacity-70 transition hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none",
              className,
            )}
          />
        }
      >
        <DotsThreeVerticalIcon className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Share link</DialogTitle>
        </DialogHeader>
        <div className="bg-card text-card-foreground overflow-hidden rounded-xl border">
          {isIconMedia(link.imageUrl) ? (
            <div className="bg-muted grid aspect-1200/630 w-full place-items-center">
              <MediaIcon imageUrl={link.imageUrl} className="size-16" />
            </div>
          ) : link.imageUrl ? (
            // Favicon-sized/hosted user images: same as the profile rows, the
            // optimizer cache never earns its keep for these.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={link.imageUrl}
              alt=""
              className="aspect-1200/630 w-full object-cover"
            />
          ) : null}
          <div className="flex items-center gap-3 px-3 py-2.5">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" className="size-5 shrink-0 rounded-full" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{link.title}</p>
              <p className="text-muted-foreground truncate text-xs">{hostOf(link.url)}</p>
            </div>
          </div>
        </div>
        <ScrollArea className="scroll-fade-10 **:data-[slot=scroll-area-viewport]:scroll-fade-x min-w-0 px-2">
          <div className="mb-4 flex w-max snap-x items-start gap-2 p-0.5">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? "Copied" : "Copy link"}
                title={copied ? "Copied" : "Copy link"}
                className="border-input hover:bg-accent focus-visible:ring-ring/30 inline-flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-3 focus-visible:outline-none"
              >
                {copied ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </button>
              <span className="text-muted-foreground text-xs">
                {copied ? "Copied" : "Copy"}
              </span>
            </div>
            {SHARE_TARGETS.map((target) => (
              <div key={target.id} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => shareTo(target)}
                  aria-label={`Share to ${target.label}`}
                  title={target.label}
                  className="border-input hover:bg-accent focus-visible:ring-ring/30 inline-flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <target.Icon className="size-4" />
                </button>
                <span className="text-muted-foreground text-xs">{target.label}</span>
              </div>
            ))}
          </div>
          <ScrollBar
            orientation="horizontal"
            className="opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100 data-[hovering]:opacity-100 data-[scrolling]:opacity-100"
          />
        </ScrollArea>

        <div className="flex flex-col gap-1">
          {canNativeShare ? (
            <button
              type="button"
              onClick={nativeShare}
              className="hover:bg-accent focus-visible:ring-ring/30 flex items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <span className="border-input inline-flex size-9 items-center justify-center rounded-full border">
                <ShareNetworkIcon className="size-4" />
              </span>
              Share via…
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
