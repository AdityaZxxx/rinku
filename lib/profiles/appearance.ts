import type { CSSProperties } from "react";
import * as z from "zod";

import { headerStyleIds, type HeaderStyleId } from "@/lib/profiles/schema";

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #1a2b3c.");

export const presetThemeIds = [
  "air",
  "charcoal",
  "cream",
  "mint",
  "sky",
  "sunset",
  "ink",
  "paper",
  "candy",
  "forest",
  "ocean",
  "lavender",
  "coral",
  "midnight",
  "sand",
  "berry",
] as const;

export type PresetThemeId = (typeof presetThemeIds)[number];

export const themeIds = [...presetThemeIds, "custom"] as const;

export type ThemeId = (typeof themeIds)[number];

export const buttonContourIds = ["sharp", "soft", "round", "pill"] as const;

export type ButtonContour = (typeof buttonContourIds)[number];

export const buttonContours: Array<{ id: ButtonContour; label: string }> = [
  { id: "sharp", label: "Sharp" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Round" },
  { id: "pill", label: "Pill" },
];

export function buttonContourClass(contour: ButtonContour): string {
  switch (contour) {
    case "sharp":
      return "rounded-none";
    case "soft":
      return "rounded-lg";
    case "round":
      return "rounded-2xl";
    default:
      return "rounded-full";
  }
}

export function featuredContourClass(contour: ButtonContour): string {
  switch (contour) {
    case "sharp":
      return "rounded-none";
    case "soft":
      return "rounded-lg";
    default:
      return "rounded-2xl";
  }
}

export const buttonVariantIds = ["fill", "outline", "soft", "glass"] as const;

export type ButtonVariant = (typeof buttonVariantIds)[number];

export const buttonVariants: Array<{ id: ButtonVariant; label: string }> = [
  { id: "fill", label: "Fill" },
  { id: "outline", label: "Outline" },
  { id: "soft", label: "Soft" },
  { id: "glass", label: "Glass" },
];

export const buttonUmbraIds = ["none", "soft", "lift", "hard"] as const;

export type ButtonUmbra = (typeof buttonUmbraIds)[number];

export const buttonUmbrae: Array<{ id: ButtonUmbra; label: string }> = [
  { id: "none", label: "None" },
  { id: "soft", label: "Soft" },
  { id: "lift", label: "Lift" },
  { id: "hard", label: "Hard" },
];

export function buttonUmbraBoxShadow(
  umbra: ButtonUmbra,
  edge: string,
): string | undefined {
  switch (umbra) {
    case "soft":
      return "0 8px 24px rgb(0 0 0 / 0.12)";
    case "lift":
      return "0 2px 6px rgb(0 0 0 / 0.12), 0 16px 32px rgb(0 0 0 / 0.16)";
    case "hard":
      return `4px 4px 0 ${edge}`;
    default:
      return undefined;
  }
}

export interface ButtonTokens {
  color: string;
  textColor: string;
  variant: ButtonVariant;
  umbra: ButtonUmbra;
  edge: string;
}

export function buttonBodyStyle(tokens: ButtonTokens): CSSProperties {
  const boxShadow = buttonUmbraBoxShadow(tokens.umbra, tokens.edge);
  switch (tokens.variant) {
    case "outline":
      return {
        backgroundColor: "transparent",
        color: tokens.color,
        borderColor: tokens.color,
        boxShadow,
      };
    case "soft":
      return {
        backgroundColor: `color-mix(in oklch, ${tokens.color} 14%, transparent)`,
        color: tokens.color,
        borderColor: "transparent",
        boxShadow,
      };
    case "glass":
      return {
        backgroundColor: `color-mix(in oklch, ${tokens.color} 22%, transparent)`,
        color: tokens.textColor,
        borderColor: `color-mix(in oklch, ${tokens.textColor} 35%, transparent)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow,
      };
    default:
      return {
        backgroundColor: tokens.color,
        color: tokens.textColor,
        borderColor: tokens.color,
        boxShadow,
      };
  }
}

export const fontIds = [
  "inter",
  "noto-sans",
  "plus-jakarta-sans",
  "work-sans",
  "dm-sans",
  "karla",
  "nunito",
  "figtree",
  "merriweather",
  "playfair-display",
  "lora",
  "cormorant-garamond",
  "source-serif-4",
  "ibm-plex-mono",
  "space-grotesk",
  "fraunces",
] as const;

export type FontId = (typeof fontIds)[number];

export const fonts: Array<{ id: FontId; label: string; sample: string; family: string }> =
  [
    { id: "inter", label: "Inter", sample: "Modern sans", family: "Inter" },
    { id: "noto-sans", label: "Noto Sans", sample: "Neutral sans", family: "Noto Sans" },
    {
      id: "plus-jakarta-sans",
      label: "Plus Jakarta Sans",
      sample: "Friendly sans",
      family: "Plus Jakarta Sans",
    },
    { id: "work-sans", label: "Work Sans", sample: "UI sans", family: "Work Sans" },
    { id: "dm-sans", label: "DM Sans", sample: "Compact sans", family: "DM Sans" },
    { id: "karla", label: "Karla", sample: "Warm sans", family: "Karla" },
    { id: "nunito", label: "Nunito", sample: "Rounded sans", family: "Nunito" },
    { id: "figtree", label: "Figtree", sample: "Geometric sans", family: "Figtree" },
    {
      id: "merriweather",
      label: "Merriweather",
      sample: "Readable serif",
      family: "Merriweather",
    },
    {
      id: "playfair-display",
      label: "Playfair Display",
      sample: "Editorial serif",
      family: "Playfair Display",
    },
    { id: "lora", label: "Lora", sample: "Classic serif", family: "Lora" },
    {
      id: "cormorant-garamond",
      label: "Cormorant Garamond",
      sample: "High-contrast serif",
      family: "Cormorant Garamond",
    },
    {
      id: "source-serif-4",
      label: "Source Serif 4",
      sample: "Bookish serif",
      family: "Source Serif 4",
    },
    {
      id: "ibm-plex-mono",
      label: "IBM Plex Mono",
      sample: "Technical mono",
      family: "IBM Plex Mono",
    },
    {
      id: "space-grotesk",
      label: "Space Grotesk",
      sample: "Techy sans",
      family: "Space Grotesk",
    },
    { id: "fraunces", label: "Fraunces", sample: "Display serif", family: "Fraunces" },
  ];

export function toFontId(value: string | null | undefined): FontId {
  if (!value) {
    return "inter";
  }
  // SAFETY: fontIds and FontId derive from the same const tuple, so a
  // includes() hit means the value is a FontId member; z.enum-validated DB
  // writes keep this invariant at runtime.
  for (const id of fontIds) {
    if (value === id) {
      return id;
    }
  }
  return "inter";
}

export function fontStack(font: FontId): string {
  switch (font) {
    case "noto-sans":
      return '"Noto Sans", system-ui, sans-serif';
    case "plus-jakarta-sans":
      return '"Plus Jakarta Sans", system-ui, sans-serif';
    case "work-sans":
      return '"Work Sans", system-ui, sans-serif';
    case "dm-sans":
      return '"DM Sans", system-ui, sans-serif';
    case "karla":
      return '"Karla", system-ui, sans-serif';
    case "nunito":
      return '"Nunito", ui-rounded, system-ui, sans-serif';
    case "figtree":
      return '"Figtree", system-ui, sans-serif';
    case "merriweather":
      return '"Merriweather", Georgia, serif';
    case "playfair-display":
      return '"Playfair Display", Georgia, serif';
    case "lora":
      return '"Lora", Georgia, serif';
    case "cormorant-garamond":
      return '"Cormorant Garamond", Georgia, serif';
    case "source-serif-4":
      return '"Source Serif 4", Georgia, serif';
    case "ibm-plex-mono":
      return '"IBM Plex Mono", ui-monospace, monospace';
    case "space-grotesk":
      return '"Space Grotesk", system-ui, sans-serif';
    case "fraunces":
      return '"Fraunces", Georgia, serif';
    default:
      return "var(--font-inter), system-ui, sans-serif";
  }
}

/** Families injected by the Google Fonts stylesheet for a given FontId. */
const googleFamily: Record<Exclude<FontId, "inter">, string> = {
  "noto-sans": "Noto+Sans:wght@400;500;600;700",
  "plus-jakarta-sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
  "work-sans": "Work+Sans:wght@400;500;600;700",
  "dm-sans": "DM+Sans:wght@400;500;600;700",
  karla: "Karla:wght@400;500;600;700",
  nunito: "Nunito:wght@400;600;700;800",
  figtree: "Figtree:wght@400;500;600;700",
  merriweather: "Merriweather:wght@400;700",
  "playfair-display": "Playfair+Display:wght@400;600;700",
  lora: "Lora:wght@400;500;600;700",
  "cormorant-garamond": "Cormorant+Garamond:wght@400;500;600;700",
  "source-serif-4": "Source+Serif+4:wght@400;600;700",
  "ibm-plex-mono": "IBM+Plex+Mono:wght@400;500;600;700",
  "space-grotesk": "Space+Grotesk:wght@400;500;600;700",
  fraunces: "Fraunces:opsz,wght@9..144,400..700",
};

/**
 * Stylesheet URL for one appearance font, or null for fonts the app already
 * loads (Inter via next/font). Loading one `<link>` per visible font, instead
 * of 16 next/font variables on every page, keeps the public page from paying
 * for fonts nobody sees.
 */
export function fontStylesheetUrl(font: FontId): string | null {
  if (font === "inter") {
    return null;
  }
  return `https://fonts.googleapis.com/css2?family=${googleFamily[font]}&display=swap`;
}

/** One combined stylesheet for every appearance font (editor previews). */
export function allFontsStylesheetUrl(): string {
  const families = Object.values(googleFamily)
    .map((family) => `family=${family}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

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

export function hexWithAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

export function mutedFor(bodyColor: string): string {
  return `color-mix(in oklch, ${bodyColor} 72%, transparent)`;
}

export const appearanceSchema = z.object({
  themeId: z.enum(themeIds),
  headerStyle: z.enum(headerStyleIds),
  bannerPath: z.string().max(512).nullable(),
  buttonContour: z.enum(buttonContourIds),
  buttonVariant: z.enum(buttonVariantIds),
  buttonUmbra: z.enum(buttonUmbraIds),
  buttonColor: hexColor,
  buttonTextColor: hexColor,
  fontId: z.enum(fontIds),
  titleColor: hexColor,
  bodyColor: hexColor,
  wallpaperKind: z.enum(wallpaperKindIds),
  wallpaperColor: hexColor,
  wallpaperColorB: hexColor,
  wallpaperPattern: z.enum(wallpaperPatternIds),
  wallpaperPatternSpacing: z
    .number()
    .int()
    .min(patternSpacingRange.min)
    .max(patternSpacingRange.max),
  wallpaperPatternThickness: z
    .number()
    .int()
    .min(patternThicknessRange.min)
    .max(patternThicknessRange.max),
  linkEntrance: z.enum(linkEntranceIds),
  linkHover: z.enum(linkHoverIds),
  pageAlignment: z.enum(pageAlignmentIds),
  wallpaperImagePath: z.string().max(512).nullable(),
  wallpaperVideoPath: z.string().max(512).nullable(),
});

export type Appearance = z.infer<typeof appearanceSchema>;

export const themePresetValues: Record<PresetThemeId, Appearance> = {
  air: {
    themeId: "air",
    buttonContour: "pill",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#111111",
    buttonTextColor: "#ffffff",
    fontId: "inter",
    titleColor: "#111111",
    bodyColor: "#6e6e6e",
    wallpaperKind: "fill",
    wallpaperColor: "#ffffff",
    wallpaperColorB: "#f5f3ff",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "none",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  charcoal: {
    themeId: "charcoal",
    buttonContour: "pill",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#fafafa",
    buttonTextColor: "#101010",
    fontId: "inter",
    titleColor: "#fafafa",
    bodyColor: "#a8a8a8",
    wallpaperKind: "fill",
    wallpaperColor: "#101010",
    wallpaperColorB: "#262626",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "none",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  cream: {
    themeId: "cream",
    buttonContour: "pill",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#1c1917",
    buttonTextColor: "#faf6ee",
    fontId: "merriweather",
    titleColor: "#1c1917",
    bodyColor: "#78716c",
    wallpaperKind: "fill",
    wallpaperColor: "#faf6ee",
    wallpaperColorB: "#efe6d8",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "none",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  mint: {
    themeId: "mint",
    buttonContour: "pill",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#0d3b2e",
    buttonTextColor: "#eafff5",
    fontId: "nunito",
    titleColor: "#0d3b2e",
    bodyColor: "#4a7a6c",
    wallpaperKind: "fill",
    wallpaperColor: "#d9f2e6",
    wallpaperColorB: "#bfe6d4",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "none",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  sky: {
    themeId: "sky",
    buttonContour: "pill",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#0f172a",
    buttonTextColor: "#ffffff",
    fontId: "inter",
    titleColor: "#0f172a",
    bodyColor: "#5b6b85",
    wallpaperKind: "gradient",
    wallpaperColor: "#e0f2ff",
    wallpaperColorB: "#f5f3ff",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "none",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  sunset: {
    themeId: "sunset",
    buttonContour: "pill",
    buttonVariant: "fill",
    buttonUmbra: "hard",
    buttonColor: "#ffffff",
    buttonTextColor: "#2b1055",
    fontId: "inter",
    titleColor: "#ffffff",
    bodyColor: "#f1e4ff",
    wallpaperKind: "gradient",
    wallpaperColor: "#ff9a7a",
    wallpaperColorB: "#7a5cff",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "none",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  ink: {
    themeId: "ink",
    buttonContour: "sharp",
    buttonVariant: "outline",
    buttonUmbra: "none",
    buttonColor: "#fafafa",
    buttonTextColor: "#fafafa",
    fontId: "ibm-plex-mono",
    titleColor: "#fafafa",
    bodyColor: "#a1a1aa",
    wallpaperKind: "pattern",
    wallpaperColor: "#0a0a0a",
    wallpaperColorB: "#52525b",
    wallpaperPattern: "grid",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: 1,
    linkEntrance: "slide",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  paper: {
    themeId: "paper",
    buttonContour: "soft",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#2b2620",
    buttonTextColor: "#f6f4ef",
    fontId: "playfair-display",
    titleColor: "#2b2620",
    bodyColor: "#77716a",
    wallpaperKind: "fill",
    wallpaperColor: "#f6f4ef",
    wallpaperColorB: "#e8e2d5",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "fade",
    linkHover: "lift",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  candy: {
    themeId: "candy",
    buttonContour: "pill",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#ec4899",
    buttonTextColor: "#ffffff",
    fontId: "figtree",
    titleColor: "#9d174d",
    bodyColor: "#c05c96",
    wallpaperKind: "gradient",
    wallpaperColor: "#ffd1e8",
    wallpaperColorB: "#fff4fa",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "pop",
    linkHover: "scale",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  forest: {
    themeId: "forest",
    buttonContour: "round",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#e9f4ec",
    buttonTextColor: "#14261c",
    fontId: "fraunces",
    titleColor: "#e9f4ec",
    bodyColor: "#a3bda9",
    wallpaperKind: "fill",
    wallpaperColor: "#14261c",
    wallpaperColorB: "#1f3a2b",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "fade",
    linkHover: "lift",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  ocean: {
    themeId: "ocean",
    buttonContour: "pill",
    buttonVariant: "glass",
    buttonUmbra: "soft",
    buttonColor: "#38bdf8",
    buttonTextColor: "#f0f9ff",
    fontId: "space-grotesk",
    titleColor: "#e0f2fe",
    bodyColor: "#93b8d4",
    wallpaperKind: "gradient",
    wallpaperColor: "#0a2540",
    wallpaperColorB: "#104567",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "rise",
    linkHover: "glow",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  lavender: {
    themeId: "lavender",
    buttonContour: "pill",
    buttonVariant: "outline",
    buttonUmbra: "soft",
    buttonColor: "#6d5bd0",
    buttonTextColor: "#ffffff",
    fontId: "dm-sans",
    titleColor: "#40348c",
    bodyColor: "#8078b5",
    wallpaperKind: "fill",
    wallpaperColor: "#ebe7f9",
    wallpaperColorB: "#dcd5f5",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "fade",
    linkHover: "none",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  coral: {
    themeId: "coral",
    buttonContour: "soft",
    buttonVariant: "fill",
    buttonUmbra: "soft",
    buttonColor: "#c2410c",
    buttonTextColor: "#fff7ed",
    fontId: "karla",
    titleColor: "#7c2d12",
    bodyColor: "#b0765b",
    wallpaperKind: "gradient",
    wallpaperColor: "#ffb199",
    wallpaperColorB: "#ffd8c2",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "rise",
    linkHover: "scale",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  midnight: {
    themeId: "midnight",
    buttonContour: "pill",
    buttonVariant: "glass",
    buttonUmbra: "soft",
    buttonColor: "#a5b4fc",
    buttonTextColor: "#eef2ff",
    fontId: "inter",
    titleColor: "#eef2ff",
    bodyColor: "#9aa3bf",
    wallpaperKind: "pattern",
    wallpaperColor: "#0b0b13",
    wallpaperColorB: "#6d5bd0",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "fade",
    linkHover: "glow",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  sand: {
    themeId: "sand",
    buttonContour: "sharp",
    buttonVariant: "fill",
    buttonUmbra: "none",
    buttonColor: "#6b4f36",
    buttonTextColor: "#f3ead9",
    fontId: "work-sans",
    titleColor: "#43352a",
    bodyColor: "#8d7c69",
    wallpaperKind: "fill",
    wallpaperColor: "#e9dcc8",
    wallpaperColorB: "#dccbb0",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "none",
    linkHover: "lift",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
  berry: {
    themeId: "berry",
    buttonContour: "round",
    buttonVariant: "fill",
    buttonUmbra: "hard",
    buttonColor: "#facc15",
    buttonTextColor: "#2e1065",
    fontId: "lora",
    titleColor: "#f5e3ff",
    bodyColor: "#b9a5e4",
    wallpaperKind: "fill",
    wallpaperColor: "#2e1065",
    wallpaperColorB: "#3b187a",
    wallpaperPattern: "dots",
    wallpaperPatternSpacing: patternSpacingDefault,
    wallpaperPatternThickness: patternThicknessDefault,
    linkEntrance: "pop",
    linkHover: "glow",
    pageAlignment: "center",
    headerStyle: "classic",
    bannerPath: null,
    wallpaperImagePath: null,
    wallpaperVideoPath: null,
  },
};

export const presetThemes: Array<{
  id: PresetThemeId;
  label: string;
  swatch: string;
  values: Appearance;
}> = [
  { id: "air", label: "Air", swatch: "#ffffff", values: themePresetValues.air },
  {
    id: "charcoal",
    label: "Charcoal",
    swatch: "#101010",
    values: themePresetValues.charcoal,
  },
  { id: "cream", label: "Cream", swatch: "#faf6ee", values: themePresetValues.cream },
  { id: "mint", label: "Mint", swatch: "#d9f2e6", values: themePresetValues.mint },
  {
    id: "sky",
    label: "Sky",
    swatch: "linear-gradient(180deg, #e0f2ff, #f5f3ff)",
    values: themePresetValues.sky,
  },
  {
    id: "sunset",
    label: "Sunset",
    swatch: "linear-gradient(180deg, #ff9a7a, #7a5cff)",
    values: themePresetValues.sunset,
  },
  { id: "ink", label: "Ink", swatch: "#0a0a0a", values: themePresetValues.ink },
  { id: "paper", label: "Paper", swatch: "#f6f4ef", values: themePresetValues.paper },
  {
    id: "candy",
    label: "Candy",
    swatch: "linear-gradient(180deg, #ffd1e8, #fff4fa)",
    values: themePresetValues.candy,
  },
  { id: "forest", label: "Forest", swatch: "#14261c", values: themePresetValues.forest },
  {
    id: "ocean",
    label: "Ocean",
    swatch: "linear-gradient(180deg, #0a2540, #104567)",
    values: themePresetValues.ocean,
  },
  {
    id: "lavender",
    label: "Lavender",
    swatch: "#ebe7f9",
    values: themePresetValues.lavender,
  },
  {
    id: "coral",
    label: "Coral",
    swatch: "linear-gradient(180deg, #ffb199, #ffd8c2)",
    values: themePresetValues.coral,
  },
  {
    id: "midnight",
    label: "Midnight",
    swatch: "#0b0b13",
    values: themePresetValues.midnight,
  },
  { id: "sand", label: "Sand", swatch: "#e9dcc8", values: themePresetValues.sand },
  { id: "berry", label: "Berry", swatch: "#2e1065", values: themePresetValues.berry },
];

function toContour(value: string | null | undefined): ButtonContour {
  if (value === "sharp" || value === "soft" || value === "round" || value === "pill") {
    return value;
  }
  return "pill";
}

function toVariant(value: string | null | undefined): ButtonVariant {
  if (value === "fill" || value === "outline" || value === "soft" || value === "glass") {
    return value;
  }
  return "fill";
}

function toUmbra(value: string | null | undefined): ButtonUmbra {
  if (value === "none" || value === "soft" || value === "lift" || value === "hard") {
    return value;
  }
  return "soft";
}

function toWallpaperKind(value: string | null | undefined): WallpaperKind {
  if (
    value === "fill" ||
    value === "gradient" ||
    value === "blur" ||
    value === "pattern" ||
    value === "image" ||
    value === "video"
  ) {
    return value;
  }
  return "fill";
}

function toPattern(value: string | null | undefined): WallpaperPattern {
  if (value === "dots" || value === "grid" || value === "lines" || value === "waves") {
    return value;
  }
  return "dots";
}

function toEntrance(value: string | null | undefined): LinkEntrance {
  if (
    value === "none" ||
    value === "fade" ||
    value === "rise" ||
    value === "pop" ||
    value === "slide"
  ) {
    return value;
  }
  return "none";
}

function toHover(value: string | null | undefined): LinkHover {
  if (value === "none" || value === "lift" || value === "scale" || value === "glow") {
    return value;
  }
  return "none";
}

function toAlignment(value: string | null | undefined): PageAlignment {
  if (value === "center" || value === "left") {
    return value;
  }
  return "center";
}

function toHeaderStyle(value: string | null | undefined): HeaderStyleId {
  // SAFETY: headerStyleIds and HeaderStyleId derive from the same const
  // tuple, so an includes() hit means the value is a member; the DB CHECK
  // and appearanceSchema keep the invariant at rest.
  for (const id of headerStyleIds) {
    if (value === id) {
      return value;
    }
  }
  return "classic";
}

function toInt(
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (
    value === null ||
    value === undefined ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    return fallback;
  }
  return value;
}

function toHex(value: string | null | undefined, fallback: string): string {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return fallback;
}

const presetThemeIdSet = new Set<string>(presetThemeIds);

function toThemeId(value: string | null | undefined): ThemeId {
  if (value === "custom" || presetThemeIdSet.has(value ?? "")) {
    // SAFETY: membership in presetThemeIdSet is exactly the PresetThemeId
    // union, and the "custom" literal is checked before the fallthrough.
    return value as ThemeId;
  }
  return "custom";
}

export interface ResolvedAppearance extends Appearance {
  contour: ButtonContour;
  variant: ButtonVariant;
  umbra: ButtonUmbra;
  font: FontId;
  wallpaper: WallpaperKind;
  pattern: WallpaperPattern;
}

export function resolveAppearance(input: {
  themeId?: string | null;
  headerStyle?: string | null;
  bannerPath?: string | null;
  buttonContour?: string | null;
  buttonVariant?: string | null;
  buttonUmbra?: string | null;
  buttonColor?: string | null;
  buttonTextColor?: string | null;
  fontId?: string | null;
  titleColor?: string | null;
  bodyColor?: string | null;
  wallpaperKind?: string | null;
  wallpaperColor?: string | null;
  wallpaperColorB?: string | null;
  wallpaperPattern?: string | null;
  wallpaperPatternSpacing?: number | null;
  wallpaperPatternThickness?: number | null;
  linkEntrance?: string | null;
  linkHover?: string | null;
  pageAlignment?: string | null;
  wallpaperImagePath?: string | null;
  wallpaperVideoPath?: string | null;
}): ResolvedAppearance {
  const base: Appearance = {
    themeId: toThemeId(input.themeId),
    headerStyle: toHeaderStyle(input.headerStyle),
    bannerPath: input.bannerPath ?? null,
    buttonContour: toContour(input.buttonContour),
    buttonVariant: toVariant(input.buttonVariant),
    buttonUmbra: toUmbra(input.buttonUmbra),
    buttonColor: toHex(input.buttonColor, "#111111"),
    buttonTextColor: toHex(input.buttonTextColor, "#ffffff"),
    fontId: toFontId(input.fontId),
    titleColor: toHex(input.titleColor, "#111111"),
    bodyColor: toHex(input.bodyColor, "#6e6e6e"),
    wallpaperKind: toWallpaperKind(input.wallpaperKind),
    wallpaperColor: toHex(input.wallpaperColor, "#ffffff"),
    wallpaperColorB: toHex(input.wallpaperColorB, "#f5f3ff"),
    wallpaperPattern: toPattern(input.wallpaperPattern),
    wallpaperPatternSpacing: toInt(
      input.wallpaperPatternSpacing,
      patternSpacingDefault,
      patternSpacingRange.min,
      patternSpacingRange.max,
    ),
    wallpaperPatternThickness: toInt(
      input.wallpaperPatternThickness,
      patternThicknessDefault,
      patternThicknessRange.min,
      patternThicknessRange.max,
    ),
    linkEntrance: toEntrance(input.linkEntrance),
    linkHover: toHover(input.linkHover),
    pageAlignment: toAlignment(input.pageAlignment),
    wallpaperImagePath: input.wallpaperImagePath ?? null,
    wallpaperVideoPath: input.wallpaperVideoPath ?? null,
  };
  return {
    ...base,
    contour: base.buttonContour,
    variant: base.buttonVariant,
    umbra: base.buttonUmbra,
    font: base.fontId,
    wallpaper: base.wallpaperKind,
    pattern: base.wallpaperPattern,
  };
}
