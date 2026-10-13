"use client";

import type { CSSProperties } from "react";
import { ImageIcon, VideoCameraIcon } from "@phosphor-icons/react";

import { OptionTile, TilePreview } from "@/components/appearance/appearance-tiles";
import { patternBackground } from "@/components/appearance/wallpaper-layer";
import { type Appearance } from "@/lib/profiles/appearance";
import {
  buttonBodyStyle,
  buttonContourClass,
  type ButtonContour,
  type ButtonUmbra,
  type ButtonVariant,
} from "@/lib/profiles/appearance-buttons";
import { hexWithAlpha } from "@/lib/profiles/appearance-colors";
import {
  type LinkEntrance,
  type LinkHover,
  type PageAlignment,
  type WallpaperPattern,
} from "@/lib/profiles/appearance-options";
import { cn } from "@/lib/utils";

export function WallpaperKindTile({
  kind,
  label,
  checked,
  color,
  colorB,
  pattern,
  spacing,
  thickness,
  onSelect,
  onScrub,
  onScrubEnd,
}: {
  kind: "fill" | "gradient" | "blur" | "pattern" | "image" | "video";
  label: string;
  checked: boolean;
  color: string;
  colorB: string;
  pattern?: WallpaperPattern;
  spacing?: number;
  thickness?: number;
  onSelect: () => void;
  onScrub?: () => void;
  onScrubEnd?: () => void;
}) {
  if (kind === "image" || kind === "video") {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={checked}
        className={cn(
          "relative flex cursor-pointer flex-col items-stretch gap-2 rounded-xl border bg-transparent p-2 pb-6 text-left text-sm transition",
          checked ? "border-ring ring-ring/30 ring-3" : "border-input hover:bg-accent/40",
        )}
      >
        <KindPreview kind={kind} color={color} colorB={colorB} />
        <span className="text-muted-foreground absolute inset-x-0 bottom-0.5 text-center text-xs capitalize">
          {label}
        </span>
      </button>
    );
  }
  return (
    <OptionTile
      name="wallpaper-kind"
      value={kind}
      label={label}
      checked={checked}
      onSelect={onSelect}
      onScrub={onScrub}
      onScrubEnd={onScrubEnd}
    >
      <KindPreview
        kind={kind}
        color={color}
        colorB={colorB}
        pattern={pattern}
        spacing={spacing}
        thickness={thickness}
      />
    </OptionTile>
  );
}

/** One miniature button rendered with the page's real recipe and palette. */
export function VariantPreview({
  variant,
  look,
}: {
  variant: ButtonVariant;
  look: Appearance;
}) {
  return (
    <TilePreview background={look.wallpaperColor}>
      <span
        className={cn("h-6 w-4/5 border", buttonContourClass(look.buttonContour))}
        style={buttonBodyStyle({
          color: look.buttonColor,
          textColor: look.buttonTextColor,
          variant,
          umbra: "none",
          edge: look.buttonUmbraColor,
        })}
      />
    </TilePreview>
  );
}

/** The real shadow at miniature scale, on the same button the page shows. */
export function UmbraPreview({ umbra, look }: { umbra: ButtonUmbra; look: Appearance }) {
  return (
    <TilePreview background={look.wallpaperColor}>
      <span
        className={cn("h-7 w-4/5 border", buttonContourClass(look.buttonContour))}
        style={buttonBodyStyle({
          color: look.buttonColor,
          textColor: look.buttonTextColor,
          variant: look.buttonVariant,
          umbra,
          edge: look.buttonUmbraColor,
        })}
      />
    </TilePreview>
  );
}

/**
 * Preview-scale radii. The real corner classes clamp shut at this size (a 28px
 * bar turns rounded-2xl into a full capsule), so each contour instead gets
 * the same share of the preview's height that the public page shows on a real
 * button: 0, roughly a sixth, a third, and fully round.
 */
const contourPreviewRadius: Record<ButtonContour, string> = {
  sharp: "0px",
  soft: "5px",
  round: "9px",
  pill: "9999px",
};

export function ContourPreview({
  contour,
  look,
}: {
  contour: ButtonContour;
  look: Appearance;
}) {
  return (
    <TilePreview background={look.wallpaperColor}>
      <span
        className="h-7 w-full border"
        style={{
          ...buttonBodyStyle({
            color: look.buttonColor,
            textColor: look.buttonTextColor,
            variant: look.buttonVariant,
            umbra: "none",
            edge: look.buttonUmbraColor,
          }),
          borderRadius: contourPreviewRadius[contour],
        }}
      />
    </TilePreview>
  );
}

