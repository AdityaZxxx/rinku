"use client";

import { useEffect } from "react";
import type { ComponentProps, ReactNode } from "react";
import { ArchiveIcon, XIcon } from "@phosphor-icons/react";

import { setDockSuppressed } from "@/components/profile/mobile-dock";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * The bulk-action bar for the links editor's selection mode, styled after the
 * mobile dock so the two read as one component family. It stays mounted and
 * toggles visibility classes: entering the mode, it rises into the slot the
 * nav dock is vacating (delayed 100ms so the two never stack), and leaving,
 * it exits the way it entered. Mounting-unmounting would make the exit snap.
 */
export function SelectionDock({
  active,
  count,
  onCancel,
  onArchive,
}: {
  active: boolean;
  count: number;
  onCancel: () => void;
  onArchive: () => void;
}) {
  useEffect(() => {
    if (!active) {
      return;
    }
    setDockSuppressed(true);
    return () => {
      setDockSuppressed(false);
    };
  }, [active]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-40 flex justify-center px-4 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none!",
        active
          ? "visible translate-y-0 opacity-100 delay-100"
          : "pointer-events-none invisible translate-y-3 opacity-0",
      )}
    >
      <div className="border-input bg-background/80 flex max-w-full items-center gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-sm">
        {/* Both sides are visible blocks of the same width: a filled Archive
            next to a transparent button makes the separator read off-center,
            because the block's edge sits 4px from it while the ghost's ink
            floats a padding away. Muted vs primary keeps the hierarchy. */}
        <DockButton
          variant="secondary"
          onClick={onCancel}
          icon={<XIcon />}
          label={`${count} selected`}
          aria-label={`Exit selection mode, ${count} selected`}
        />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <DockButton
          variant="default"
          onClick={onArchive}
          disabled={count === 0}
          icon={<ArchiveIcon />}
          label="Archive"
        />
      </div>
    </div>
  );
}

/** Icon-over-label, the mobile dock's trigger anatomy. */
function DockButton({
  icon,
  label,
  ...props
}: ComponentProps<typeof Button> & {
  icon: ReactNode;
  label: string;
}) {
  return (
    <Button variant="ghost" className="min-w-20 rounded-full" {...props}>
      <span className="flex flex-col items-center gap-0.5 px-1">
        {icon}
        {/* Tabular digits so the count's width is stable as it grows. */}
        <span className="text-xs leading-none tabular-nums">{label}</span>
      </span>
    </Button>
  );
}
