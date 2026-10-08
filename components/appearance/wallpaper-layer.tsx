import { hexWithAlpha, type WallpaperPattern } from "@/lib/profiles/appearance";
import { wallpaperUrl } from "@/lib/supabase/storage";

export function patternBackground(
  pattern: WallpaperPattern,
  base: string,
  ink: string,
): string {
  const line = hexWithAlpha(ink, "26");
  const soft = hexWithAlpha(ink, "14");
  switch (pattern) {
    case "grid":
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><path d='M36 0H0v36' fill='none' stroke='${line}' stroke-width='1.5'/></svg>`,
      )}"), ${base}`;
    case "lines":
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M-6 6L6 -6M0 24L24 0M18 30L30 18' stroke='${line}' stroke-width='2'/></svg>`,
      )}"), ${base}`;
    case "waves":
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='24'><path d='M0 12Q18 2 36 12T72 12' fill='none' stroke='${soft}' stroke-width='2'/></svg>`,
      )}"), ${base}`;
    default:
      return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><circle cx='3' cy='3' r='2.4' fill='${line}'/></svg>`,
      )}"), ${base}`;
  }
}

export function WallpaperLayer({
  kind,
  color,
  colorB,
  pattern,
  imagePath,
  videoPath,
  titleColor,
}: {
  kind: string;
  color: string;
  colorB: string;
  pattern: WallpaperPattern;
  imagePath: string | null;
  videoPath: string | null;
  titleColor: string;
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
        <div
          className="absolute -top-24 -left-24 size-80 rounded-full blur-3xl"
          style={{ backgroundColor: colorB, opacity: 0.85 }}
        />
        <div
          className="absolute -right-24 -bottom-24 size-80 rounded-full blur-3xl"
          style={{ backgroundColor: titleColor, opacity: 0.28 }}
        />
      </div>
    );
  }
  if (kind === "pattern") {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-full max-w-md -translate-x-1/2"
        style={{ background: patternBackground(pattern, color, colorB) }}
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
