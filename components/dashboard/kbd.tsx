"use client";

import type { ReactNode } from "react";

import { useIsMac } from "@/hooks/use-is-mac";
import { cn } from "@/lib/utils";

/**
 * A keycap. The data-slot is a hook for the vendored tooltip CSS, which
 * tightens its own padding when it contains one of these.
 */
export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-md border px-1 font-sans text-[10px] font-medium tracking-wide whitespace-nowrap",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** macOS orders modifiers ⇧⌘ and drops separators; Windows prints Ctrl + Shift. */
function macRank(key: string): number {
  switch (key) {
    case "alt":
      return 1;
    case "shift":
      return 2;
    case "mod":
      return 3;
    default:
      return 9;
  }
}

function resolveToken(key: string, isMac: boolean): string {
  switch (key) {
    case "mod":
      return isMac ? "⌘" : "Ctrl";
    case "shift":
      return isMac ? "⇧" : "Shift";
    case "alt":
      return isMac ? "⌥" : "Alt";
    default:
      return key.toUpperCase();
  }
}

/** Renders shortcut tokens as a keycap, e.g. ["mod","shift","Z"] → ⌘⇧Z / Ctrl + Shift + Z. */
export function ShortcutKeys({
  keys,
  className,
}: {
  keys: string[];
  className?: string;
}) {
  const isMac = useIsMac();
  const ordered = isMac ? keys.toSorted((a, b) => macRank(a) - macRank(b)) : keys;
  const resolved = ordered.map((key) => resolveToken(key, isMac));
  return <Kbd className={className}>{resolved.join(isMac ? "" : " + ")}</Kbd>;
}
