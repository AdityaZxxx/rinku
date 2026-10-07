"use client";

import { useState } from "react";
import { LockSimpleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Small lock chip marking an age-restricted link. Lives in this client module
 * because Phosphor icons create a React context, which the RSC build of the
 * profile renderer cannot evaluate.
 */
export function AgeBadge({ minAge }: { minAge: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium opacity-70"
      title={`Age-restricted to ${minAge}+`}
    >
      <LockSimpleIcon className="size-2.5" aria-hidden />
      {minAge}+
    </span>
  );
}

export function AgeGateLink({
  linkId,
  title,
  minAge,
  previewSrc,
  presentation = "featured",
  className,
  style,
}: {
  linkId: string;
  title: string;
  minAge: number;
  previewSrc?: string;
  presentation?: "featured" | "classic";
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(className, "cursor-pointer")}
        style={style}
      >
        {presentation === "featured" && previewSrc ? (
          <>
            {/* The server sends a blurred, downscaled copy, so stripping CSS
                cannot recover the thumbnail. */}
            <span className="relative block w-full overflow-hidden">
              {/* The derivative route blurs server-side; minimal CSS softening. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt=""
                aria-hidden
                className="aspect-1200/630 w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="text-background flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur-xs">
                  <LockSimpleIcon className="size-3.5" aria-hidden />
                  {minAge}+
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2 px-3 py-2.5">
              <span className="line-clamp-2 min-w-0 flex-1 font-medium">{title}</span>
              <LockSimpleIcon className="size-4 shrink-0 opacity-60" aria-hidden />
            </span>
          </>
        ) : presentation === "classic" && previewSrc ? (
          <span className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-2.5">
            {/* Same slot the real thumbnail would occupy, server-blurred. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt=""
              aria-hidden
              className="size-10 shrink-0 rounded-full object-cover"
            />
            <LockSimpleIcon className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="truncate font-medium">{title}</span>
            <span
              className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium opacity-70"
              aria-hidden
            >
              {minAge}+
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-2.5">
            <LockSimpleIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{title}</span>
            <span
              className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium opacity-70"
              aria-hidden
            >
              {minAge}+
            </span>
          </span>
        )}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Age-restricted link</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This link is intended for people {minAge} or older. Please confirm to
            continue.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <form method="post" action={`/go/${linkId}`}>
              <Button type="submit">I am {minAge} or older</Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
