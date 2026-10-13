import type { CSSProperties } from "react";

import { hexWithAlpha } from "./appearance-colors";

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

/**
 * The box shadow one umbra paints, tinted by the picked umbra color: hard
 * uses it as its solid offset edge, soft and lift wash their ambient shadows
 * with it. A tint rather than fixed black keeps every umbra readable on dark
 * wallpapers, where a pure black shadow vanishes.
 */
export function buttonUmbraBoxShadow(
  umbra: ButtonUmbra,
  edge: string,
): string | undefined {
  switch (umbra) {
    case "soft":
      return `0 8px 24px ${hexWithAlpha(edge, "1f")}`;
    case "lift":
      return `0 2px 6px ${hexWithAlpha(edge, "1f")}, 0 16px 32px ${hexWithAlpha(edge, "29")}`;
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
  /** The picked shadow color: hard's offset edge, soft/lift's ambient tint. */
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
