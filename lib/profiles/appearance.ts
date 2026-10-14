import * as z from "zod";

import { headerStyleIds, type HeaderStyleId } from "@/lib/profiles/schema";
import {
  buttonContourIds,
  buttonUmbraIds,
  buttonVariantIds,
  type ButtonContour,
  type ButtonUmbra,
  type ButtonVariant,
} from "./appearance-buttons";
import { fontIds, toFontId, type FontId } from "./appearance-fonts";
import {
  linkEntranceIds,
  linkHoverIds,
  pageAlignmentIds,
  patternSpacingDefault,
  patternSpacingRange,
  patternThicknessDefault,
  patternThicknessRange,
  wallpaperKindIds,
  wallpaperPatternIds,
  type LinkEntrance,
  type LinkHover,
  type PageAlignment,
  type WallpaperKind,
  type WallpaperPattern,
} from "./appearance-options";

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

export const appearanceSchema = z.object({
  themeId: z.enum(themeIds),
  headerStyle: z.enum(headerStyleIds),
  bannerPath: z.string().max(512).nullable(),
  buttonContour: z.enum(buttonContourIds),
  buttonVariant: z.enum(buttonVariantIds),
  buttonUmbra: z.enum(buttonUmbraIds),
  buttonUmbraColor: hexColor,
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
  showUsername: z.boolean(),
  wallpaperImagePath: z.string().max(512).nullable(),
  wallpaperVideoPath: z.string().max(512).nullable(),
});

export type Appearance = z.infer<typeof appearanceSchema>;

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
  return z
    .enum(headerStyleIds)
    .catch("classic")
    .parse(value ?? null);
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

function toThemeId(value: string | null | undefined): ThemeId {
  return z
    .enum(themeIds)
    .catch("custom")
    .parse(value ?? null);
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
  buttonUmbraColor?: string | null;
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
  showUsername?: boolean | null;
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
    buttonUmbraColor: toHex(input.buttonUmbraColor, "#111111"),
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
    showUsername: input.showUsername ?? false,
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
