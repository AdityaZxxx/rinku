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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isIconMedia } from "@/lib/links/media";
import { displayUrl, faviconUrl, scheduleStatus } from "@/lib/links/model";
import { cn } from "@/lib/utils";
import { scheduleSummary } from "./schedule-picker";

type LinkRowShellProps = {
  link: Link;
  expanded?: boolean;
  onToggleExpand?: () => void;
  activatorRef?: React.Ref<HTMLButtonElement>;
  activatorProps?: React.ComponentPropsWithoutRef<"button">;
  className?: string;
  children?: React.ReactNode;
};

export function LinkRowShell({
  link,
  expanded = false,
  onToggleExpand,
  activatorRef,
  activatorProps,
  className,
  children,
}: LinkRowShellProps) {
  const icon = faviconUrl(link.url);
  const hidden = !link.isActive;
  const status = scheduleStatus(link);
  const summary = scheduleSummary(link.visibleFrom, link.visibleUntil);

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border transition-opacity duration-200",
        className,
      )}
    >
      <div className="flex items-center gap-2 p-3">
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
        ) : link.imageUrl && link.imageUrl !== "" ? (
          <Image
            unoptimized
            src={link.imageUrl}
            alt=""
            width={40}
            height={40}
            className={cn(
              "size-10 shrink-0 rounded-full object-cover",
              hidden && "opacity-60 grayscale",
            )}
          />
        ) : link.imageUrl === null && icon ? (
          <Image
            unoptimized
            src={icon}
            alt=""
            width={40}
            height={40}
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

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
          aria-expanded={expanded}
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
              <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
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
              <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                <LockSimpleIcon className="size-2.5" />
                {link.minAge}+
              </span>
            ) : null}
          </span>
        </button>

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
      </div>

      {children}
    </div>
  );
}
