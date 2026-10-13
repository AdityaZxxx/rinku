import { hexWithAlpha } from "@/lib/profiles/appearance-colors";
import {
  patternSpacingDefault,
  patternThicknessDefault,
  type WallpaperPattern,
} from "@/lib/profiles/appearance-options";
import { wallpaperUrl } from "@/lib/supabase/storage";

export function patternBackground(
  pattern: WallpaperPattern,
  base: string,
  ink: string,
  spacing: number = patternSpacingDefault,
  thickness: number = patternThicknessDefault,
): string {
  // Tile dimensions scale with spacing; stroke widths with thickness, so the
  // two knobs stay independent.
  const scale = spacing / patternSpacingDefault;
  const line = hexWithAlpha(ink, "26");
  const soft = hexWithAlpha(ink, "14");
  switch (pattern) {
    case "grid":
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${36 * scale}' height='${36 * scale}'><path d='M${36 * scale} 0H0v${36 * scale}' fill='none' stroke='${line}' stroke-width='${thickness * 0.75}'/></svg>`,
      )}"), ${base}`;
    case "lines":
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${24 * scale}' height='${24 * scale}'><path d='M${-6 * scale} ${6 * scale}L${6 * scale} ${-6 * scale}M0 ${24 * scale}L${24 * scale} 0M${18 * scale} ${30 * scale}L${30 * scale} ${18 * scale}' stroke='${line}' stroke-width='${thickness}'/></svg>`,
      )}"), ${base}`;
    case "waves":
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${72 * scale}' height='${24 * scale}'><path d='M0 ${12 * scale}Q${18 * scale} ${2 * scale} ${36 * scale} ${12 * scale}T${72 * scale} ${12 * scale}' fill='none' stroke='${soft}' stroke-width='${thickness}'/></svg>`,
      )}"), ${base}`;
    default:
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${26 * scale}' height='${26 * scale}'><circle cx='${3 * scale}' cy='${3 * scale}' r='${thickness * 1.2}' fill='${line}'/></svg>`,
      )}"), ${base}`;
  }
}

export function WallpaperLayer({
  kind,
  color,
  colorB,
  pattern,
  patternSpacing,
  patternThickness,
  imagePath,
  videoPath,
}: {
  kind: string;
  color: string;
  colorB: string;
  pattern: WallpaperPattern;
  patternSpacing: number;
  patternThickness: number;
  imagePath: string | null;
  videoPath: string | null;
}) {
  if (kind === "video" && videoPath) {
    return (
      <div
        className="absolute inset-y-0 left-1/2 w-full max-w-md -translate-x-1/2 overflow-hidden"
        style={{ backgroundColor: color }}
      >
        <video
          key={videoPath}
          src={wallpaperUrl(videoPath)}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }
  if (kind === "image" && imagePath) {
    return (
      <div
        className="absolute inset-y-0 left-1/2 w-full max-w-md -translate-x-1/2 overflow-hidden"
        style={{ backgroundColor: color }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wallpaperUrl(imagePath)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }
  if (kind === "gradient") {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-full max-w-md -translate-x-1/2"
        style={{ background: `linear-gradient(180deg, ${color} 0%, ${colorB} 100%)` }}
      />
    );
  }
  if (kind === "blur") {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-full max-w-md -translate-x-1/2"
        style={{ backgroundColor: color }}
      >
        {/* Both blooms come from the accent the editor exposes, so no other
            color field can silently retint the background. */}
        <div
          className="absolute -top-24 -left-24 size-80 rounded-full blur-3xl"
          style={{ backgroundColor: colorB, opacity: 0.85 }}
        />
        <div
          className="absolute -right-24 -bottom-24 size-80 rounded-full blur-3xl"
          style={{ backgroundColor: colorB, opacity: 0.4 }}
        />
      </div>
    );
  }
  if (kind === "pattern") {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-full max-w-md -translate-x-1/2"
        style={{
          background: patternBackground(
            pattern,
            color,
            colorB,
            patternSpacing,
            patternThickness,
          ),
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{ backgroundColor: color }}
    />
  );
}
