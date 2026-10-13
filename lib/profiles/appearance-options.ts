export const wallpaperKindIds = [
  "fill",
  "gradient",
  "blur",
  "pattern",
  "image",
  "video",
] as const;

export type WallpaperKind = (typeof wallpaperKindIds)[number];

export const wallpaperKinds: Array<{ id: WallpaperKind; label: string }> = [
  { id: "fill", label: "Fill" },
  { id: "gradient", label: "Gradient" },
  { id: "blur", label: "Blur" },
  { id: "pattern", label: "Pattern" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
];

export const wallpaperPatternIds = ["dots", "grid", "lines", "waves"] as const;

export type WallpaperPattern = (typeof wallpaperPatternIds)[number];

export const wallpaperPatterns: Array<{ id: WallpaperPattern; label: string }> = [
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "lines", label: "Lines" },
  { id: "waves", label: "Waves" },
];

// The two wallpaper media slots an upload or removal can aim at.
export const wallpaperMediaTargetIds = ["wallpaper-image", "wallpaper-video"] as const;

export type WallpaperMediaTarget = (typeof wallpaperMediaTargetIds)[number];

// Pattern tuning: tile spacing and stroke weight, each on a 1-4 scale. The
// defaults reproduce the hardcoded SVG dimensions these knobs replace, so
// existing pattern pages render exactly as they did before the sliders.
export const patternSpacingRange = { min: 1, max: 4 } as const;
export const patternSpacingDefault = 2;
export const patternThicknessRange = { min: 1, max: 4 } as const;
export const patternThicknessDefault = 2;

/** How the link list arrives on the page. */
export const linkEntranceIds = ["none", "fade", "rise", "pop", "slide"] as const;

export type LinkEntrance = (typeof linkEntranceIds)[number];

export const linkEntrances: Array<{ id: LinkEntrance; label: string }> = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "rise", label: "Rise" },
  { id: "pop", label: "Pop" },
  { id: "slide", label: "Slide" },
];

/**
 * One motion per entrance. Fade reads slowest (opacity only carries no
 * distance), pop is the playful one and earns the overshoot curve, rise and
 * slide share the standard reveal. These are landing-page first-impressions,
 * the one tier allowed past the 300ms UI bar.
 */
export const entranceMotion = {
  fade: { duration: "450ms", easing: "var(--ease-out)" },
  rise: { duration: "380ms", easing: "var(--ease-out)" },
  pop: { duration: "320ms", easing: "var(--ease-pop)" },
  slide: { duration: "380ms", easing: "var(--ease-out)" },
} as const;

/** What a link does when a visitor points at it. */
export const linkHoverIds = ["none", "lift", "scale", "glow"] as const;

export type LinkHover = (typeof linkHoverIds)[number];

export const linkHovers: Array<{ id: LinkHover; label: string }> = [
  { id: "none", label: "None" },
  { id: "lift", label: "Lift" },
  { id: "scale", label: "Scale" },
  { id: "glow", label: "Glow" },
];

/** Which way the page's content reads. */
export const pageAlignmentIds = ["center", "left"] as const;

export type PageAlignment = (typeof pageAlignmentIds)[number];

export const pageAlignments: Array<{ id: PageAlignment; label: string }> = [
  { id: "center", label: "Center" },
  { id: "left", label: "Left" },
];