export function KindPreview({
  kind,
  color,
  colorB,
  pattern = "dots",
  spacing,
  thickness,
}: {
  kind: string;
  color: string;
  colorB: string;
  pattern?: WallpaperPattern;
  spacing?: number;
  thickness?: number;
}) {
  if (kind === "gradient") {
    return (
      <TilePreview>
        <span
          className="h-9 w-full rounded-md border"
          style={{ background: `linear-gradient(180deg, ${color}, ${colorB})` }}
        />
      </TilePreview>
    );
  }
  if (kind === "blur") {
    return (
      <TilePreview>
        <span
          className="relative h-9 w-full overflow-hidden rounded-md border"
          style={{ backgroundColor: color }}
        >
          <span
            className="absolute -top-3 -left-3 size-10 rounded-full blur-md"
            style={{ backgroundColor: colorB, opacity: 0.8 }}
          />
          <span
            className="absolute -right-3 -bottom-3 size-10 rounded-full blur-md"
            style={{ backgroundColor: colorB, opacity: 0.5 }}
          />
        </span>
      </TilePreview>
    );
  }
  if (kind === "pattern") {
    return (
      <TilePreview>
        <span
          className="h-9 w-full rounded-md border"
          style={{
            background: patternBackground(pattern, color, colorB, spacing, thickness),
          }}
        />
      </TilePreview>
    );
  }
  if (kind === "image") {
    return (
      <TilePreview>
        <span className="flex h-9 w-full items-center justify-center rounded-md border">
          <ImageIcon className="text-muted-foreground size-5" />
        </span>
      </TilePreview>
    );
  }
  if (kind === "video") {
    return (
      <TilePreview>
        <span className="flex h-9 w-full items-center justify-center rounded-md border">
          <VideoCameraIcon className="text-muted-foreground size-5" />
        </span>
      </TilePreview>
    );
  }
  return (
    <TilePreview>
      <span className="h-9 w-full rounded-md border" style={{ backgroundColor: color }} />
    </TilePreview>
  );
}

/**
 * The six header recipes in the page's own palette. Media blocks fade into
 * the wallpaper the way the real header does, so each tile reads as its
 * composition, not just its label: hero is a tall full-bleed block, banner a
 * short one with the avatar overlapping its edge, cutout an inset square,
 * classic a small circle, minimal text only, statement one big line.
 */
export function HeaderPreview({ value, look }: { value: string; look: Appearance }) {
  const title = look.titleColor;
  const body = hexWithAlpha(look.bodyColor, "8c");
  const media = hexWithAlpha(look.titleColor, "40");
  const fade = `linear-gradient(to bottom, ${hexWithAlpha(look.titleColor, "38")}, ${look.wallpaperColor})`;

  if (value === "statement") {
    return (
      <TilePreview background={look.wallpaperColor}>
        <span className="flex h-9 w-full flex-col items-center justify-center gap-1">
          <span
            className="h-2.5 w-full rounded-full"
            style={{ backgroundColor: title }}
          />
          <span className="h-1 w-2/3 rounded-full" style={{ backgroundColor: body }} />
          <span className="h-1 w-2/5 rounded-full" style={{ backgroundColor: body }} />
        </span>
      </TilePreview>
    );
  }
  if (value === "banner") {
    return (
      <TilePreview background={look.wallpaperColor}>
        <span className="flex h-9 w-full flex-col items-center">
          <span
            className="-mx-2 h-3.5 w-[calc(100%+1rem)]"
            style={{ background: fade }}
          />
          <span
            className="-mt-2 size-3.5 rounded-full border-2"
            style={{ backgroundColor: media, borderColor: look.wallpaperColor }}
          />
          <span
            className="mt-0.5 h-1.5 w-1/2 rounded-full"
            style={{ backgroundColor: title }}
          />
        </span>
      </TilePreview>
    );
  }
  if (value === "minimal") {
    return (
      <TilePreview background={look.wallpaperColor}>
        <span className="flex h-9 w-full flex-col items-center justify-center gap-1">
          <span className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: title }} />
          <span className="h-1 w-1/3 rounded-full" style={{ backgroundColor: body }} />
        </span>
      </TilePreview>
    );
  }
  if (value === "cutout") {
    return (
      <TilePreview background={look.wallpaperColor}>
        <span className="flex h-9 w-full flex-col items-center gap-1">
          <span className="h-4 w-3/5 rounded-lg" style={{ backgroundColor: media }} />
          <span className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: title }} />
          <span className="h-1 w-2/5 rounded-full" style={{ backgroundColor: body }} />
        </span>
      </TilePreview>
    );
  }
  if (value === "hero") {
    return (
      <TilePreview background={look.wallpaperColor}>
        <span className="flex h-9 w-full flex-col items-center">
          <span className="-mx-2 h-6 w-[calc(100%+1rem)]" style={{ background: fade }} />
          <span
            className="-mt-1 h-1.5 w-1/2 rounded-full"
            style={{ backgroundColor: title }}
          />
          <span className="h-1 w-1/3 rounded-full" style={{ backgroundColor: body }} />
        </span>
      </TilePreview>
    );
  }
  return (
    <TilePreview background={look.wallpaperColor}>
      <span className="flex h-9 w-full flex-col items-center gap-1">
        <span className="size-5 rounded-full" style={{ backgroundColor: media }} />
        <span className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: title }} />
        <span className="h-1 w-2/5 rounded-full" style={{ backgroundColor: body }} />
      </span>
    </TilePreview>
  );
}

