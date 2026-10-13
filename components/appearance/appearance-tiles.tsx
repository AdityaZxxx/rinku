"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function OptionTile({
  name,
  value,
  checked,
  onSelect,
  label,
  children,
  onScrub,
  onScrubEnd,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  children: ReactNode;
  onScrub?: () => void;
  onScrubEnd?: () => void;
}) {
  return (
    <label
      onPointerEnter={onScrub}
      onPointerLeave={onScrubEnd}
      className={cn(
        "group relative flex cursor-pointer flex-col items-stretch gap-2 rounded-xl border p-2 pb-6 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
        checked ? "border-ring ring-ring/30 ring-3" : "border-input",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {children}
      <span className="text-muted-foreground absolute inset-x-0 bottom-0.5 text-center text-xs capitalize">
        {label}
      </span>
    </label>
  );
}

/** The shared miniature-tile frame every appearance mock renders inside. */
export function TileMock({
  children,
  background,
}: {
  children: ReactNode;
  background?: string;
}) {
  return (
    <span
      className="flex h-14 w-full items-center justify-center rounded-md border p-2"
      style={background ? { backgroundColor: background } : undefined}
    >
      {children}
    </span>
  );
}
