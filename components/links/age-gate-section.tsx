"use client";

import { useState } from "react";
import { LockSimpleIcon } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AGE_PRESETS = [13, 16, 18, 21] as const;
const DEFAULT_AGE = 18;

export function AgeGateSection({
  minAge,
  onSave,
}: {
  minAge: number | null;
  onSave: (minAge: number | null) => void;
}) {
  const gated = minAge !== null;
  const [custom, setCustom] = useState("");

  function commitCustom() {
    const parsed = Number.parseInt(custom, 10);
    if (Number.isInteger(parsed) && parsed >= 13 && parsed <= 99) {
      onSave(parsed);
    }
    setCustom("");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onSave(gated ? null : DEFAULT_AGE)}
        className="group/agegate flex w-full items-center gap-3 text-left"
        aria-pressed={gated}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm leading-none font-medium">Age restriction</span>
          <span className="text-muted-foreground group-hover/agegate:text-foreground truncate text-xs transition-colors">
            {gated
              ? `Visitors confirm they are ${minAge}+ before opening`
              : "Ask visitors to confirm their age before opening"}
          </span>
        </div>
        <LockSimpleIcon
          className={cn(
            "size-4.5 shrink-0 transition-colors",
            gated
              ? "text-foreground"
              : "text-muted-foreground group-hover/agegate:text-foreground",
          )}
          weight={gated ? "fill" : "regular"}
          aria-hidden
        />
      </button>

      {gated ? (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          {AGE_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSave(value)}
              aria-pressed={minAge === value}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs transition-colors",
                minAge === value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {value}+
            </button>
          ))}
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value.replace(/\D/g, ""))}
            onBlur={commitCustom}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitCustom();
                event.currentTarget.blur();
              }
            }}
            inputMode="numeric"
            placeholder="Custom"
            aria-label="Custom minimum age"
            className="h-7 w-20 rounded-full px-2.5 text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
