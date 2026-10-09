"use client";

import { useEffect, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { EyesIcon, MagnifyingGlassIcon, ShareIcon } from "@phosphor-icons/react";

import { openCommandPalette } from "@/components/dashboard/command-palette";
import { ShareSheetContent, usernameParam } from "@/components/dashboard/share-page-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/**
 * The editor pages that mount a preview sheet; the dock's Preview trigger
 * follows this list so it never shows where no preview exists.
 */
const PREVIEW_SECTIONS = ["profile", "links", "appearance"] as const;

/**
 * Open signal for the preview sheet: the dock's trigger lives in the layout
 * while the sheet itself is mounted by the editor pages that have a preview.
 */
const previewOpenListeners = new Set<() => void>();

function openMobilePreview() {
  for (const listener of previewOpenListeners) {
    listener();
  }
}

function DockTrigger({
  icon,
  label,
  ...props
}: ComponentProps<typeof Button> & {
  icon: ReactNode;
  label: string;
}) {
  return (
    <Button variant="ghost" className="rounded-full" {...props}>
      <span className="flex flex-col items-center gap-0.5 px-1">
        {icon}
        <span className="text-[10px] leading-none">{label}</span>
      </span>
    </Button>
  );
}

/**
 * The mobile action bar, app-wide below lg: Preview on editor pages, Share
 * as a bottom sheet, and Search through the command palette. The header's
 * matching triggers hide below lg, so each action has exactly one home per
 * viewport.
 */
export function MobileDock() {
  const pathname = usePathname();
  const params = useParams();
  const [shareOpen, setShareOpen] = useState(false);
  const username = usernameParam.safeParse(params.username);
  const section = pathname.split("/")[2];
  const hasPreview =
    username.success && PREVIEW_SECTIONS.some((name) => name === section);

  return (
    <>
      <div aria-hidden="true" className="h-16 lg:hidden" />
      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center lg:hidden">
        <div className="border-input bg-background/80 flex items-center gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-sm">
          {hasPreview ? (
            <DockTrigger
              icon={<EyesIcon />}
              label="Preview"
              onClick={openMobilePreview}
            />
          ) : null}
          {username.success ? (
            <Sheet open={shareOpen} onOpenChange={setShareOpen}>
              <SheetTrigger render={<DockTrigger icon={<ShareIcon />} label="Share" />} />
              <ShareSheetContent
                username={username.data}
                onClose={() => setShareOpen(false)}
              />
            </Sheet>
          ) : null}
          <DockTrigger
            icon={<MagnifyingGlassIcon />}
            label="Search"
            onClick={openCommandPalette}
          />
        </div>
      </div>
    </>
  );
}

export function MobilePreviewSheet({
  username,
  preview,
}: {
  username: string;
  preview: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const listener = () => setOpen(true);
    previewOpenListeners.add(listener);
    return () => {
      previewOpenListeners.delete(listener);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="border-none bg-transparent p-0 data-[side=bottom]:h-dvh sm:p-0"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[10dvh] items-center justify-between px-4">
            <SheetClose render={<Button variant="secondary" size="sm" />}>
              Close
            </SheetClose>
            <Button
              variant="secondary"
              size="sm"
              nativeButton={false}
              render={<Link href={`/${username}`} target="_blank" />}
            >
              Visit live page
            </Button>
          </div>
          <div className="bg-background flex-1 overflow-hidden rounded-t-3xl">
            <div className="mx-auto flex h-full w-full max-w-105 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">{preview}</div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