export function AlignmentPreview({
  alignment,
  look,
}: {
  alignment: PageAlignment;
  look: Appearance;
}) {
  return (
    <TilePreview background={look.wallpaperColor}>
      <span
        className={cn(
          "flex w-full flex-col gap-1",
          alignment === "left" ? "items-start" : "items-center",
        )}
      >
        <span
          className="h-1.5 w-3/5 rounded-full"
          style={{ backgroundColor: look.titleColor }}
        />
        <span
          className="h-1 w-1/2 rounded-full"
          style={{ backgroundColor: hexWithAlpha(look.bodyColor, "8c") }}
        />
        <span
          className="h-1 w-1/3 rounded-full"
          style={{ backgroundColor: hexWithAlpha(look.bodyColor, "8c") }}
        />
      </span>
    </TilePreview>
  );
}

/**
 * Mid-flight snapshots for the entrance previews: a three-row list where the
 * top row has landed and the rest are still arriving, so both the trajectory
 * and the stagger read at a glance.
 */
const entranceSnapshots: Record<LinkEntrance, Array<{ key: string; cls: string }>> = {
  none: [
    { key: "landed", cls: "" },
    { key: "arriving", cls: "" },
    { key: "starting", cls: "" },
  ],
  fade: [
    { key: "landed", cls: "" },
    { key: "arriving", cls: "opacity-55" },
    { key: "starting", cls: "opacity-25" },
  ],
  rise: [
    { key: "landed", cls: "" },
    { key: "arriving", cls: "translate-y-1" },
    { key: "starting", cls: "translate-y-2" },
  ],
  pop: [
    { key: "landed", cls: "" },
    { key: "arriving", cls: "scale-90" },
    { key: "starting", cls: "scale-75" },
  ],
  slide: [
    { key: "landed", cls: "" },
    { key: "arriving", cls: "-translate-x-1.5" },
    { key: "starting", cls: "-translate-x-3" },
  ],
};

/**
 * Each entrance previewed by its snapshot. Pointing at a tile replays the real
 * entrance on pointer devices; the replay rules live in globals.css beside
 * the keyframes they borrow, and the rows carry .rinku-entrance so reduced
 * motion stays gentle here too.
 */
export function EntrancePreview({ id, look }: { id: LinkEntrance; look: Appearance }) {
  return (
    <TilePreview background={look.wallpaperColor}>
      <span
        className={cn(
          "flex w-full flex-col items-center gap-1",
          id !== "none" && `rinku-entrance-replay-${id}`,
        )}
      >
        {entranceSnapshots[id].map((row, index) => (
          <span
            key={row.key}
            className={cn(
              "rinku-entrance rinku-preview-row h-1.5 w-4/5 rounded-full",
              row.cls,
            )}
            style={
              // SAFETY: React's CSSProperties rejects custom-property keys; this
              // only feeds the stagger delay the replay rules in globals.css read.
              {
                backgroundColor: look.buttonColor,
                "--preview-row": index,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </TilePreview>
  );
}

/**
 * Each hover effect held in its end state, exaggerated enough to read on
 * touch screens; pointing at a tile deepens the effect live on pointer
 * devices, with the same transition the public page uses.
 */
export function HoverPreview({ id, look }: { id: LinkHover; look: Appearance }) {
  return (
    <TilePreview background={look.wallpaperColor}>
      <span
        className={cn(
          "h-2 w-4/5 rounded-full transition-[transform,box-shadow] ease-[ease] duration-150",
          id === "lift" &&
            "-translate-y-1 shadow-md pointer-fine:group-hover:-translate-y-1.5 pointer-fine:group-hover:shadow-lg",
          id === "scale" && "scale-110 pointer-fine:group-hover:scale-[1.15]",
          id === "glow" &&
            "shadow-[0_0_14px_-2px_var(--preview-glow)] pointer-fine:group-hover:shadow-[0_0_22px_2px_var(--preview-glow)]",
        )}
        style={
          // SAFETY: custom-property key, same cast reason as EntrancePreview.
          {
            backgroundColor: look.buttonColor,
            "--preview-glow": look.buttonColor,
          } as CSSProperties
        }
      />
    </TilePreview>
  );
}
