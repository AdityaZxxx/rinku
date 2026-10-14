"use client";

import { useEffect, useState } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type SettingsTocItem = {
  id: string;
  label: string;
  destructive?: boolean;
};

/**
 * Open signal for the contents sheet: the dock's trigger lives in the layout
 * while the sheet itself is mounted by the two settings pages, mirroring the
 * preview sheet's dock-to-page handoff.
 */
const tocOpenListeners = new Set<() => void>();

export function openSettingsToc() {
  for (const listener of tocOpenListeners) {
    listener();
  }
}

/** Desktop rail: the page's sections as quiet links hanging off one rule. */
export function SettingsToc({ items }: { items: SettingsTocItem[] }) {
  return (
    <nav aria-label="On this page" className="flex flex-col border-l py-1">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "text-muted-foreground hover:text-foreground hover:border-current -ml-px border-l border-transparent py-1.5 pl-4 text-sm transition-[color,border-color] duration-150",
            item.destructive && "text-destructive hover:text-destructive/80",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

/** Mobile: the same list in a bottom sheet raised by the dock's Contents button. */
export function SettingsTocSheet({ items }: { items: SettingsTocItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const listener = () => setOpen(true);
    tocOpenListeners.add(listener);
    return () => {
      tocOpenListeners.delete(listener);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl px-4 pt-3 pb-5">
        <SheetTitle className="sr-only">Page contents</SheetTitle>
        <nav aria-label="On this page" className="flex flex-col">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setOpen(false)}
              className={cn(
                "hover:bg-muted flex min-h-11 items-center rounded-xl px-3 text-sm transition-colors duration-150",
                item.destructive && "text-destructive",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
