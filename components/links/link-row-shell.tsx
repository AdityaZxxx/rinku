"use client";

import Image from "next/image";
import type { Link } from "@/lib/db/schema";
import {
  CalendarBlankIcon,
  CaretDownIcon,
  DotsSixVerticalIcon,
  GlobeSimpleIcon,
  LockSimpleIcon,
} from "@phosphor-icons/react";

import { MediaIcon } from "@/components/media-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSrcImageFailure, useFaviconImage } from "@/components/use-image-failure";
import { isIconMedia } from "@/lib/links/media";
import { displayUrl, faviconUrl, scheduleStatus } from "@/lib/links/model";
import { cn } from "@/lib/utils";
import { scheduleSummary } from "./schedule-picker";

type LinkRowShellProps = {
  link: Link;
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Present while the links editor is in selection mode: rows pick, not edit. */
  selection?: {
    selected: boolean;
    onToggle: () => void;
  };
  activatorRef?: React.Ref<HTMLButtonElement>;
  activatorProps?: React.ComponentPropsWithoutRef<"button">;
  className?: string;
  children?: React.ReactNode;
};

export function LinkRowShell({
  link,
  expanded = false,
  onToggleExpand,
  selection,
  activatorRef,
  activatorProps,
  className,
  children,
}: LinkRowShellProps) {
  const icon = faviconUrl(link.url);
  const hidden = !link.isActive;
  const status = scheduleStatus(link);
  const summary = scheduleSummary(link.visibleFrom, link.visibleUntil);
  // A remote thumbnail is stored as-is, so its origin can die at any time;
  // the row then falls back to the favicon rather than a broken-image glyph.
  const remoteThumb =
    link.imageUrl && !isIconMedia(link.imageUrl) && link.imageUrl !== ""
      ? link.imageUrl
      : null;
  const [thumbBroken, onThumbFailed, thumbFailedRef] = useSrcImageFailure(remoteThumb);
  // A domain with no favicon gets the renderer's 16x16 placeholder, which
  // reads as pixelated once the 40px circle upscales it: swap it for the
  // vector globe below instead. A real favicon comes back at 48x48 or more.
  const [faviconState, onFaviconLoad, onFaviconError, faviconRef] = useFaviconImage(icon);

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border transition-opacity duration-200",
        className,
      )}
    >
      <div className="flex items-center gap-2 p-3">
        {/* In selection mode the checkbox takes the thumbnail's slot on the
            grip zone's geometry (-ml-2 size-10): its left edge lands exactly
            where the heading row's checkbox sits, the 40px box keeps the row
            height and title width constant, and the caret keeps a same-size
            placeholder. Nothing in the row moves when modes swap. */}
        {selection ? (
          <span className="-ml-2 flex size-10 shrink-0 items-center justify-center">
            <Checkbox
              checked={selection.selected}
              onCheckedChange={() => selection.onToggle()}
              aria-label={`Select ${link.title || displayUrl(link.url)}`}
              className="size-5"
            />
          </span>
        ) : (
          <>
            <button
              ref={activatorRef}
              type="button"
              {...activatorProps}
              className="text-muted-foreground hover:bg-muted focus:bg-muted sr-only -ml-1 touch-none rounded-lg p-2 focus:not-sr-only"
              aria-label="Drag to reorder"
            >
              <DotsSixVerticalIcon className="size-4" />
            </button>

            {link.imageUrl && isIconMedia(link.imageUrl) ? (
              <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
                <MediaIcon imageUrl={link.imageUrl} className="size-5" />
              </span>
            ) : remoteThumb && !thumbBroken ? (
              <Image
                unoptimized
                ref={thumbFailedRef}
                src={remoteThumb}
                alt=""
                width={40}
                height={40}
                onError={onThumbFailed}
                className={cn(
                  "size-10 shrink-0 rounded-full object-cover",
                  hidden && "opacity-60 grayscale",
                )}
              />
            ) : icon && faviconState === "show" ? (
              <Image
                unoptimized
                ref={faviconRef}
                src={icon}
                alt=""
                width={40}
                height={40}
                onLoad={onFaviconLoad}
                onError={onFaviconError}
                className={cn(
                  "bg-muted size-10 shrink-0 rounded-full object-contain p-1.5",
                  hidden && "opacity-60 grayscale",
                )}
              />
            ) : (
              <span
                className={cn(
                  "bg-muted flex size-10 shrink-0 items-center justify-center rounded-full",
                  hidden && "opacity-60",
                )}
              >
                <GlobeSimpleIcon className="text-muted-foreground size-5" />
              </span>
            )}
          </>
        )}

        <button
          type="button"
          onClick={selection ? selection.onToggle : onToggleExpand}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
          aria-expanded={selection ? undefined : expanded}
          aria-pressed={selection ? selection.selected : undefined}
        >
          <span
            className={cn(
              "max-w-full truncate text-sm",
              hidden ? "text-muted-foreground" : "font-medium",
            )}
          >
            {link.title}
          </span>
          <span className="text-muted-foreground flex max-w-full items-center gap-1.5 truncate text-xs">
            {summary ? (
              <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs leading-none font-medium">
                <CalendarBlankIcon className="size-2.5" />
                {status === "scheduled"
                  ? "Scheduled "
                  : status === "expired"
                    ? "Expired "
                    : null}
                {summary}
              </span>
            ) : null}
            <span className="truncate">{displayUrl(link.url)}</span>
            {link.minAge ? (
              <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs leading-none font-medium">
                <LockSimpleIcon className="size-2.5" />
                {link.minAge}+
              </span>
            ) : null}
          </span>
        </button>

        {selection ? (
          // Holds the caret's exact box so the title button keeps its width.
          <span aria-hidden="true" className="size-8 shrink-0" />
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="text-muted-foreground hover:bg-muted rounded-lg p-2"
                  aria-expanded={expanded}
                  aria-label={expanded ? "Collapse link" : "Expand link"}
                >
                  <CaretDownIcon
                    className={cn(
                      "size-4 transition-transform duration-200 motion-reduce:transition-none",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
              }
            />
            <TooltipContent>{expanded ? "Collapse" : "Expand"}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {children}
    </div>
  );
}
