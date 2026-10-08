"use client";

import { useState, useTransition } from "react";
import type { EditorArea, SaveMode } from "@/lib/profiles/schema";
import { toast } from "sonner";

import { updateSaveMode } from "@/app/actions/profiles";
import { cn } from "@/lib/utils";

const areas: Array<{
  id: EditorArea;
  label: string;
  description: string;
  comingSoon?: boolean;
}> = [
  {
    id: "links",
    label: "Links",
    description: "Buttons and headings on your page.",
    comingSoon: true,
  },
  {
    id: "profile",
    label: "Profile",
    description: "Your name, bio, and header style.",
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme, background, buttons, and font.",
  },
];

const modes: Array<{ id: SaveMode; label: string; hint: string }> = [
  { id: "auto", label: "Auto", hint: "Saves and publishes as you change it." },
  { id: "manual", label: "Manual", hint: "Publish with a button, plus undo and redo." },
];

export function SaveModeSection({
  profileId,
  initial,
}: {
  profileId: string;
  initial: Record<EditorArea, SaveMode>;
}) {
  const [modesByArea, setModesByArea] = useState(initial);
  const [pendingArea, setPendingArea] = useState<EditorArea | null>(null);
  const [, startTransition] = useTransition();

  function choose(area: EditorArea, next: SaveMode) {
    if (next === modesByArea[area] || pendingArea) {
      return;
    }
    const previous = modesByArea[area];
    setModesByArea((current) => ({ ...current, [area]: next }));
    setPendingArea(area);
    startTransition(async () => {
      const result = await updateSaveMode({ profileId, area, saveMode: next });
      setPendingArea(null);
      if ("error" in result) {
        setModesByArea((current) => ({ ...current, [area]: previous }));
        toast.error(result.error);
        return;
      }
      toast("Editing mode updated");
    });
  }

  return (
    <section className="rounded-2xl border p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Editing</h2>
          <p className="text-muted-foreground text-xs">
            How each part of your page saves. Manual keeps changes as a draft until you
            publish.
          </p>
        </div>

        <div className="flex flex-col divide-y">
          {areas.map((area) => {
            const value = modesByArea[area.id];
            return (
              <div
                key={area.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="truncate" title={area.description}>
                    {area.label}
                  </span>
                  {area.comingSoon ? (
                    <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                      Soon
                    </span>
                  ) : null}
                </span>

                <div
                  role="radiogroup"
                  aria-label={`${area.label} save mode`}
                  className={cn(
                    "bg-muted flex shrink-0 rounded-lg p-0.5",
                    area.comingSoon && "opacity-50",
                  )}
                >
                  {modes.map((mode) => {
                    const checked = value === mode.id;
                    return (
                      <label
                        key={mode.id}
                        title={area.comingSoon ? "Available soon" : mode.hint}
                        className={cn(
                          "relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 motion-reduce:transition-none has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
                          checked
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground cursor-pointer",
                          area.comingSoon &&
                            "cursor-not-allowed hover:text-muted-foreground",
                        )}
                      >
                        <input
                          type="radio"
                          name={`save-mode-${area.id}`}
                          value={mode.id}
                          checked={checked}
                          disabled={area.comingSoon}
                          onChange={() => choose(area.id, mode.id)}
                          className="sr-only"
                        />
                        {mode.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
